import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    // Bootstrap: if no roles exist yet, allow creating the first mestre without auth
    const { count: roleCount } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true });

    const isBootstrap = (roleCount === 0 || roleCount === null) && body.role === "mestre" && body.action === "bootstrap";

    if (!isBootstrap) {
      // Verify the caller is mestre
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !caller) {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if caller is mestre
      const { data: callerRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .maybeSingle();

      if (!callerRole || callerRole.role !== "mestre") {
        return new Response(JSON.stringify({ error: "Apenas o usuário Mestre pode gerenciar usuários" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // DELETE action
    if (body.action === "delete" && body.user_id) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(body.user_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE action
    const { email, role } = body;
    if (!email || !role) {
      return new Response(JSON.stringify({ error: "Email e papel são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRoles = isBootstrap ? ["mestre", "administrativo", "comercial"] : ["administrativo", "comercial"];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Papel inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with a random password (they'll use magic link)
    const userPassword = body.password || (crypto.randomUUID() + "Aa1!");
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: { display_name: body.display_name || email },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role });

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send magic link
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
