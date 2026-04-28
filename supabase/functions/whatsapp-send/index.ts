// Envia mensagem (texto/imagem/vídeo/áudio/documento) via Mega API e grava no banco
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeHost(host?: string | null) {
  if (!host) return null;
  const trimmed = host.trim().replace(/\/$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Extrai o id da mensagem da resposta da Mega API (variações conhecidas)
function extractMsgId(out: any): string | null {
  return (
    out?.data?.key?.id ||
    out?.message?.key?.id ||
    out?.key?.id ||
    out?.messageId ||
    out?.id ||
    null
  );
}

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
    const body = await req.json();
    const {
      conversation_id,
      content,        // texto (opcional se enviar mídia)
      media_url,      // URL pública da mídia (do bucket whatsapp-media)
      media_type,     // 'image' | 'video' | 'audio' | 'document'
      media_name,     // nome do arquivo (para documentos)
      caption,        // legenda opcional para imagem/vídeo
    } = body || {};

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!content && !media_url) {
      return new Response(JSON.stringify({ error: "envie content ou media_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conv, error: convErr } = await supabase
      .from("chat_conversations")
      .select("id, whatsapp_number")
      .eq("id", conversation_id)
      .single();
    if (convErr || !conv?.whatsapp_number) throw new Error("Conversa não encontrada ou sem número WhatsApp");

    const host = normalizeHost(Deno.env.get("MEGA_API_HOST"));
    const apiToken = Deno.env.get("MEGA_API_TOKEN");
    const instanceKey = Deno.env.get("MEGA_API_INSTANCE_KEY");

    let waId: string | null = null;
    let sendStatus = "pending";

    if (host && apiToken && instanceKey) {
      // Endpoint depende do tipo
      let url: string;
      let payload: any;

      if (media_url && media_type) {
        // Mapeia tipo → endpoint Mega
        const endpoint =
          media_type === "image" ? "sendMediaMessageUrl" :
          media_type === "video" ? "sendMediaMessageUrl" :
          media_type === "audio" ? "sendMediaMessageUrl" :
          "sendMediaMessageUrl"; // document
        url = `${host}/rest/sendMessage/${instanceKey}/${endpoint}`;
        payload = {
          messageData: {
            to: conv.whatsapp_number,
            type: media_type, // image | video | audio | document
            url: media_url,
            caption: caption || (media_type === "image" || media_type === "video" ? content : undefined),
            fileName: media_name,
            mimeType:
              media_type === "image" ? "image/jpeg" :
              media_type === "video" ? "video/mp4" :
              media_type === "audio" ? "audio/ogg; codecs=opus" :
              "application/pdf",
          },
        };
      } else {
        // texto puro
        url = `${host}/rest/sendMessage/${instanceKey}/text`;
        payload = { messageData: { to: conv.whatsapp_number, text: content } };
      }

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(payload),
      });
      const out = await resp.json().catch(() => ({}));
      console.log("[whatsapp-send]", url, resp.status, JSON.stringify(out).slice(0, 400));
      if (!resp.ok) {
        const rawMsg = out?.message || out?.error || `Mega API erro ${resp.status}`;
        if (String(rawMsg).toLowerCase().includes("not logged in") || resp.status === 403) {
          throw new Error("WhatsApp desconectado. Peça ao admin para reconectar a instância (escanear QR Code).");
        }
        throw new Error(rawMsg);
      }
      waId = extractMsgId(out);
      sendStatus = "sent";
    } else {
      console.log("[whatsapp-send] credenciais Mega API ausentes — gravando como rascunho");
      sendStatus = "draft";
    }

    // Conteúdo a salvar no banco (texto OU placeholder de mídia)
    const dbContent = content || (
      media_type === "image" ? "[imagem]" :
      media_type === "video" ? "[vídeo]" :
      media_type === "audio" ? "[áudio]" :
      media_type === "document" ? `[documento${media_name ? `: ${media_name}` : ""}]` :
      ""
    );

    const { data: msg } = await supabase.from("chat_messages").insert({
      conversation_id,
      role: "assistant",
      direction: "outbound",
      content: dbContent,
      media_url: media_url || null,
      media_type: media_type || null,
      whatsapp_message_id: waId,
      status: sendStatus,
      sender_name: "Atendente",
    }).select().single();

    await supabase.from("chat_conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: dbContent.slice(0, 120),
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
