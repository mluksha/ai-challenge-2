import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function InviteRedeem() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { setRedirect(`/auth?next=${encodeURIComponent(`/invite/${token}`)}`); return; }
    (async () => {
      const { data, error } = await supabase.rpc("redeem_host_invite", { _token: token! });
      if (error) { toast.error(error.message); setRedirect("/"); return; }
      toast.success("You're in!");
      setRedirect(`/host/${data}/dashboard`);
    })();
  }, [user, loading, token]);

  if (redirect) return <Navigate to={redirect} replace />;
  return <div className="container-tight py-16 text-sm text-muted-foreground">Redeeming invite…</div>;
}
