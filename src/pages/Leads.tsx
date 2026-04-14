import { CRMLayout } from "@/components/CRMLayout";
import { useLeads } from "@/contexts/LeadsContext";
import { PIPELINE_STAGES, LEAD_SOURCES, SOURCE_COLORS } from "@/lib/constants";
import { formatPhone, formatDate, openWhatsApp } from "@/lib/whatsapp";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Search, Eye, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

type SortField = "name" | "procedure" | "created_at" | "source" | "stage";
type SortDir = "asc" | "desc";

export default function Leads() {
  const { leads, moveLead } = useLeads();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    let result = leads.filter(l => {
      const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search);
      const matchSource = sourceFilter === "all" || l.source === sourceFilter;
      const matchStage = stageFilter === "all" || l.stage === stageFilter;
      return matchSearch && matchSource && matchStage;
    });
    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortField === "name") cmp = a.name.localeCompare(b.name, "pt-BR");
        else if (sortField === "procedure") cmp = a.procedure.localeCompare(b.procedure, "pt-BR");
        else if (sortField === "source") cmp = a.source.localeCompare(b.source, "pt-BR");
        else if (sortField === "stage") {
          const stageOrder = PIPELINE_STAGES.map(s => s.id);
          cmp = stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
        }
        else if (sortField === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return result;
  }, [leads, search, sourceFilter, stageFilter, sortField, sortDir]);

  return (
    <CRMLayout title="Leads">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <span className="flex items-center">Nome <SortIcon field="name" /></span>
                </TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("source")}>
                  <span className="flex items-center">Origem <SortIcon field="source" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("stage")}>
                  <span className="flex items-center">Etapa <SortIcon field="stage" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("procedure")}>
                  <span className="flex items-center">Procedimento <SortIcon field="procedure" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                  <span className="flex items-center">Data <SortIcon field="created_at" /></span>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(lead => {
                const stage = PIPELINE_STAGES.find(s => s.id === lead.stage);
                return (
                  <TableRow key={lead.id} className="hover:bg-secondary/30 cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground">{formatPhone(lead.phone)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[lead.source] || ""}`}>
                        {lead.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{stage?.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{lead.procedure}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(lead.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={e => { e.stopPropagation(); openWhatsApp(lead.phone, `Olá ${lead.name}!`); }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8"
                          onClick={e => { e.stopPropagation(); navigate(`/leads/${lead.id}`); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhum lead encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </CRMLayout>
  );
}
