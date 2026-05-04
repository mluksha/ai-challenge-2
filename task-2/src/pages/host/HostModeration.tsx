import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function HostModeration() {
  const { hostId } = useParams<{ hostId: string }>();
  const [pendingPhotos, setPendingPhotos] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const load = async () => {
    const { data: events } = await supabase.from("events").select("id,title").eq("host_id", hostId!);
    const ids = (events ?? []).map((e) => e.id);
    if (ids.length > 0) {
      const { data: photos } = await supabase
        .from("event_photos").select("id,storage_path,status,event_id,uploader_id,profiles:uploader_id(display_name)")
        .in("event_id", ids).eq("status", "pending").order("created_at", { ascending: false });
      setPendingPhotos((photos ?? []).map((p: any) => ({
        ...p, event_title: events!.find((e) => e.id === p.event_id)?.title,
      })));
    }
    const { data: r } = await supabase.from("reports")
      .select("*").eq("host_id", hostId!).eq("status", "open").order("created_at", { ascending: false });
    setReports(r ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hostId]);

  const moderate = async (id: string, status: "approved" | "hidden") => {
    const { error } = await supabase.from("event_photos").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast(status === "approved" ? "Photo approved" : "Photo hidden");
    load();
  };

  const resolve = async (id: string) => {
    await supabase.from("reports").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const hideTarget = async (r: any) => {
    if (r.target_type === "event") {
      const { error } = await supabase.from("events").update({ status: "draft" }).eq("id", r.target_id);
      if (error) { toast.error(error.message); return; }
      toast("Event hidden from public view");
    } else if (r.target_type === "photo") {
      const { error } = await supabase.from("event_photos").update({ status: "hidden" }).eq("id", r.target_id);
      if (error) { toast.error(error.message); return; }
      toast("Photo hidden");
    }
    await supabase.from("reports").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", r.id);
    load();
  };

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight mb-4">Moderation</h1>

      <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Photos awaiting approval</h2>
      {pendingPhotos.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground text-center">No photos to review.</Card>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3">
          {pendingPhotos.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <img src={`${SUPABASE_URL}/storage/v1/object/public/event-photos/${p.storage_path}`} alt="" className="w-full aspect-square object-cover" />
              <div className="p-3">
                <div className="text-xs text-muted-foreground truncate">{p.event_title}</div>
                <div className="text-xs">by {p.profiles?.display_name ?? "Member"}</div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" className="flex-1" onClick={() => moderate(p.id, "approved")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => moderate(p.id, "hidden")}>Hide</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 mt-8">Open reports</h2>
      {reports.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground text-center">No open reports.</Card>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                <div className="text-sm">
                  <span className="capitalize font-medium">{r.target_type}</span>
                  <span className="text-muted-foreground"> · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => hideTarget(r)}>
                    Hide {r.target_type}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => resolve(r.id)}>Mark resolved</Button>
                </div>
              </div>
              <div className="text-sm whitespace-pre-wrap">{r.reason}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
