import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSystemPrompt() {
  const now = new Date();
  const spFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    weekday: "long",
  });
  const nowSP = spFormatter.format(now);

  return `Você é o assistente de IA do CRM da Dra. Marcela Cammarota, cirurgiã plástica.
Você tem acesso TOTAL a todas as tabelas e fluxos do CRM. Pode fazer tudo que um humano faria no sistema.

## DATA E HORA ATUAL
Agora são: ${nowSP} (fuso horário de São Paulo, UTC-3).
Use essa referência para "hoje", "amanhã", "próxima semana", etc.
Ao criar agendamentos, sempre use o fuso de São Paulo (UTC-3) para converter datas.

## TABELAS DO CRM
1. **leads** — Pacientes/contatos do CRM
2. **lead_notes** — Notas e observações sobre leads
3. **appointments** — Agendamentos de consultas e cirurgias
4. **fornecedores** — Fornecedores da clínica
5. **procedures** — Lista de procedimentos oferecidos
6. **lead_sources** — Origens de leads cadastradas
7. **doctor_availability** — Horários de disponibilidade da Dra. Marcela
8. **lead_attachments** — Arquivos anexados a leads

## FUNIL DE LEADS (Pipe 1)
novo_lead → contato_feito → consulta_agendada → consulta_realizada

## FUNIL DE VENDAS (Pipe 2)
plano_apresentado → aguardando_decisao → procedimento_fechado → cirurgia_agendada → cirurgia_realizada → pos_procedimento

## ETAPA ESPECIAL
fornecedor — para contatos de fornecedores

## PROCEDIMENTOS PADRÃO
Mamoplastia, Abdominoplastia, Rinoplastia, Lipoaspiração, Blefaroplastia, Lifting Facial, Prótese de Glúteo, Otoplastia, Outro

## ORIGENS DE LEADS
Instagram Ads, Google Ads, Indicação, Site, Orgânico, Evento, Outro

## STATUS DE AGENDAMENTO
pendente, confirmado, cancelado, realizado

## DIAS DA SEMANA (doctor_availability.day_of_week)
0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado

## REGRAS DE NEGÓCIO
- Ao mover lead para "consulta_agendada", deve existir um agendamento com data/hora na tabela appointments.
- Ao mover para "cirurgia_agendada", idem.
- Notas usam o campo "author" para identificar quem escreveu. Use "Assistente IA" quando você criar notas.
- Ao criar agendamento, o campo scheduled_at é timestamp com timezone (ISO 8601).
- Ao atualizar lead, pode alterar: name, phone, email, age, city, source, procedure, stage.
- Sempre confirme ações destrutivas (deletar) antes de executar.

## FORMATAÇÃO DE DATAS
- SEMPRE apresente datas no formato DD/MM/AAAA (ex: 15/04/2026).
- Horários no formato HH:MM (ex: 14:30).
- Quando mostrar data e hora juntos, use: DD/MM/AAAA às HH:MM (ex: 15/04/2026 às 14:30).
- NUNCA mostre datas no formato ISO (2026-04-15T14:00:00Z) ao usuário.

## COMPORTAMENTO
- Sempre responda em português brasileiro.
- Seja conciso, profissional e útil.
- Quando buscar dados, apresente de forma organizada.
- Ao listar leads, inclua nome, procedimento, etapa e telefone.
- Ao listar agendamentos, inclua data/hora (DD/MM/AAAA às HH:MM), paciente, procedimento e status.
- Quando não encontrar resultados, sugira alternativas.
- Use todas as ferramentas disponíveis para resolver o que for pedido.
- Pode encadear múltiplas ferramentas quando necessário (ex: buscar lead → criar agendamento).`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_leads",
      description: "Busca leads por nome, telefone, email, procedimento ou cidade. Pode filtrar por etapa do funil.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca (nome, telefone, procedimento, cidade, email)" },
          stage: { type: "string", description: "Filtrar por etapa do funil (opcional)" },
          limit: { type: "number", description: "Quantidade máxima de resultados (padrão 20)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_leads",
      description: "Lista todos os leads, opcionalmente filtrados por etapa, procedimento ou origem. Útil para relatórios.",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", description: "Filtrar por etapa (opcional)" },
          procedure: { type: "string", description: "Filtrar por procedimento (opcional)" },
          source: { type: "string", description: "Filtrar por origem (opcional)" },
          limit: { type: "number", description: "Máximo de resultados (padrão 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_lead_details",
      description: "Obtém detalhes completos de um lead: dados, notas, agendamentos e anexos",
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
      description: "Cadastra um novo lead/paciente no CRM",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome completo" },
          phone: { type: "string", description: "Telefone com DDD" },
          procedure: { type: "string", description: "Procedimento de interesse" },
          source: { type: "string", description: "Origem (Instagram Ads, Google Ads, Indicação, Site, Orgânico, Evento, Outro)" },
          email: { type: "string", description: "Email (opcional)" },
          city: { type: "string", description: "Cidade (opcional)" },
          age: { type: "number", description: "Idade (opcional)" },
          stage: { type: "string", description: "Etapa inicial (padrão: novo_lead)" },
        },
        required: ["name", "phone", "procedure", "source"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead",
      description: "Atualiza qualquer campo de um lead existente: nome, telefone, email, idade, cidade, procedimento, origem, etapa",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "UUID do lead" },
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          age: { type: "number" },
          city: { type: "string" },
          procedure: { type: "string" },
          source: { type: "string" },
          stage: { type: "string", description: "Nova etapa do funil" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_lead",
      description: "Exclui um lead permanentemente do CRM (incluindo notas e agendamentos associados)",
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
      name: "add_lead_note",
      description: "Adiciona uma nota/observação a um lead",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "UUID do lead" },
          content: { type: "string", description: "Texto da nota" },
        },
        required: ["lead_id", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_appointments",
      description: "Lista agendamentos. Pode filtrar por status, data ou lead.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filtrar por status: pendente, confirmado, cancelado, realizado" },
          lead_id: { type: "string", description: "Filtrar por lead (opcional)" },
          from_date: { type: "string", description: "Data inicial ISO (opcional)" },
          to_date: { type: "string", description: "Data final ISO (opcional)" },
          limit: { type: "number", description: "Máximo (padrão 30)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_appointment",
      description: "Cria um novo agendamento de consulta ou procedimento",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "UUID do lead/paciente" },
          procedure_name: { type: "string", description: "Nome do procedimento" },
          scheduled_at: { type: "string", description: "Data e hora no formato ISO 8601 (ex: 2026-04-20T14:00:00)" },
          status: { type: "string", description: "Status inicial (padrão: pendente)" },
          notes: { type: "string", description: "Observações (opcional)" },
        },
        required: ["lead_id", "procedure_name", "scheduled_at"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_appointment",
      description: "Atualiza um agendamento: status, data/hora, notas, lembretes",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string", description: "UUID do agendamento" },
          status: { type: "string", description: "Novo status" },
          scheduled_at: { type: "string", description: "Nova data/hora ISO" },
          notes: { type: "string", description: "Novas observações" },
          reminder_48h_sent: { type: "boolean" },
          reminder_24h_sent: { type: "boolean" },
        },
        required: ["appointment_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_appointment",
      description: "Exclui um agendamento",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string", description: "UUID do agendamento" },
        },
        required: ["appointment_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_fornecedores",
      description: "Busca fornecedores por nome, empresa, telefone ou email",
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
      name: "list_fornecedores",
      description: "Lista todos os fornecedores cadastrados",
      parameters: { type: "object", properties: {} },
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
          phone: { type: "string" },
          email: { type: "string" },
          company: { type: "string" },
          notes: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_fornecedor",
      description: "Atualiza dados de um fornecedor",
      parameters: {
        type: "object",
        properties: {
          fornecedor_id: { type: "string", description: "UUID do fornecedor" },
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          company: { type: "string" },
          notes: { type: "string" },
        },
        required: ["fornecedor_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_fornecedor",
      description: "Exclui um fornecedor",
      parameters: {
        type: "object",
        properties: {
          fornecedor_id: { type: "string", description: "UUID do fornecedor" },
        },
        required: ["fornecedor_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_summary",
      description: "Retorna resumo completo do pipeline: total de leads por etapa, por procedimento e por origem",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_procedures",
      description: "Lista todos os procedimentos cadastrados no sistema",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_procedure",
      description: "Cadastra um novo procedimento",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do procedimento" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_procedure",
      description: "Exclui um procedimento",
      parameters: {
        type: "object",
        properties: {
          procedure_id: { type: "string", description: "UUID do procedimento" },
        },
        required: ["procedure_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_lead_sources",
      description: "Lista todas as origens de leads cadastradas",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead_source",
      description: "Cadastra uma nova origem de lead",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome da origem" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_doctor_availability",
      description: "Retorna os horários de disponibilidade da Dra. Marcela",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_doctor_availability",
      description: "Cria ou atualiza a disponibilidade da doutora para um dia da semana",
      parameters: {
        type: "object",
        properties: {
          day_of_week: { type: "number", description: "Dia: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb" },
          start_time: { type: "string", description: "Horário início (HH:MM)" },
          end_time: { type: "string", description: "Horário fim (HH:MM)" },
          is_active: { type: "boolean", description: "Se está ativo" },
        },
        required: ["day_of_week", "start_time", "end_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_agenda_today",
      description: "Retorna os agendamentos de hoje com dados do paciente",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function executeTool(name: string, args: Record<string, unknown>, supabase: any) {
  switch (name) {
    case "search_leads": {
      const q = (args.query as string).toLowerCase();
      const limit = (args.limit as number) || 20;
      let query = supabase.from("leads").select("*").limit(limit);
      if (args.stage) query = query.eq("stage", args.stage);
      const { data, error } = await query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,procedure.ilike.%${q}%,email.ilike.%${q}%,city.ilike.%${q}%`);
      if (error) return { error: error.message };
      return { leads: data, count: data?.length || 0 };
    }

    case "list_leads": {
      const limit = (args.limit as number) || 50;
      let query = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);
      if (args.stage) query = query.eq("stage", args.stage);
      if (args.procedure) query = query.ilike("procedure", `%${args.procedure}%`);
      if (args.source) query = query.ilike("source", `%${args.source}%`);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { leads: data, count: data?.length || 0 };
    }

    case "get_lead_details": {
      const { data: lead, error: e1 } = await supabase.from("leads").select("*").eq("id", args.lead_id).maybeSingle();
      if (e1) return { error: e1.message };
      if (!lead) return { error: "Lead não encontrado." };
      const [notesRes, apptsRes, attachRes] = await Promise.all([
        supabase.from("lead_notes").select("*").eq("lead_id", args.lead_id).order("created_at", { ascending: false }),
        supabase.from("appointments").select("*").eq("lead_id", args.lead_id).order("scheduled_at", { ascending: false }),
        supabase.from("lead_attachments").select("id, file_name, category, created_at").eq("lead_id", args.lead_id).order("created_at", { ascending: false }),
      ]);
      return { lead, notes: notesRes.data || [], appointments: apptsRes.data || [], attachments: attachRes.data || [] };
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
        stage: args.stage || "novo_lead",
      }).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, lead: data };
    }

    case "update_lead": {
      const updates: Record<string, unknown> = {};
      for (const key of ["name", "phone", "email", "age", "city", "procedure", "source", "stage"]) {
        if (args[key] !== undefined) updates[key] = args[key];
      }
      const { data, error } = await supabase.from("leads").update(updates).eq("id", args.lead_id).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, lead: data };
    }

    case "delete_lead": {
      // Delete related data first
      await supabase.from("lead_notes").delete().eq("lead_id", args.lead_id);
      await supabase.from("appointments").delete().eq("lead_id", args.lead_id);
      await supabase.from("lead_attachments").delete().eq("lead_id", args.lead_id);
      const { error } = await supabase.from("leads").delete().eq("id", args.lead_id);
      if (error) return { error: error.message };
      return { success: true, message: "Lead e dados associados excluídos." };
    }

    case "add_lead_note": {
      const { data, error } = await supabase.from("lead_notes").insert({
        lead_id: args.lead_id,
        content: args.content,
        author: "Assistente IA",
      }).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, note: data };
    }

    case "list_appointments": {
      const limit = (args.limit as number) || 30;
      let query = supabase.from("appointments").select("*, leads(name, phone, email)").order("scheduled_at", { ascending: true }).limit(limit);
      if (args.status) query = query.eq("status", args.status);
      if (args.lead_id) query = query.eq("lead_id", args.lead_id);
      if (args.from_date) query = query.gte("scheduled_at", args.from_date);
      if (args.to_date) query = query.lte("scheduled_at", args.to_date);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { appointments: data, count: data?.length || 0 };
    }

    case "create_appointment": {
      const { data, error } = await supabase.from("appointments").insert({
        lead_id: args.lead_id,
        procedure_name: args.procedure_name,
        scheduled_at: args.scheduled_at,
        status: args.status || "pendente",
        notes: args.notes || null,
      }).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, appointment: data };
    }

    case "update_appointment": {
      const updates: Record<string, unknown> = {};
      for (const key of ["status", "scheduled_at", "notes", "reminder_48h_sent", "reminder_24h_sent"]) {
        if (args[key] !== undefined) updates[key] = args[key];
      }
      const { data, error } = await supabase.from("appointments").update(updates).eq("id", args.appointment_id).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, appointment: data };
    }

    case "delete_appointment": {
      const { error } = await supabase.from("appointments").delete().eq("id", args.appointment_id);
      if (error) return { error: error.message };
      return { success: true, message: "Agendamento excluído." };
    }

    case "search_fornecedores": {
      const q = (args.query as string).toLowerCase();
      const { data, error } = await supabase.from("fornecedores").select("*").or(`name.ilike.%${q}%,company.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`).limit(20);
      if (error) return { error: error.message };
      return { fornecedores: data, count: data?.length || 0 };
    }

    case "list_fornecedores": {
      const { data, error } = await supabase.from("fornecedores").select("*").order("name");
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

    case "update_fornecedor": {
      const updates: Record<string, unknown> = {};
      for (const key of ["name", "phone", "email", "company", "notes"]) {
        if (args[key] !== undefined) updates[key] = args[key];
      }
      const { data, error } = await supabase.from("fornecedores").update(updates).eq("id", args.fornecedor_id).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, fornecedor: data };
    }

    case "delete_fornecedor": {
      const { error } = await supabase.from("fornecedores").delete().eq("id", args.fornecedor_id);
      if (error) return { error: error.message };
      return { success: true, message: "Fornecedor excluído." };
    }

    case "get_pipeline_summary": {
      const { data: leads, error } = await supabase.from("leads").select("stage, procedure, source");
      if (error) return { error: error.message };
      const byStage: Record<string, number> = {};
      const byProcedure: Record<string, number> = {};
      const bySource: Record<string, number> = {};
      for (const l of leads || []) {
        byStage[l.stage] = (byStage[l.stage] || 0) + 1;
        byProcedure[l.procedure] = (byProcedure[l.procedure] || 0) + 1;
        bySource[l.source] = (bySource[l.source] || 0) + 1;
      }
      const { data: appts } = await supabase.from("appointments").select("status");
      const byApptStatus: Record<string, number> = {};
      for (const a of appts || []) {
        byApptStatus[a.status] = (byApptStatus[a.status] || 0) + 1;
      }
      return { total_leads: leads?.length || 0, by_stage: byStage, by_procedure: byProcedure, by_source: bySource, total_appointments: appts?.length || 0, appointments_by_status: byApptStatus };
    }

    case "list_procedures": {
      const { data, error } = await supabase.from("procedures").select("*").order("name");
      if (error) return { error: error.message };
      return { procedures: data };
    }

    case "create_procedure": {
      const { data, error } = await supabase.from("procedures").insert({ name: args.name }).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, procedure: data };
    }

    case "delete_procedure": {
      const { error } = await supabase.from("procedures").delete().eq("id", args.procedure_id);
      if (error) return { error: error.message };
      return { success: true, message: "Procedimento excluído." };
    }

    case "list_lead_sources": {
      const { data, error } = await supabase.from("lead_sources").select("*").order("name");
      if (error) return { error: error.message };
      return { sources: data };
    }

    case "create_lead_source": {
      const { data, error } = await supabase.from("lead_sources").insert({ name: args.name }).select().maybeSingle();
      if (error) return { error: error.message };
      return { success: true, source: data };
    }

    case "get_doctor_availability": {
      const { data, error } = await supabase.from("doctor_availability").select("*").order("day_of_week");
      if (error) return { error: error.message };
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      return { availability: (data || []).map((d: any) => ({ ...d, day_name: dayNames[d.day_of_week] })) };
    }

    case "update_doctor_availability": {
      // Upsert: check if exists for this day
      const { data: existing } = await supabase.from("doctor_availability").select("id").eq("day_of_week", args.day_of_week).maybeSingle();
      if (existing) {
        const { data, error } = await supabase.from("doctor_availability").update({
          start_time: args.start_time,
          end_time: args.end_time,
          is_active: args.is_active !== undefined ? args.is_active : true,
        }).eq("id", existing.id).select().maybeSingle();
        if (error) return { error: error.message };
        return { success: true, availability: data, action: "updated" };
      } else {
        const { data, error } = await supabase.from("doctor_availability").insert({
          day_of_week: args.day_of_week,
          start_time: args.start_time,
          end_time: args.end_time,
          is_active: args.is_active !== undefined ? args.is_active : true,
        }).select().maybeSingle();
        if (error) return { error: error.message };
        return { success: true, availability: data, action: "created" };
      }
    }

    case "get_agenda_today": {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      const { data, error } = await supabase.from("appointments").select("*, leads(name, phone, email)").gte("scheduled_at", start).lt("scheduled_at", end).order("scheduled_at");
      if (error) return { error: error.message };
      return { date: start.split("T")[0], appointments: data, count: data?.length || 0 };
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

    let maxIterations = 8;
    while (maxIterations-- > 0) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
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
          return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
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

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        return new Response(JSON.stringify({ reply: msg.content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const tc of msg.tool_calls) {
        const fnArgs = typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;

        console.log(`Tool: ${tc.function.name}`, JSON.stringify(fnArgs).slice(0, 200));
        const result = await executeTool(tc.function.name, fnArgs, supabase);
        console.log(`Result: ${tc.function.name}`, JSON.stringify(result).slice(0, 300));

        allMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(JSON.stringify({ reply: "Desculpe, não consegui completar. Tente simplificar o pedido." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crm-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
