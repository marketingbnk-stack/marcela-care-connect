import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "mestre" | "administrativo" | "comercial" | null;

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching role:", error);
        setRole(null);
      } else {
        setRole(data?.role as AppRole ?? null);
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const isMestre = role === "mestre";
  const isAdmin = role === "administrativo" || role === "mestre";
  const isComercial = role === "comercial";

  return { role, loading, isMestre, isAdmin, isComercial };
}
