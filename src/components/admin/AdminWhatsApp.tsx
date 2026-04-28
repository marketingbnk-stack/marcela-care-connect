import { useEffect, useState } from "react";
import { useWhatsAppInstance } from "@/hooks/useWhatsAppInstance";
import { useLabels } from "@/hooks/useLabels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Smartphone, RefreshCw, QrCode, Power, Plus, Trash2, MessageCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function AdminWhatsApp() {
  const { loading, getStatus, getQrCode, disconnect } = useWhatsAppInstance();
  const { labels, create, remove } = useLabels();
  const [statusData, setStatusData] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#FF6D6A");
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    const projectRef = "qfwlyvkumdplegppeqwx";
    setWebhookUrl(`https://${projectRef}.supabase.co/functions/v1/mega-webhook`);
  }, []);

  const refresh = async () => {
    try {
      const data = await getStatus();
      setStatusData(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      toast.error("Falha ao consultar status: " + msg);
    }
  };

  useEffect(() => {
    refresh();
    // auto-refresh a cada 30s
    const i = setInterval(refresh, 30000);
    return () => clearInterval(i);
  }, []);

  const handleQr = async () => {
    try {
      const data = await getQrCode();
      if (data?.qrcode) {
        setQr(data.qrcode.startsWith("data:") ? data.qrcode : `data:image/png;base64,${data.qrcode}`);
        toast.success("QR Code gerado — escaneie no WhatsApp");
      } else {
        toast.warning(data?.configured === false ? "Configure os secrets da Mega API primeiro." : "QR Code indisponível.");
      }
    } catch (e) {
      toast.error("Erro ao gerar QR");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Desconectar a instância?")) return;
    await disconnect();
    setQr(null);
    refresh();
    toast.success("Desconectado");
  };

  const isConnected = (() => {
    const s = statusData?.status || "";
    return s === "connected" || s === "open" || s === "authenticated";
  })();

  const statusBadge = () => {
    if (!statusData?.configured) return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Não configurado</Badge>;
    const s = statusData.status || "unknown";
    if (isConnected) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Conectado</Badge>;
    if (s === "qr_pending" || s === "connecting") return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Aguardando QR</Badge>;
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Desconectado ({s})</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-5 w-5 text-accent" /> Conexão WhatsApp (Mega API)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Indicador grande de status */}
          <div className={`p-4 rounded-lg border-2 flex items-center gap-3 ${
            isConnected
              ? "bg-green-50 border-green-200"
              : statusData?.configured
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
          }`}>
            <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {isConnected ? "WhatsApp conectado e pronto" : statusData?.configured ? "WhatsApp desconectado — escaneie o QR Code" : "Mega API não configurada"}
              </p>
              {statusData?.phone && <p className="text-xs text-muted-foreground">📱 {statusData.phone}</p>}
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Status detalhado:</span>
            {statusBadge()}
          </div>

            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Credenciais da Mega API ainda não configuradas.</p>
                <p>Adicione 3 secrets no backend: <code className="bg-amber-100 px-1 rounded">MEGA_API_HOST</code>, <code className="bg-amber-100 px-1 rounded">MEGA_API_TOKEN</code> e <code className="bg-amber-100 px-1 rounded">MEGA_API_INSTANCE_KEY</code>. A interface já está pronta — basta plugar.</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleQr} disabled={loading} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <QrCode className="h-4 w-4" /> Gerar QR Code
            </Button>
            <Button variant="outline" onClick={handleDisconnect} disabled={loading} className="gap-2">
              <Power className="h-4 w-4" /> Desconectar
            </Button>
          </div>

          {qr && (
            <div className="flex flex-col items-center p-4 border rounded-lg bg-secondary/30">
              <img src={qr} alt="QR Code" className="w-64 h-64 object-contain" />
              <p className="text-xs text-muted-foreground mt-2">Escaneie com o WhatsApp da clínica → Aparelhos conectados</p>
            </div>
          )}

          <Separator />

          <div>
            <label className="text-xs font-semibold text-muted-foreground">URL do Webhook (configure na Mega API)</label>
            <div className="mt-1.5 p-2 rounded-md bg-secondary border text-xs font-mono break-all flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
              {webhookUrl}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Cole essa URL no painel da Mega API como webhook de mensagens.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5 text-accent" /> Etiquetas de Conversas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da etiqueta..."
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="flex-1"
            />
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="h-10 w-14 rounded border cursor-pointer"
            />
            <Button
              onClick={async () => {
                if (!newLabel.trim()) return;
                await create(newLabel.trim(), newColor);
                setNewLabel("");
                toast.success("Etiqueta criada");
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Criar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {labels.map(l => (
              <div key={l.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border" style={{ background: `${l.color}15`, borderColor: `${l.color}40` }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                <span className="text-xs font-medium" style={{ color: l.color }}>{l.name}</span>
                <button onClick={() => remove(l.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
