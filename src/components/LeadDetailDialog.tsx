import { useLeads } from "@/contexts/LeadsContext";
import { PIPELINE_STAGES, PIPE1_STAGES, PIPE2_STAGES, SPECIAL_STAGES, SOURCE_COLORS } from "@/lib/constants";
import type { PipelineStage } from "@/lib/constants";
import type { Lead } from "@/lib/types";
import { formatPhone, formatDateTime, openWhatsApp } from "@/lib/whatsapp";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Phone, Mail, MapPin, User, Clock, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailDialog({ lead, open, onOpenChange }: LeadDetailDialogProps) {
  const { moveLead, addNote, getLeadNotes } = useLeads();
  const [noteContent, setNoteContent] = useState("");

  if (!lead) return null;

  const notes = getLeadNotes(lead.id);
  const currentStage = PIPELINE_STAGES.find(s => s.id === lead.stage);

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addNote(lead.id, noteContent.trim(), "Equipe");
    setNoteContent("");
    toast.success("Nota adicionada!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-lg">{lead.name}</span>
            <Badge variant="outline" className={SOURCE_COLORS[lead.source] || ""}>
              {lead.source}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{formatPhone(lead.phone)}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span>{lead.email}</span>
              </div>
            )}
            {lead.city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{lead.city}</span>
              </div>
            )}
            {lead.age && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span>{lead.age} anos</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{formatDateTime(lead.created_at)}</span>
            </div>
            {lead.last_interaction && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Última interação: {formatDateTime(lead.last_interaction)}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Procedimento & Etapa */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Procedimento</label>
              <Badge className="bg-accent/10 text-accent border-accent/20">{lead.procedure}</Badge>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Etapa do Pipeline</label>
              <Select
                value={lead.stage}
                onValueChange={val => {
                  moveLead(lead.id, val as PipelineStage);
                  toast.success(`${lead.name} movido para ${PIPELINE_STAGES.find(s => s.id === val)?.label}`);
                }}
              >
                <SelectTrigger className={`h-8 text-xs font-medium ${currentStage?.color || ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">Funil de Leads</div>
                  {PIPE1_STAGES.map(s => <SelectItem key={s.id} value={s.id}><span className={`text-xs font-medium ${s.color}`}>{s.label}</span></SelectItem>)}
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground mt-1">Funil de Vendas</div>
                  {PIPE2_STAGES.map(s => <SelectItem key={s.id} value={s.id}><span className={`text-xs font-medium ${s.color}`}>{s.label}</span></SelectItem>)}
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground mt-1">Outros</div>
                  {SPECIAL_STAGES.map(s => <SelectItem key={s.id} value={s.id}><span className={`text-xs font-medium ${s.color}`}>{s.label}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* WhatsApp */}
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-primary-foreground gap-2"
            onClick={() => openWhatsApp(lead.phone, `Olá ${lead.name}, tudo bem? Aqui é da clínica Dra. Marcela Cammarota!`)}
          >
            <MessageCircle className="h-4 w-4" /> Enviar WhatsApp
          </Button>

          <Separator />

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Notas</label>
            <div className="flex gap-2 mb-3">
              <Textarea
                placeholder="Adicionar uma nota..."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
            <Button size="sm" onClick={handleAddNote} className="bg-accent hover:bg-accent/90 text-accent-foreground mb-3">
              Adicionar Nota
            </Button>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {notes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhuma nota ainda.</p>
              )}
              {notes.map(note => (
                <div key={note.id} className="p-2.5 rounded-lg bg-secondary/50 border-l-2 border-accent">
                  <p className="text-xs text-foreground">{note.content}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="font-medium">{note.author}</span>
                    <span>•</span>
                    <span>{formatDateTime(note.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
