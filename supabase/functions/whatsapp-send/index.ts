// Envia mensagem via Mega API e grava no banco
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: cErr } = await authClient.auth.getClaims(token);
  if (cErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { conversation_id, content } = await req.json();
    if (!conversation_id || !content) {
      return new Response(JSON.stringify({ error: "conversation_id e content obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conv, error: convErr } = await supabase
      .from("chat_conversations")
      .select("id, whatsapp_number")
      .eq("id", conversation_id)
      .single();
    if (convErr || !conv?.whatsapp_number) throw new Error("Conversa não encontrada ou sem número WhatsApp");

    const host = Deno.env.get("MEGA_API_HOST");
    const token2 = Deno.env.get("MEGA_API_TOKEN");
    const instanceKey = Deno.env.get("MEGA_API_INSTANCE_KEY");

    let waId: string | null = null;
    let sendStatus = "pending";

    if (host && token2 && instanceKey) {
      // Mega API endpoint padrão: POST {host}/rest/sendMessage/{instance_key}/text
      const url = `${host.replace(/\/$/, "")}/rest/sendMessage/${instanceKey}/text`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token2}`,
        },
        body: JSON.stringify({
          messageData: { to: conv.whatsapp_number, text: content },
        }),
      });
      const out = await resp.json().catch(() => ({}));
      console.log("[whatsapp-send] mega response:", resp.status, JSON.stringify(out).slice(0, 300));
      if (!resp.ok) throw new Error(out?.message || `Mega API erro ${resp.status}`);
      waId = out?.messageId || out?.id || null;
      sendStatus = "sent";
    } else {
      console.log("[whatsapp-send] credenciais Mega API ausentes — gravando como rascunho");
      sendStatus = "draft";
    }

    const { data: msg } = await supabase.from("chat_messages").insert({
      conversation_id,
      role: "assistant",
      direction: "outbound",
      content,
      whatsapp_message_id: waId,
      status: sendStatus,
      sender_name: "Atendente",
    }).select().single();

    await supabase.from("chat_conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.slice(0, 120),
      unread_count: 0,
    }).eq("id", conversation_id);

    return new Response(JSON.stringify({ ok: true, message: msg, status: sendStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("[whatsapp-send] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
