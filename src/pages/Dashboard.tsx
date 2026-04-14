import { CRMLayout } from "@/components/CRMLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeads } from "@/contexts/LeadsContext";
import { PIPELINE_STAGES, SOURCE_COLORS } from "@/lib/constants";
import { timeAgo, formatPhone, openWhatsApp } from "@/lib/whatsapp";
import { Users, UserPlus, Calendar, TrendingUp, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const CHART_COLORS = ["#FF6D6A", "#00205B", "#334D7C", "#7F8FAC", "#E6E9EF", "#FFB5B4", "#FF8A88"];

export default function Dashboard() {
  const { leads } = useLeads();
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const totalLeads = leads.length;
  const newLeadsWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length;
  const consultasAgendadas = leads.filter(l => l.stage === "consulta_agendada").length;
  const realizados = leads.filter(l => l.stage === "realizado").length;
  const conversionRate = totalLeads > 0 ? Math.round((realizados / totalLeads) * 100) : 0;

  const sourceData = Object.entries(
    leads.reduce((acc, l) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const recentLeads = [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const kpis = [
    { label: "Total de Leads", value: totalLeads, icon: Users, color: "text-primary" },
    { label: "Novos (7 dias)", value: newLeadsWeek, icon: UserPlus, color: "text-accent" },
    { label: "Consultas Agendadas", value: consultasAgendadas, icon: Calendar, color: "text-amber-600" },
    { label: "Taxa de Conversão", value: `${conversionRate}%`, icon: TrendingUp, color: "text-green-600" },
  ];

  return (
    <CRMLayout title="Dashboard">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(kpi => (
            <Card key={kpi.label} className="border-none shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-secondary ${kpi.color}`}>
                  <kpi.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Leads por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sourceData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Leads Recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentLeads.map(lead => {
                const stage = PIPELINE_STAGES.find(s => s.id === lead.stage);
                return (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[lead.source] || ""}`}>
                          {lead.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{timeAgo(lead.created_at)}</span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0"
                      onClick={() => openWhatsApp(lead.phone, `Olá ${lead.name}, tudo bem? Aqui é da clínica Dra. Marcela Cammarota!`)}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Summary */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Resumo do Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {PIPELINE_STAGES.map(stage => {
                const count = leads.filter(l => l.stage === stage.id).length;
                return (
                  <div key={stage.id} className="text-center p-4 rounded-xl bg-secondary/50">
                    <p className="text-2xl font-bold text-foreground">{count}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stage.label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  );
}
