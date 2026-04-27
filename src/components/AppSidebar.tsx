import { LayoutDashboard, Kanban, Users, BarChart3, Settings, CalendarDays, LogOut, MessageCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo-branco.png";
import logoIcon from "@/assets/logo-icon-white.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { isComercial, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("unread_count")
        .eq("channel", "whatsapp")
        .eq("is_archived", false);
      const total = (data || []).reduce((s: number, c: any) => s + (c.unread_count || 0), 0);
      setUnread(total);
    };
    load();
    const ch = supabase
      .channel("sidebar-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const items = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, show: true, badge: 0 },
    { title: "Inbox", url: "/inbox", icon: MessageCircle, show: true, badge: unread },
    { title: "Pipeline", url: "/pipeline", icon: Kanban, show: !isComercial, badge: 0 },
    { title: "Leads", url: "/leads", icon: Users, show: true, badge: 0 },
    { title: "Agenda", url: "/agenda", icon: CalendarDays, show: true, badge: 0 },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3, show: !isComercial, badge: 0 },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex items-center justify-center py-6 px-2 overflow-hidden">
        <img
          src={collapsed ? logoIcon : logoImg}
          alt="Marcela Cammarota"
          className={collapsed ? "h-8 w-8 object-contain" : "h-12 w-auto object-contain"}
        />
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.filter(i => i.show).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-4 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors rounded-lg"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                      {item.badge > 0 && (
                        <span className={collapsed
                          ? "absolute top-1 right-1 h-2 w-2 rounded-full bg-accent"
                          : "ml-auto bg-accent text-accent-foreground text-[10px] font-semibold rounded-full px-1.5 min-w-[20px] text-center"}>
                          {!collapsed && (item.badge > 99 ? "99+" : item.badge)}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto border-t border-sidebar-border">
        <SidebarMenu className="p-2">
          {!isComercial && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="h-11">
                <NavLink
                  to="/admin"
                  className="flex items-center gap-3 px-4 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors rounded-lg"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>Admin</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton className="h-11 cursor-pointer" onClick={handleLogout}>
              <div className="flex items-center gap-3 px-4 text-sidebar-foreground/70 hover:text-destructive transition-colors">
                <LogOut className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Sair</span>}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}
