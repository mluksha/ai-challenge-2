import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ReportDialog({
  open, onOpenChange, targetType, targetId, hostId,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  targetType: "event" | "photo"; targetId: string; hostId: string | null;
}) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (reason.trim().length < 5) { toast.error("Please describe the issue"); return; }
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id, target_type: targetType, target_id: targetId,
      host_id: hostId, reason: reason.trim().slice(0, 1000),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted. The host will review it.");
    setReason(""); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetType}</DialogTitle>
          <DialogDescription>Tell the host what's wrong. They'll review and decide what to do.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Why are you reporting this?" rows={4} maxLength={1000} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Sending…" : "Submit report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
