import { ReactNode, useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Calendar, Users, Shield, Settings } from "lucide-react";

export default function HostLayout() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user, loading } = useAuth();
  const [role, setRole] = useState<"host" | "checker" | null | undefined>(undefined);
  const [host, setHost] = useState<any>(null);

  useEffect(() => {
    if (!user || !hostId) return;
    (async () => {
      const [{ data: h }, { data: m }] = await Promise.all([
        supabase.from("hosts").select("*").eq("id", hostId).maybeSingle(),
        supabase.from("host_members").select("role").eq("user_id", user.id).eq("host_id", hostId),
      ]);
      setHost(h);
      const roles = (m ?? []).map((r: any) => r.role);
      setRole(roles.includes("host") ? "host" : roles.includes("checker") ? "checker" : null);
    })();
  }, [user?.id, hostId]);

  if (loading || role === undefined) return <div className="container-tight py-16 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to={`/auth?next=/host/${hostId}/dashboard`} replace />;
  if (role === null) return <div className="container-tight py-16"><h1 className="text-xl font-semibold">No access</h1></div>;

  return (
    <div className="container-wide py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-secondary overflow-hidden flex items-center justify-center">
          {host?.logo_url ? <img src={host.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-sm">{host?.name?.[0]}</span>}
        </div>
        <div>
          <div className="font-semibold tracking-tight">{host?.name}</div>
          <div className="text-xs text-muted-foreground">Your role: {role}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-6">
        <nav className="flex lg:flex-col gap-1 text-sm overflow-x-auto">
          {role === "host" && <NavTab to={`/host/${hostId}/dashboard`} icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavTab>}
          {role === "host" && <NavTab to={`/host/${hostId}/events`} icon={<Calendar className="h-4 w-4" />}>Events</NavTab>}
          {role === "host" && <NavTab to={`/host/${hostId}/members`} icon={<Users className="h-4 w-4" />}>Members</NavTab>}
          {role === "host" && <NavTab to={`/host/${hostId}/moderation`} icon={<Shield className="h-4 w-4" />}>Moderation</NavTab>}
          {role === "host" && <NavTab to={`/host/${hostId}/settings`} icon={<Settings className="h-4 w-4" />}>Settings</NavTab>}
        </nav>
        <div><Outlet context={{ role, host }} /></div>
      </div>
    </div>
  );
}

function NavTab({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <NavLink to={to} end className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap ${isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`
    }>{icon}{children}</NavLink>
  );
}
