import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

export default function EventFeedback({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [existing, setExisting] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("event_feedback").select("*").eq("event_id", eventId).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) { setExisting(data); setRating(data.rating); setComment(data.comment ?? ""); } });
  }, [eventId, user?.id]);

  const submit = async () => {
    if (!user) return;
    if (rating < 1) { toast.error("Pick a rating"); return; }
    setBusy(true);
    const payload = { event_id: eventId, user_id: user.id, rating, comment: comment.trim() || null };
    const { error } = existing
      ? await supabase.from("event_feedback").update({ rating, comment: payload.comment }).eq("id", existing.id)
      : await supabase.from("event_feedback").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your feedback!");
    setExisting({ ...(existing ?? {}), id: existing?.id, rating, comment });
  };

  if (!user) return <div className="text-sm text-muted-foreground">Sign in to leave feedback.</div>;

  return (
    <div>
      <h2 className="text-lg font-medium mb-3">How was the event?</h2>
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className="p-1">
            <Star className={`h-6 w-6 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500}
        placeholder="What did you think? (optional)" rows={3} />
      <Button onClick={submit} disabled={busy} className="mt-3">
        {existing ? "Update feedback" : "Submit feedback"}
      </Button>
    </div>
  );
}
