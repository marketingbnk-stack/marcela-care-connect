// Webhook público que recebe eventos DIRETO da Mega API
// Cria/atualiza lead + conversa + mensagem. Baixa mídia recebida para o storage.
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

function normalizeHost(host?: string | null) {
  if (!host) return null;
  const trimmed = host.trim().replace(/\/$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Baixa mídia da Mega API (precisa do messageId) → faz upload no storage → retorna URL pública
async function downloadAndStoreMedia(
  supabase: any,
  messageId: string,
  mediaType: string,
  mimetype: string | null,
): Promise<string | null> {
  try {
    const host = normalizeHost(Deno.env.get("MEGA_API_HOST"));
    const apiToken = Deno.env.get("MEGA_API_TOKEN");
    const instanceKey = Deno.env.get("MEGA_API_INSTANCE_KEY");
    if (!host || !apiToken || !instanceKey) return null;

    // Endpoint Mega para baixar mídia em base64
    const url = `${host}/rest/instance/downloadMediaMessage/${instanceKey}`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ messageData: { id: messageId } }),
    });
    if (!r.ok) {
      console.error("[mega-webhook] download falhou:", r.status, await r.text().catch(() => ""));
      return null;
    }
    const out = await r.json().catch(() => ({}));
    const base64 = out?.fileBase64 || out?.base64 || out?.data || out?.media || null;
    if (!base64) {
      console.error("[mega-webhook] download sem base64:", JSON.stringify(out).slice(0, 300));
      return null;
    }

    // Detecta extensão pelo mime
    const ext =
      mimetype?.includes("jpeg") || mimetype?.includes("jpg") ? "jpg" :
      mimetype?.includes("png") ? "png" :
      mimetype?.includes("webp") ? "webp" :
      mimetype?.includes("mp4") ? "mp4" :
      mimetype?.includes("ogg") || mimetype?.includes("opus") ? "ogg" :
      mimetype?.includes("mpeg") || mimetype?.includes("mp3") ? "mp3" :
      mimetype?.includes("pdf") ? "pdf" :
      mediaType === "image" ? "jpg" :
      mediaType === "video" ? "mp4" :
      mediaType === "audio" ? "ogg" :
      "bin";

    // Decodifica base64 → bytes
    const cleanB64 = String(base64).replace(/^data:[^;]+;base64,/, "");
    const bytes = Uint8Array.from(atob(cleanB64), c => c.charCodeAt(0));

    const fileName = `${mediaType}/${messageId}.${ext}`;
    const { error } = await supabase.storage
      .from("whatsapp-media")
      .upload(fileName, bytes, {
        contentType: mimetype || "application/octet-stream",
        upsert: true,
      });
    if (error) {
      console.error("[mega-webhook] storage upload err:", error);
      return null;
    }

    const { data: pub } = supabase.storage.from("whatsapp-media").getPublicUrl(fileName);
    return pub?.publicUrl || null;
  } catch (e) {
    console.error("[mega-webhook] downloadAndStoreMedia error:", e);
    return null;
  }
}

