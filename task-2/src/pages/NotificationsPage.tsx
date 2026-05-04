import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); document.title = "Notifications · Gather"; /* eslint-disable-next-line */ }, [user?.id]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    load();
  };
  const clearAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    load();
  };

  return (
    <div className="container-tight py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        {items.length > 0 && <Button variant="ghost" size="sm" onClick={clearAll}>Clear all</Button>}
      </div>
      {items.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">You're all caught up.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Link key={n.id} to={n.link ?? "#"} onClick={() => markRead(n.id)}>
              <Card className={`p-4 hover:bg-secondary transition-colors ${!n.read_at ? "border-primary/40" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{n.title}</div>
                    {n.body && <div className="text-sm text-muted-foreground mt-1">{n.body}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
