// Webhook público que recebe eventos DIRETO da Mega API (sem n8n)
// Cria/atualiza lead + conversa + mensagem
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(input: string): string {
  return (input || "").replace(/@.*$/, "").replace(/\D/g, "");
}

function cleanText(s: string | null | undefined): string {
  if (!s) return "";
  // remove "=" inicial (resíduo de expressão não-avaliada do n8n) e trim
  return String(s).replace(/^=+/, "").trim();
}

function pick<T = unknown>(obj: any, ...keys: string[]): T | null {
  for (const k of keys) {
    const parts = k.split(".");
    let v = obj;
    for (const p of parts) v = v?.[p];
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const rawText = await req.text();
    const contentType = req.headers.get("content-type") || "";
    console.log("[mega-webhook] content-type:", contentType);
    console.log("[mega-webhook] raw:", rawText.slice(0, 1500));

    let body: any = {};
    if (rawText) {
      try { body = JSON.parse(rawText); }
      catch { body = { raw: rawText }; }
    }

    // Mega API normalmente envia { instance_key, jid, messageType, key:{...}, message:{...}, pushName, ... }
    // ou aninhado em data:{...}. Aceitamos ambos.
    const data = body?.data && typeof body.data === "object" ? body.data : body;

    // Telefone
    const phoneRaw =
      pick<string>(data, "key.remoteJid", "remoteJid", "jid", "from", "phone", "number") ||
      pick<string>(body, "phone", "from", "number") || "";
    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      console.log("[mega-webhook] sem phone — ignorando evento");
      return json({ ok: true, skipped: "no phone" });
    }

    // Ignora grupos (jid contém "@g.us")
    if (String(phoneRaw).includes("@g.us")) {
      return json({ ok: true, skipped: "group message" });
    }

    // Nome
    const name = cleanText(
      pick<string>(data, "pushName", "notifyName", "name", "contact_name") ||
      pick<string>(body, "pushName", "name", "contact_name")
    );

    // ID da mensagem (deduplicação)
    const messageId = pick<string>(data, "key.id", "id", "message_id") ||
      pick<string>(body, "id", "message_id");

    // Direção
    const fromMe = data?.key?.fromMe === true || body?.fromMe === true || body?.direction === "outbound";

    // Mídia
    const m = data?.message || {};
    let mediaType: string | null = null;
    let mediaUrl: string | null = null;
    if (m.imageMessage) { mediaType = "image"; mediaUrl = m.imageMessage.url || null; }
    else if (m.videoMessage) { mediaType = "video"; mediaUrl = m.videoMessage.url || null; }
    else if (m.audioMessage) { mediaType = "audio"; mediaUrl = m.audioMessage.url || null; }
    else if (m.documentMessage) { mediaType = "document"; mediaUrl = m.documentMessage.url || null; }

    // Conteúdo de texto
    const content = cleanText(
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.documentMessage?.caption ||
      pick<string>(body, "message", "text", "content", "body") ||
      (mediaType === "image" ? "[imagem]" : "") ||
      (mediaType === "video" ? "[vídeo]" : "") ||
      (mediaType === "audio" ? "[áudio]" : "") ||
      (mediaType === "document" ? "[documento]" : "")
    );

    if (!content && !mediaUrl) {
      console.log("[mega-webhook] sem conteúdo — ignorando");
      return json({ ok: true, skipped: "empty content" });
    }

    // Se a mensagem foi enviada PELO próprio CRM (já gravada via whatsapp-send),
    // dedupe pelo messageId. Mas mesmo se for fromMe de outro device, registramos como outbound.
    if (messageId) {
      const { data: dup } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("whatsapp_message_id", messageId)
        .maybeSingle();
      if (dup) {
        console.log("[mega-webhook] mensagem duplicada:", messageId);
        return json({ ok: true, skipped: "duplicate" });
      }
    }

    // 1) Achar/criar lead pelo telefone
    const last10 = phone.slice(-10);
    let leadId: string | null = null;
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .ilike("phone", `%${last10}%`)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const { data: newLead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          name: name || `WhatsApp ${last10.slice(-4)}`,
          phone,
          source: "WhatsApp",
          procedure: "A definir",
          stage: "novo_lead",
        })
        .select("id")
        .single();
      if (leadErr) console.error("[mega-webhook] lead insert err:", leadErr);
      leadId = newLead?.id || null;
    }

    // 2) Achar/criar conversa
    let convId: string | null = null;
    const { data: existingConv } = await supabase
      .from("chat_conversations")
      .select("id, unread_count")
      .eq("whatsapp_number", phone)
      .eq("channel", "whatsapp")
      .maybeSingle();

    const previewText = (content || `[${mediaType || "mídia"}]`).slice(0, 120);

    if (existingConv) {
      convId = existingConv.id;
      await supabase.from("chat_conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: previewText,
        unread_count: fromMe ? existingConv.unread_count : (existingConv.unread_count || 0) + 1,
        contact_name: name || undefined,
        lead_id: leadId,
        status: "active",
      }).eq("id", convId);
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({
          channel: "whatsapp",
          whatsapp_number: phone,
          contact_name: name || null,
          lead_id: leadId,
          status: "active",
          last_message_at: new Date().toISOString(),
          last_message_preview: previewText,
          unread_count: fromMe ? 0 : 1,
        })
        .select("id")
        .single();
      if (convErr) console.error("[mega-webhook] conv insert err:", convErr);
      convId = newConv?.id || null;
    }

    // 3) Inserir mensagem
    if (convId) {
      const { error: msgErr } = await supabase.from("chat_messages").insert({
        conversation_id: convId,
        role: fromMe ? "assistant" : "user",
        direction: fromMe ? "outbound" : "inbound",
        content: content || `[${mediaType || "mídia"}]`,
        whatsapp_message_id: messageId,
        media_url: mediaUrl,
        media_type: mediaType,
        sender_name: name || null,
        status: "delivered",
      });
      if (msgErr) console.error("[mega-webhook] msg insert err:", msgErr);
    }

    // 4) Atualiza last_interaction do lead
    if (leadId) {
      await supabase.from("leads").update({ last_interaction: new Date().toISOString() }).eq("id", leadId);
    }

    return json({ ok: true, lead_id: leadId, conversation_id: convId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("[mega-webhook] error:", msg);
    return json({ ok: false, error: msg }, 500);
  }
});
