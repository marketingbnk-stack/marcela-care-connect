import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o assistente de CRM da Dra. Marcela Cammarota, cirurgiã plástica.
Você ajuda a equipe com:
- Buscar leads/contatos por nome, telefone ou procedimento
- Resumir o status de um lead (etapa do funil, histórico, notas)
- Cadastrar novos leads
- Listar fornecedores
- Cadastrar fornecedores
- Dar insights sobre o pipeline

Funil de Leads (Pipe 1): Novo Lead → Contato Feito → Consulta Agendada → Consulta Realizada
Funil de Vendas (Pipe 2): Plano Apresentado → Aguardando Decisão → Procedimento Fechado → Cirurgia Agendada → Cirurgia Realizada → Pós-Procedimento
Etapa Especial: Fornecedor

Sempre responda em português brasileiro. Seja conciso e útil.
Quando usar ferramentas, analise os resultados e responda de forma amigável.`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_leads",
      description: "Busca leads por nome, telefone, procedimento ou etapa do funil",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca (nome, telefone, procedimento)" },
          stage: { type: "string", description: "Filtrar por etapa do funil (opcional)" },
          limit: { type: "number", description: "Quantidade máxima de resultados (padrão 10)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_lead_details",
      description: "Obtém detalhes completos de um lead específico incluindo notas e agendamentos",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "UUID do lead" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Cadastra um novo lead no CRM",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do lead" },
          phone: { type: "string", description: "Telefone do lead" },
          procedure: { type: "string", description: "Procedimento de interesse" },
          source: { type: "string", description: "Origem do lead (Instagram Ads, Google Ads, Indicação, Site, Orgânico, Evento, Outro)" },
          email: { type: "string", description: "Email (opcional)" },
          city: { type: "string", description: "Cidade (opcional)" },
          age: { type: "number", description: "Idade (opcional)" },
        },
        required: ["name", "phone", "procedure", "source"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_fornecedores",
      description: "Busca fornecedores por nome, empresa ou telefone",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_fornecedor",
      description: "Cadastra um novo fornecedor",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do fornecedor" },
          phone: { type: "string", description: "Telefone (opcional)" },
          email: { type: "string", description: "Email (opcional)" },
          company: { type: "string", description: "Empresa (opcional)" },
          notes: { type: "string", description: "Observações (opcional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_summary",
      description: "Retorna um resumo do pipeline com contagem de leads por etapa",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead_stage",
      description: "Move um lead para outra etapa do funil",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "UUID do lead" },
          new_stage: { type: "string", description: "Nova etapa (novo_lead, contato_feito, consulta_agendada, consulta_realizada, plano_apresentado, aguardando_decisao, procedimento_fechado, cirurgia_agendada, cirurgia_realizada, pos_procedimento, fornecedor)" },
        },
        required: ["lead_id", "new_stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_lead_note",
      description: "Adiciona uma nota/observação a um lead",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "UUID do lead" },
          content: { type: "string", description: "Conteúdo da nota" },
          author: { type: "string", description: "Autor da nota" },
        },
        required: ["lead_id", "content", "author"],
      },
    },
  },
];

async function executeTool(name: string, args: Record<string, unknown>, supabase: any) {
  switch (name) {
    case "search_leads": {
      const q = (args.query as string).toLowerCase();
      const limit = (args.limit as number) || 10;
      let query = supabase.from("leads").select("*").limit(limit);
      if (args.stage) query = query.eq("stage", args.stage);
      const { data, error } = await query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,procedure.ilike.%${q}%`);
      if (error) return { error: error.message };
      return { leads: data, count: data?.length || 0 };
    }
    case "get_lead_details": {
      const { data: lead, error: e1 } = await supabase.from("leads").select("*").eq("id", args.lead_id).maybeSingle();
      if (e1) return { error: e1.message };
      if (!lead) return { error: "Lead não encontrado com esse ID." };
      const { data: notes } = await supabase.from("lead_notes").select("*").eq("lead_id", args.lead_id).order("created_at", { ascending: false });
      const { data: appointments } = await supabase.from("appointments").select("*").eq("lead_id", args.lead_id).order("scheduled_at", { ascending: false });
      return { lead, notes: notes || [], appointments: appointments || [] };
    }
    case "create_lead": {
      const { data, error } = await supabase.from("leads").insert({
        name: args.name,
        phone: args.phone,
        procedure: args.procedure,
        source: args.source,
        email: args.email || null,
        city: args.city || null,
        age: args.age || null,
      }).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, lead: data };
    }
    case "search_fornecedores": {
      const q = (args.query as string).toLowerCase();
      const { data, error } = await supabase.from("fornecedores").select("*").or(`name.ilike.%${q}%,company.ilike.%${q}%,phone.ilike.%${q}%`).limit(10);
      if (error) return { error: error.message };
      return { fornecedores: data, count: data?.length || 0 };
    }
    case "create_fornecedor": {
      const { data, error } = await supabase.from("fornecedores").insert({
        name: args.name,
        phone: args.phone || null,
        email: args.email || null,
        company: args.company || null,
        notes: args.notes || null,
      }).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, fornecedor: data };
    }
    case "get_pipeline_summary": {
      const { data, error } = await supabase.from("leads").select("stage");
      if (error) return { error: error.message };
      const summary: Record<string, number> = {};
      for (const l of data || []) {
        summary[l.stage] = (summary[l.stage] || 0) + 1;
      }
      return { total: data?.length || 0, by_stage: summary };
    }
    case "update_lead_stage": {
      const { data, error } = await supabase.from("leads").update({ stage: args.new_stage }).eq("id", args.lead_id).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, lead: data };
    }
    case "add_lead_note": {
      const { data, error } = await supabase.from("lead_notes").insert({
        lead_id: args.lead_id,
        content: args.content,
        author: args.author,
      }).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, note: data };
    }
    default:
      return { error: `Ferramenta desconhecida: ${name}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const allMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Loop for tool calling
    let maxIterations = 5;
    while (maxIterations-- > 0) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: allMessages,
          tools,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em breve." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione fundos no workspace." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI error:", status, t);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) throw new Error("No response from AI");

      const msg = choice.message;
      allMessages.push(msg);

      // If no tool calls, return the final response
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        return new Response(JSON.stringify({ reply: msg.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Execute tool calls
      for (const tc of msg.tool_calls) {
        const args = typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;

        console.log(`Tool call: ${tc.function.name}`, args);
        const result = await executeTool(tc.function.name, args, supabase);
        console.log(`Tool result:`, JSON.stringify(result).slice(0, 500));

        allMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(JSON.stringify({ reply: "Desculpe, não consegui processar sua solicitação. Tente novamente." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crm-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
