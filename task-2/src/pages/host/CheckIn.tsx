import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Undo2 } from "lucide-react";

export default function CheckIn() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<any>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ confirmed: 0, waitlist: 0, checked_in: 0 });
  const [recent, setRecent] = useState<Array<{ ok: boolean; reason?: string; name?: string; rsvp_id?: string; ts: number }>>([]);
  const [lastCheckedIn, setLastCheckedIn] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    if (!eventId) return;
    const { data: ev } = await supabase.from("events").select("title,capacity").eq("id", eventId).maybeSingle();
    setEvent(ev);
    const { data: r } = await supabase.from("rsvps").select("status,checked_in_at").eq("event_id", eventId);
    const s = { confirmed: 0, waitlist: 0, checked_in: 0 };
    for (const row of r ?? []) {
      if (row.status === "confirmed") s.confirmed++;
      else if (row.status === "waitlisted") s.waitlist++;
      if (row.checked_in_at) s.checked_in++;
    }
    setStats(s);
  };

  useEffect(() => { refresh(); inputRef.current?.focus(); /* eslint-disable-next-line */ }, [eventId]);
  useEffect(() => { const id = setInterval(refresh, 10000); return () => clearInterval(id); /* eslint-disable-next-line */ }, [eventId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("check_in_by_code", { _event_id: eventId!, _code: c });
    setBusy(false);
    setCode("");
    inputRef.current?.focus();
    if (error) { toast.error(error.message); return; }
    const result = data as any;
    if (result.ok) {
      setLastCheckedIn(result.rsvp_id);
      setRecent((r) => [{ ok: true, name: result.name, rsvp_id: result.rsvp_id, ts: Date.now() }, ...r].slice(0, 8));
      toast.success(`${result.name} checked in`);
    } else if (result.reason === "already_checked_in") {
      setRecent((r) => [{ ok: false, reason: "Already checked in", name: result.name, ts: Date.now() }, ...r].slice(0, 8));
      toast.warning(`${result.name} was already checked in`);
    } else if (result.reason === "invalid_code") {
      setRecent((r) => [{ ok: false, reason: "Invalid code", ts: Date.now() }, ...r].slice(0, 8));
      toast.error("Invalid code");
    } else {
      setRecent((r) => [{ ok: false, reason: result.reason, ts: Date.now() }, ...r].slice(0, 8));
      toast.error(`Cannot check in: ${result.reason}`);
    }
    refresh();
  };

  const undo = async () => {
    if (!lastCheckedIn) return;
    const { error } = await supabase.rpc("undo_check_in", { _rsvp_id: lastCheckedIn });
    if (error) { toast.error(error.message); return; }
    toast("Last check-in undone");
    setLastCheckedIn(null);
    refresh();
  };

  return (
    <div className="container-tight py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">{event?.title ?? "Check-in"}</h1>
      <div className="text-sm text-muted-foreground mt-1">Enter ticket codes manually as people arrive.</div>

      <Card className="p-6 mt-6">
        <form onSubmit={submit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="TICKET CODE"
            className="font-mono text-lg tracking-widest"
            autoFocus
            autoComplete="off"
          />
          <Button type="submit" disabled={busy || !code}>Check in</Button>
        </form>

        <div className="grid grid-cols-3 mt-6 pt-6 border-t text-center">
          <Stat label="Going" value={`${stats.confirmed}/${event?.capacity ?? "—"}`} />
          <Stat label="Checked in" value={stats.checked_in} accent />
          <Stat label="Waitlist" value={stats.waitlist} />
        </div>

        {lastCheckedIn && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Made a mistake?</span>
            <Button onClick={undo} variant="outline" size="sm"><Undo2 className="h-4 w-4 mr-1.5" />Undo last check-in</Button>
          </div>
        )}
      </Card>

      {recent.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-medium mb-2">Recent</div>
          <div className="space-y-1">
            {recent.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-md bg-card border">
                {r.ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <span className="flex-1">{r.name ?? r.reason}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
