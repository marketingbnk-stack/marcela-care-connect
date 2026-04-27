import { useEffect, useRef, useState } from "react";
import { Conversation, useMessages, sendMessage } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Phone, MessageCircle, Check, CheckCheck, Clock, ArrowLeft, PanelRightClose, PanelRightOpen } from "lucide-react";
import { formatDateTime } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  conversation: Conversation;
  onBack?: () => void;
  onToggleContact?: () => void;
  contactOpen?: boolean;
}

export function ChatPanel({ conversation, onBack, onToggleContact, contactOpen }: Props) {
  const { messages, loading, markAsRead } = useMessages(conversation.id);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversation.unread_count > 0) markAsRead();
  }, [conversation.id, conversation.unread_count, markAsRead]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await sendMessage(conversation.id, text.trim());
      setText("");
      if (res?.status === "draft") {
        toast.warning("Mensagem salva como rascunho — Mega API ainda não configurada.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao enviar";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const initials = (conversation.contact_name || conversation.whatsapp_number || "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a]">
      {/* Header */}
      <div className="h-16 border-b bg-card px-4 md:px-5 flex items-center gap-3 shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 -ml-1" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="h-10 w-10 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {conversation.contact_name || "Contato sem nome"}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3 w-3" />
            {conversation.whatsapp_number || "—"}
          </p>
        </div>
        {onToggleContact && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden xl:inline-flex h-9 w-9"
            onClick={onToggleContact}
            title={contactOpen ? "Esconder painel" : "Mostrar painel"}
          >
            {contactOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
          </Button>
        )}
      </div>

      {/* Mensagens — fundo estilo WhatsApp com padrão sutil */}
      <ScrollArea
        className="flex-1 px-5 py-4"
        ref={scrollRef as any}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><circle cx='20' cy='20' r='1' fill='%23000' opacity='0.04'/></svg>\")",
        }}
      >
        {loading && <p className="text-center text-xs text-muted-foreground py-4">Carregando...</p>}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
            <MessageCircle className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        )}
        <div className="space-y-2">
          {messages.map(m => {
            const isOut = m.direction === "outbound";
            return (
              <div key={m.id} className={cn("flex", isOut ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] md:max-w-[75%] lg:max-w-[65%] rounded-lg px-3 py-1.5 text-sm shadow-sm",
                    isOut
                      ? "bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-white rounded-tr-sm"
                      : "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-white rounded-tl-sm"
                  )}
                >
                  {m.media_type && m.media_type !== "text" && (
                    <p className="text-[10px] uppercase opacity-70 mb-1">[{m.media_type}]</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <div className={cn(
                    "flex items-center gap-1 justify-end mt-0.5 text-[10px]",
                    isOut ? "text-[#667781] dark:text-white/60" : "text-[#667781] dark:text-white/50"
                  )}>
                    <span>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    {isOut && (
                      m.status === "read" ? <CheckCheck className="h-3 w-3 text-[#53bdeb]" /> :
                      m.status === "delivered" ? <CheckCheck className="h-3 w-3" /> :
                      m.status === "sent" ? <Check className="h-3 w-3" /> :
                      <Clock className="h-3 w-3" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-3 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Digite uma mensagem..."
            className="min-h-[44px] max-h-32 resize-none text-sm"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            size="icon"
            className="h-11 w-11 bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
