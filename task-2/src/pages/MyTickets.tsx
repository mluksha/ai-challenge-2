import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtRelativeDay, eventEnded } from "@/lib/format";
import { Ticket, CalendarDays } from "lucide-react";

export default function MyTickets() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "My tickets · Gather"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("rsvps")
        .select("id,status,ticket_code,checked_in_at,events(id,title,starts_at,ends_at,venue_address,online_link,cover_url)")
        .eq("user_id", user.id).neq("status", "cancelled")
        .order("created_at", { ascending: false });
      setItems((data ?? []).filter((r: any) => r.events && !eventEnded(r.events.ends_at)));
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <div className="container-tight py-16 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="container-wide py-8">
      <h1 className="text-2xl font-semibold tracking-tight">My tickets</h1>
      <p className="text-sm text-muted-foreground mt-1">Upcoming events you're attending or on the waitlist for.</p>

      {items.length === 0 ? (
        <Card className="p-12 text-center mt-8">
          <Ticket className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="font-medium">No upcoming tickets</div>
          <div className="text-sm text-muted-foreground mt-1">Find your next event in <Link to="/explore" className="text-primary hover:underline">Explore</Link>.</div>
        </Card>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((r) => (
            <Link key={r.id} to={`/tickets/${r.id}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-secondary">
                  {r.events.cover_url ? <img src={r.events.cover_url} alt="" className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground"><CalendarDays className="h-6 w-6" /></div>}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{fmtRelativeDay(r.events.starts_at)}</span>
                    <Badge variant={r.status === "confirmed" ? "default" : "secondary"} className="text-[10px]">
                      {r.status === "confirmed" ? "Going" : "Waitlist"}
                    </Badge>
                    {r.checked_in_at && <Badge variant="outline" className="text-[10px]">Checked in</Badge>}
                  </div>
                  <div className="font-medium mt-1">{r.events.title}</div>
                  <div className="text-xs text-muted-foreground mt-2 truncate">{r.events.venue_address || (r.events.online_link ? "Online" : "Location TBA")}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
