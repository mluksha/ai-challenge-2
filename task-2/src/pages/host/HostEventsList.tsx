import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtRelativeDay, eventEnded } from "@/lib/format";
import { Plus } from "lucide-react";

export default function HostEventsList() {
  const { hostId } = useParams<{ hostId: string }>();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("events").select("id,title,starts_at,ends_at,status,visibility")
      .eq("host_id", hostId!).order("starts_at", { ascending: false })
      .then(({ data }) => setEvents(data ?? []));
  }, [hostId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Events</h1>
        <Button asChild size="sm"><Link to={`/host/${hostId}/events/new`}><Plus className="h-4 w-4 mr-1.5" />New event</Link></Button>
      </div>
      {events.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">No events yet.</Card>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <Card key={e.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-muted-foreground flex gap-2 items-center">
                  <span>{fmtRelativeDay(e.starts_at)}</span>
                  {e.status === "draft" && <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                  {e.visibility === "unlisted" && <Badge variant="outline" className="text-[10px]">Unlisted</Badge>}
                  {eventEnded(e.ends_at) && <Badge variant="secondary" className="text-[10px]">Ended</Badge>}
                </div>
                <div className="font-medium">{e.title}</div>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline"><Link to={`/host/${hostId}/events/${e.id}/edit`}>Edit</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to={`/host/${hostId}/events/${e.id}/checkin`}>Check-in</Link></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
