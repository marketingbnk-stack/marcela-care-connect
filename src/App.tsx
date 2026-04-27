import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeadsProvider } from "@/contexts/LeadsContext";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Relatorios from "./pages/Relatorios";
import Admin from "./pages/Admin";
import Agenda from "./pages/Agenda";
import Inbox from "./pages/Inbox";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading, isComercial } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User exists but has no role assigned yet
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Acesso Pendente</h2>
          <p className="text-muted-foreground">Sua conta ainda não tem permissão de acesso. Solicite ao administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <LeadsProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pipeline" element={isComercial ? <Navigate to="/" replace /> : <Pipeline />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={isComercial ? <Navigate to="/leads" replace /> : <LeadDetail />} />
        <Route path="/relatorios" element={isComercial ? <Navigate to="/" replace /> : <Relatorios />} />
        <Route path="/admin" element={isComercial ? <Navigate to="/" replace /> : <Admin />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </LeadsProvider>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