// Busca a foto de perfil do contato na Mega API, baixa e salva no storage
async function fetchAndStoreContactAvatar(
  supabase: any,
  phone: string,
): Promise<string | null> {
  try {
    const host = normalizeHost(Deno.env.get("MEGA_API_HOST"));
    const apiToken = Deno.env.get("MEGA_API_TOKEN");
    const instanceKey = Deno.env.get("MEGA_API_INSTANCE_KEY");
    if (!host || !apiToken || !instanceKey) return null;

    const jid = `${phone}@s.whatsapp.net`;

    const candidates: Array<{ url: string; method: string; body: any }> = [
      { url: `${host}/rest/instance/${instanceKey}/profilePicture?jid=${encodeURIComponent(jid)}`, method: "GET", body: null },
      { url: `${host}/rest/instance/profilePicture/${instanceKey}`, method: "POST", body: { jid } },
      { url: `${host}/rest/chat/getProfilePicture/${instanceKey}`, method: "POST", body: { jid } },
      { url: `${host}/rest/chat/profilePicture/${instanceKey}`, method: "POST", body: { number: phone } },
    ];

    let picUrl: string | null = null;
    for (const c of candidates) {
      try {
        const r = await fetch(c.url, {
          method: c.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: c.body ? JSON.stringify(c.body) : undefined,
        });
        if (!r.ok) continue;
        const out = await r.json().catch(() => ({}));
        picUrl =
          out?.profilePictureUrl ||
          out?.url ||
          out?.eurl ||
          out?.data?.url ||
          out?.data?.profilePictureUrl ||
          out?.result?.profilePictureUrl ||
          null;
        if (picUrl) break;
      } catch {
        // tenta próximo
      }
    }

    if (!picUrl) {
      console.log("[mega-webhook] sem foto de perfil para", phone);
      return null;
    }

    const imgRes = await fetch(picUrl);
    if (!imgRes.ok) return null;
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    const fileName = `avatars/${phone}.jpg`;

    const { error } = await supabase.storage
      .from("whatsapp-media")
      .upload(fileName, buf, { contentType: "image/jpeg", upsert: true });
    if (error) {
      console.error("[mega-webhook] avatar upload err:", error);
      return null;
    }
    const { data: pub } = supabase.storage.from("whatsapp-media").getPublicUrl(fileName);
    return pub?.publicUrl ? `${pub.publicUrl}?v=${Date.now()}` : null;
  } catch (e) {
    console.error("[mega-webhook] fetchAndStoreContactAvatar error:", e);
    return null;
  }
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

    const data = body?.data && typeof body.data === "object" ? body.data : body;

    // Telefone
    const phoneRaw =
      pick<string>(data, "key.remoteJid", "remoteJid", "jid", "from", "phone", "number") ||
      pick<string>(body, "phone", "from", "number") || "";
    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      console.log("[mega-webhook] sem phone — ignorando");
      return json({ ok: true, skipped: "no phone" });
    }
    if (String(phoneRaw).includes("@g.us")) {
      return json({ ok: true, skipped: "group message" });
    }

    const name = cleanText(
      pick<string>(data, "pushName", "notifyName", "name", "contact_name") ||
      pick<string>(body, "pushName", "name", "contact_name")
    );

    const messageId = pick<string>(data, "key.id", "id", "message_id") ||
      pick<string>(body, "id", "message_id");

    const fromMe = data?.key?.fromMe === true || body?.fromMe === true || body?.direction === "outbound";

    // Detecta mídia no payload da Mega (formato Baileys)
    const m = data?.message || {};
    let mediaType: string | null = null;
    let mediaMime: string | null = null;
    let mediaCaption = "";
    let mediaFileName: string | null = null;

    if (m.imageMessage) {
      mediaType = "image";
      mediaMime = m.imageMessage.mimetype || "image/jpeg";
      mediaCaption = m.imageMessage.caption || "";
    } else if (m.videoMessage) {
      mediaType = "video";
      mediaMime = m.videoMessage.mimetype || "video/mp4";
      mediaCaption = m.videoMessage.caption || "";
    } else if (m.audioMessage) {
      mediaType = "audio";
      mediaMime = m.audioMessage.mimetype || "audio/ogg";
    } else if (m.documentMessage) {
      mediaType = "document";
      mediaMime = m.documentMessage.mimetype || "application/octet-stream";
      mediaCaption = m.documentMessage.caption || "";
      mediaFileName = m.documentMessage.fileName || null;
    } else if (m.stickerMessage) {
      mediaType = "image";
      mediaMime = m.stickerMessage.mimetype || "image/webp";
    }

    // Texto
    const content = cleanText(
      m.conversation ||
      m.extendedTextMessage?.text ||
      mediaCaption ||
      pick<string>(body, "message", "text", "content", "body") ||
      ""
    );

    if (!content && !mediaType) {
      console.log("[mega-webhook] sem conteúdo — ignorando");
      return json({ ok: true, skipped: "empty content" });
    }

    // Dedupe por messageId
    if (messageId) {
      const { data: dup } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("whatsapp_message_id", messageId)
        .maybeSingle();
      if (dup) {
        console.log("[mega-webhook] duplicada:", messageId);
        return json({ ok: true, skipped: "duplicate" });
      }
    }

    // Extrai UTMs do texto da mensagem (formato wa.me com query string codificada)
    // Aceita: "Vim do Instagram - utm_source=ig&utm_campaign=botox" ou só "utm_source=ig&utm_campaign=botox"
    const utm: Record<string, string> = {};
    if (content) {
      const utmRegex = /utm_(source|medium|campaign|term|content)=([^\s&|,;]+)/gi;
      let m: RegExpExecArray | null;
      while ((m = utmRegex.exec(content)) !== null) {
        utm[`utm_${m[1].toLowerCase()}`] = decodeURIComponent(m[2]);
      }
    }
    const hasUtm = Object.keys(utm).length > 0;

    // 1) Lead
    const last10 = phone.slice(-10);
    let leadId: string | null = null;
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, utm_source")
      .ilike("phone", `%${last10}%`)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
      // Se chegou nova UTM e o lead ainda não tinha, aplica
      if (hasUtm && !existingLead.utm_source) {
        await supabase.from("leads").update(utm).eq("id", leadId);
      }
    } else {
      const sourceLabel = hasUtm
        ? `${utm.utm_source || "WhatsApp"}${utm.utm_campaign ? ` / ${utm.utm_campaign}` : ""}`
        : "WhatsApp";
      const { data: newLead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          name: name || `WhatsApp ${last10.slice(-4)}`,
          phone,
          source: sourceLabel,
          procedure: "A definir",
          stage: "novo_lead",
          ...utm,
        })
        .select("id")
        .single();
      if (leadErr) console.error("[mega-webhook] lead err:", leadErr);
      leadId = newLead?.id || null;
    }

    // 2) Conversa
    let convId: string | null = null;
    const { data: existingConv } = await supabase
      .from("chat_conversations")
      .select("id, unread_count, avatar_url")
      .eq("whatsapp_number", phone)
      .eq("channel", "whatsapp")
      .maybeSingle();

    const previewText = (content || `[${mediaType || "mídia"}]`).slice(0, 120);

    if (existingConv) {
      convId = existingConv.id;
      const update: Record<string, unknown> = {
        last_message_at: new Date().toISOString(),
        last_message_preview: previewText,
        unread_count: fromMe ? existingConv.unread_count : (existingConv.unread_count || 0) + 1,
        contact_name: name || undefined,
        lead_id: leadId,
        status: "active",
      };
      // Busca avatar se ainda não tem
      if (!existingConv.avatar_url) {
        const avatar = await fetchAndStoreContactAvatar(supabase, phone);
        if (avatar) update.avatar_url = avatar;
      }
      await supabase.from("chat_conversations").update(update).eq("id", convId);
    } else {
      const avatar = await fetchAndStoreContactAvatar(supabase, phone);
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
          avatar_url: avatar,
        })
        .select("id")
        .single();
      if (convErr) console.error("[mega-webhook] conv err:", convErr);
      convId = newConv?.id || null;
    }

    // 3) Baixa mídia (se houver) e armazena
    let storedMediaUrl: string | null = null;
    if (mediaType && messageId) {
      storedMediaUrl = await downloadAndStoreMedia(supabase, messageId, mediaType, mediaMime);
      console.log("[mega-webhook] media stored:", storedMediaUrl);
    }

    // 4) Insere mensagem
    if (convId) {
      const { error: msgErr } = await supabase.from("chat_messages").insert({
        conversation_id: convId,
        role: fromMe ? "assistant" : "user",
        direction: fromMe ? "outbound" : "inbound",
        content: content || `[${mediaType || "mídia"}${mediaFileName ? `: ${mediaFileName}` : ""}]`,
        whatsapp_message_id: messageId,
        media_url: storedMediaUrl,
        media_type: mediaType,
        sender_name: name || null,
        status: "delivered",
        metadata: mediaFileName ? { file_name: mediaFileName, mime: mediaMime } : {},
      });
      if (msgErr) console.error("[mega-webhook] msg err:", msgErr);
    }

    if (leadId) {
      await supabase.from("leads").update({ last_interaction: new Date().toISOString() }).eq("id", leadId);
    }

    return json({ ok: true, lead_id: leadId, conversation_id: convId, media_url: storedMediaUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("[mega-webhook] error:", msg);
    return json({ ok: false, error: msg }, 500);
  }
});
