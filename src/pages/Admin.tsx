import { CRMLayout } from "@/components/CRMLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLeads } from "@/components/admin/AdminLeads";
import { AdminSources } from "@/components/admin/AdminSources";
import { AdminProcedures } from "@/components/admin/AdminProcedures";
import { AdminNotes } from "@/components/admin/AdminNotes";

export default function Admin() {
  return (
    <CRMLayout title="Painel Administrativo">
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="bg-card border">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="sources">Origens</TabsTrigger>
          <TabsTrigger value="procedures">Procedimentos</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>
        <TabsContent value="leads"><AdminLeads /></TabsContent>
        <TabsContent value="sources"><AdminSources /></TabsContent>
        <TabsContent value="procedures"><AdminProcedures /></TabsContent>
        <TabsContent value="notes"><AdminNotes /></TabsContent>
      </Tabs>
    </CRMLayout>
  );
}
