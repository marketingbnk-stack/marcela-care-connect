import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { findOrCreateWhatsAppConversation } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

interface StartWhatsAppButtonProps {
  lead: Pick<Lead, "id" | "name" | "phone">;
  label?: string;
  size?: "sm" | "default" | "icon";
  className?: string;
  iconOnly?: boolean;
  onStarted?: () => void;
}

export function StartWhatsAppButton({
  lead,
  label = "Iniciar conversa",
  size = "default",
  className,
  iconOnly = false,
  onStarted,
}: StartWhatsAppButtonProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setLoading(true);
    try {
      const conversationId = await findOrCreateWhatsAppConversation(lead);
      onStarted?.();
      navigate(`/inbox?conversation=${conversationId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir a conversa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size={size}
      type="button"
      className={cn(
        "bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 gap-2",
        iconOnly && "px-0",
        className
      )}
      onClick={handleClick}
      disabled={loading}
      title={label}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      {!iconOnly && <span>{label}</span>}
    </Button>
  );
}