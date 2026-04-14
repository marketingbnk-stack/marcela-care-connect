import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logoImg from "@/assets/logo-login.png";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const navigate = useNavigate();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu email");
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      setMagicLinkSent(true);
      toast.success("Link de acesso enviado para seu email!");
    }
    setLoading(false);
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md shadow-xl border-primary/10 text-center">
          <CardHeader className="space-y-4">
            <img src={logoImg} alt="Marcela Cammarota" className="h-10 mx-auto object-contain" />
            <CardTitle className="text-xl font-['Montserrat']">Verifique seu email</CardTitle>
            <CardDescription className="text-base">
              Enviamos um link de acesso para <strong>{email}</strong>. Clique no link para entrar no CRM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setMagicLinkSent(false); setEmail(""); }}
            >
              Tentar outro email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/10 min-h-[500px] flex flex-col justify-center">
        <CardHeader className="text-center space-y-4">
          <img src={logoImg} alt="Marcela Cammarota" className="h-10 mx-auto object-contain" />
          <CardTitle className="text-xl font-['Montserrat']">Acessar o CRM</CardTitle>
          <CardDescription>
            Informe seu email para receber o link de acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar link de acesso"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-center text-muted-foreground">
            Acesso restrito. Apenas usuários autorizados podem entrar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
