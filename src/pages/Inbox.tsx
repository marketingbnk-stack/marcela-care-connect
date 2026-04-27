import { useState, useEffect } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { useConversations } from "@/hooks/useConversations";
import { ConversationsList } from "@/components/inbox/ConversationsList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { ContactPanel } from "@/components/inbox/ContactPanel";
import { MessageCircle } from "lucide-react";

export default function Inbox() {
  const { conversations, loading } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  const selected = conversations.find(c => c.id === selectedId) || null;

  return (
    <CRMLayout title="Inbox WhatsApp">
      <div className="-m-6 h-[calc(100vh-4rem)] grid grid-cols-[320px_1fr_320px] bg-background overflow-hidden">
        <ConversationsList conversations={conversations} selectedId={selectedId} onSelect={setSelectedId} />
        {selected ? (
          <ChatPanel conversation={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center bg-secondary/20 text-muted-foreground">
            <MessageCircle className="h-14 w-14 mb-3 opacity-30" />
            <p className="text-sm">{loading ? "Carregando conversas..." : "Selecione uma conversa para começar"}</p>
          </div>
        )}
        {selected ? (
          <ContactPanel conversation={selected} />
        ) : (
          <div className="bg-card border-l" />
        )}
      </div>
    </CRMLayout>
  );
}
