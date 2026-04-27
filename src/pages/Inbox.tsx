import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { useConversations } from "@/hooks/useConversations";
import { ConversationsList } from "@/components/inbox/ConversationsList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { ContactPanel } from "@/components/inbox/ContactPanel";
import { Button } from "@/components/ui/button";
import { MessageCircle, PanelRightClose, PanelRightOpen, ArrowLeft } from "lucide-react";

export default function Inbox() {
  const { conversations, loading } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(true);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  const selected = conversations.find(c => c.id === selectedId) || null;

  // Layout responsivo:
  // - Mobile (<md): mostra UMA coluna por vez (lista OU chat)
  // - md a xl: lista 360px + chat (sem painel de contato — abre como overlay)
  // - xl+: lista 360px + chat + contato 360px (toggle)
  const cols = contactOpen
    ? "grid-cols-1 md:grid-cols-[360px_1fr] xl:grid-cols-[360px_1fr_360px]"
    : "grid-cols-1 md:grid-cols-[360px_1fr]";

  return (
    <CRMLayout title="Inbox WhatsApp">
      <div className={`-m-6 h-[calc(100vh-4rem)] grid ${cols} bg-background overflow-hidden`}>
        {/* Lista — esconde no mobile quando uma conversa está aberta */}
        <div className={selected ? "hidden md:block" : "block"}>
          <ConversationsList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Chat */}
        <div className={selected ? "block" : "hidden md:block"}>
          {selected ? (
            <ChatPanel
              conversation={selected}
              onBack={() => setSelectedId(null)}
              onToggleContact={() => setContactOpen(o => !o)}
              contactOpen={contactOpen}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-secondary/20 text-muted-foreground">
              <MessageCircle className="h-14 w-14 mb-3 opacity-30" />
              <p className="text-sm">{loading ? "Carregando conversas..." : "Selecione uma conversa para começar"}</p>
            </div>
          )}
        </div>

        {/* Painel de contato — só em xl, e quando contactOpen */}
        {selected && contactOpen && (
          <div className="hidden xl:block">
            <ContactPanel conversation={selected} />
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
