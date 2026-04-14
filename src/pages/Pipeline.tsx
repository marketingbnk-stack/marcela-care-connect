import { CRMLayout } from "@/components/CRMLayout";
import { useLeads } from "@/contexts/LeadsContext";
import { PIPELINE_STAGES, SOURCE_COLORS } from "@/lib/constants";
import type { PipelineStage } from "@/lib/constants";
import type { Lead } from "@/lib/types";
import { openWhatsApp, timeAgo } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, GripVertical } from "lucide-react";
import { useState } from "react";

export default function Pipeline() {
  const { leads, moveLead } = useLeads();
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  const handleDragStart = (leadId: string) => setDraggedLead(leadId);

  const handleDrop = (stage: PipelineStage) => {
    if (draggedLead) {
      moveLead(draggedLead, stage);
      setDraggedLead(null);
    }
  };

  return (
    <CRMLayout title="Pipeline">
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-10rem)]">
        {PIPELINE_STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage.id);
          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-72 flex flex-col"
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
                <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
              </div>
              <div className="flex-1 space-y-2 p-2 rounded-xl bg-secondary/40 min-h-[200px]">
                {stageLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} onDragStart={handleDragStart} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </CRMLayout>
  );
}

function LeadCard({ lead, onDragStart }: { lead: Lead; onDragStart: (id: string) => void }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(lead.id)}
      className="bg-card rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{lead.procedure}</p>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center justify-between mt-3">
        <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[lead.source] || ""}`}>
          {lead.source}
        </Badge>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{timeAgo(lead.created_at)}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={e => { e.stopPropagation(); openWhatsApp(lead.phone, `Olá ${lead.name}!`); }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
