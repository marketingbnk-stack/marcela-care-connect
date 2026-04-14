import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  mestre: "Mestre",
  administrativo: "Administrativo",
  comercial: "Comercial",
};

const ROLE_COLORS: Record<string, string> = {
  mestre: "bg-primary text-primary-foreground",
  administrativo: "bg-accent text-accent-foreground",
  comercial: "bg-secondary text-secondary-foreground",
};

export function AdminUsers() {
  const { isMestre } = useUserRole();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<string>("comercial");

  // Fetch all users with roles (only mestre can see this via RLS)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at");
      if (error) throw error;

      // Get profiles for display names
      const userIds = data.map((u) => u.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      return data.map((ur) => ({
        ...ur,
        display_name: profiles?.find((p) => p.user_id === ur.user_id)?.display_name || "—",
      }));
    },
    enabled: isMestre,
  });

  // Create user via edge function
  const createUserMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário criado! Um link de acesso será enviado por email.");
      setDialogOpen(false);
      setNewEmail("");
      setNewRole("comercial");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { action: "delete", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário removido.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isMestre) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Apenas o usuário Mestre pode gerenciar usuários.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Usuários do Sistema</CardTitle>
          <CardDescription>Gerencie quem pode acessar o CRM</CardDescription>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <UserPlus className="h-4 w-4" /> Novo Usuário
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.display_name}</TableCell>
                  <TableCell>
                    <Badge className={ROLE_COLORS[u.role] || ""}>
                      {ROLE_LABELS[u.role] || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.role !== "mestre" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Remover este usuário?")) {
                            deleteUserMutation.mutate(u.user_id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>O usuário receberá um link de acesso por email.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createUserMutation.mutate({ email: newEmail, role: newRole });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="usuario@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Papel *</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
