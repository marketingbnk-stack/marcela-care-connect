import { CRMLayout } from "@/components/CRMLayout";
import { useLeads } from "@/contexts/LeadsContext";
import { PIPE1_STAGES, PIPE2_STAGES, SPECIAL_STAGES, PIPELINE_STAGES, SOURCE_COLORS } from "@/lib/constants";
import type { PipelineStage } from "@/lib/constants";
import type { Lead } from "@/lib/types";
import { openWhatsApp, timeAgo } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadDetailDialog } from "@/components/LeadDetailDialog";
import { MessageCircle, GripVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Pipeline() {
  const { leads, moveLead } = useLeads();
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleDragStart = (leadId: string) => setDraggedLead(leadId);
  const handleDrop = (stage: PipelineStage) => {
    if (draggedLead) { moveLead(draggedLead, stage); setDraggedLead(null); }
  };

  const renderColumns = (stages: readonly { id: string; label: string; color: string }[], isSpecial = false) => (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-14rem)]">
      {stages.map(stage => {
        const stageLeads = leads.filter(l => l.stage === stage.id);
        const isFornecedor = stage.id === "fornecedor";
        return (
          <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col"
            onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(stage.id as PipelineStage)}>
            <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg ${isFornecedor ? "bg-orange-100 border border-orange-300" : ""}`}>
              <h3 className={`text-sm font-semibold ${isFornecedor ? "text-orange-700" : "text-foreground"}`}>{stage.label}</h3>
              <Badge variant="secondary" className={`text-xs ${isFornecedor ? "bg-orange-200 text-orange-800" : ""}`}>{stageLeads.length}</Badge>
            </div>
            <div className={`flex-1 space-y-2 p-2 rounded-xl min-h-[200px] ${isFornecedor ? "bg-orange-50 border border-orange-200" : "bg-secondary/40"}`}>
              {stageLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} onDragStart={handleDragStart} onSelect={setSelectedLead} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <CRMLayout title="Pipeline">
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="bg-card border">
          <TabsTrigger value="todos">📋 Todos</TabsTrigger>
          <TabsTrigger value="leads">🎯 Funil de Leads</TabsTrigger>
          <TabsTrigger value="vendas">💼 Funil de Vendas</TabsTrigger>
          <TabsTrigger value="fornecedor">📦 Fornecedores</TabsTrigger>
        </TabsList>
        <TabsContent value="todos">{renderColumns(PIPELINE_STAGES)}</TabsContent>
        <TabsContent value="leads">{renderColumns(PIPE1_STAGES)}</TabsContent>
        <TabsContent value="vendas">{renderColumns(PIPE2_STAGES)}</TabsContent>
        <TabsContent value="fornecedor">{renderColumns(SPECIAL_STAGES, true)}</TabsContent>
      </Tabs>
      <LeadDetailDialog lead={selectedLead} open={!!selectedLead} onOpenChange={open => { if (!open) setSelectedLead(null); }} />
    </CRMLayout>
  );
}

function LeadCard({ lead, onDragStart, onSelect }: { lead: Lead; onDragStart: (id: string) => void; onSelect: (lead: Lead) => void }) {
  const { moveLead } = useLeads();
  const currentStage = PIPELINE_STAGES.find(s => s.id === lead.stage);

  return (
    <div draggable onDragStart={() => onDragStart(lead.id)} onClick={() => onSelect(lead)}
      className="bg-card rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{lead.procedure}</p>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
      </div>
      <div className="mt-2">
        <Select value={lead.stage} onValueChange={(val) => {
          moveLead(lead.id, val as PipelineStage);
          toast.success(`${lead.name} movido para ${PIPELINE_STAGES.find(s => s.id === val)?.label}`);
        }}>
          <SelectTrigger className={`h-6 text-[10px] font-medium w-full ${currentStage?.color || ""}`}
            onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
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
      <div className="flex items-center justify-between mt-3">
        <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[lead.source] || ""}`}>{lead.source}</Badge>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{timeAgo(lead.created_at)}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={e => { e.stopPropagation(); openWhatsApp(lead.phone, `Olá ${lead.name}!`); }}>
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
