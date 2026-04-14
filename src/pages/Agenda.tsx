import { CRMLayout } from "@/components/CRMLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { AgendaList } from "@/components/agenda/AgendaList";
import { NewAppointmentDialog } from "@/components/agenda/NewAppointmentDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function Agenda() {
  const [newOpen, setNewOpen] = useState(false);

  return (
    <CRMLayout title="Agenda">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Tabs defaultValue="calendar" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-card border">
                <TabsTrigger value="calendar">Calendário</TabsTrigger>
                <TabsTrigger value="list">Lista</TabsTrigger>
              </TabsList>
              <Button onClick={() => setNewOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                <Plus className="h-4 w-4" /> Novo Agendamento
              </Button>
            </div>
            <TabsContent value="calendar"><AgendaCalendar /></TabsContent>
            <TabsContent value="list"><AgendaList /></TabsContent>
          </Tabs>
        </div>
      </div>
      <NewAppointmentDialog open={newOpen} onOpenChange={setNewOpen} />
    </CRMLayout>
  );
}
