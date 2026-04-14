import { LayoutDashboard, Kanban, Users, BarChart3, Settings, CalendarDays, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
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

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const items = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, show: true },
    { title: "Pipeline", url: "/pipeline", icon: Kanban, show: !isComercial },
    { title: "Leads", url: "/leads", icon: Users, show: true },
    { title: "Agenda", url: "/agenda", icon: CalendarDays, show: true },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3, show: !isComercial },
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
                      {!collapsed && <span>{item.title}</span>}
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
