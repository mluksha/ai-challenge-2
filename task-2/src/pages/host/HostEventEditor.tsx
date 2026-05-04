import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Copy } from "lucide-react";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000).optional(),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  venue_address: z.string().trim().max(300).optional(),
  online_link: z.string().trim().max(500).url().optional().or(z.literal("")),
  capacity: z.number().int().min(1).max(10000),
});

export default function HostEventEditor() {
  const { hostId, eventId } = useParams<{ hostId: string; eventId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNew = !eventId;

  const [form, setForm] = useState({
    title: "", description: "", starts_at: "", ends_at: "",
    venue_address: "", online_link: "", capacity: 50,
    visibility: "public" as "public" | "unlisted",
    status: "draft" as "draft" | "published",
    cover_url: "" as string | null,
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data } = await supabase.from("events").select("*").eq("id", eventId!).maybeSingle();
      if (!data) return;
      setForm({
        title: data.title, description: data.description ?? "",
        starts_at: data.starts_at.slice(0, 16), ends_at: data.ends_at.slice(0, 16),
        venue_address: data.venue_address ?? "", online_link: data.online_link ?? "",
        capacity: data.capacity, visibility: data.visibility, status: data.status,
        cover_url: data.cover_url,
      });
    })();
  }, [eventId, isNew]);

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${hostId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("event-covers").upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("event-covers").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_url: publicUrl }));
    setUploading(false);
  };

  const save = async (publish: boolean | null = null) => {
    if (!user) return;
    const parsed = schema.safeParse({
      title: form.title, description: form.description || undefined,
      starts_at: form.starts_at, ends_at: form.ends_at,
      venue_address: form.venue_address || undefined,
      online_link: form.online_link || undefined, capacity: Number(form.capacity),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (new Date(form.ends_at) <= new Date(form.starts_at)) { toast.error("End must be after start"); return; }
    setBusy(true);
    const payload: any = {
      ...parsed.data,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      online_link: form.online_link || null,
      venue_address: form.venue_address || null,
      cover_url: form.cover_url || null,
      visibility: form.visibility,
      host_id: hostId,
    };
    if (publish !== null) payload.status = publish ? "published" : "draft";
    if (publish && !isNew) payload.published_at = new Date().toISOString();
    if (isNew) payload.created_by = user.id;

    let result;
    if (isNew) result = await supabase.from("events").insert(payload).select().single();
    else result = await supabase.from("events").update(payload).eq("id", eventId!).select().single();
    setBusy(false);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(isNew ? "Event created" : "Event saved");
    navigate(`/host/${hostId}/events/${result.data.id}/edit`, { replace: true });
  };

  const duplicate = async () => {
    if (isNew) return;
    const { data } = await supabase.from("events").select("*").eq("id", eventId!).maybeSingle();
    if (!data) return;
    const { data: dup, error } = await supabase.from("events").insert({
      ...data, id: undefined, title: `${data.title} (copy)`, status: "draft",
      published_at: null, created_by: user!.id, created_at: undefined, updated_at: undefined,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    navigate(`/host/${hostId}/events/${dup.id}/edit`);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight mb-4">{isNew ? "New event" : "Edit event"}</h1>
      <Card className="p-6 space-y-5">
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} maxLength={5000} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Starts at"><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></Field>
          <Field label="Ends at"><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></Field>
        </div>
        <Field label="Venue address (optional)"><Input value={form.venue_address} onChange={(e) => setForm({ ...form, venue_address: e.target.value })} placeholder="123 Main St, Brooklyn" /></Field>
        <Field label="Online link (optional)"><Input value={form.online_link} onChange={(e) => setForm({ ...form, online_link: e.target.value })} placeholder="https://meet.example.com/abc" /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Capacity"><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
          <Field label="Visibility">
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, visibility: "public" })}
                className={`flex-1 px-3 py-2 text-sm rounded-md border ${form.visibility === "public" ? "bg-secondary border-foreground" : ""}`}>Public</button>
              <button type="button" onClick={() => setForm({ ...form, visibility: "unlisted" })}
                className={`flex-1 px-3 py-2 text-sm rounded-md border ${form.visibility === "unlisted" ? "bg-secondary border-foreground" : ""}`}>Unlisted</button>
            </div>
          </Field>
        </div>
        <Field label="Cover image">
          <div className="flex items-center gap-3">
            {form.cover_url && <img src={form.cover_url} alt="" className="h-16 w-28 object-cover rounded-md border" />}
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleCover} disabled={uploading} />
              <span className="text-sm px-3 py-2 border rounded-md hover:bg-secondary inline-block">{uploading ? "Uploading…" : "Upload cover"}</span>
            </label>
          </div>
        </Field>
        <Field label="Pricing">
          <TooltipProvider>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium`}>Free</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-2 opacity-50">
                    <Switch checked={false} disabled />
                    <span className="text-sm">Paid</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </Field>

        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button onClick={() => save(null)} disabled={busy} variant="outline">Save</Button>
          {form.status !== "published" ? (
            <Button onClick={() => save(true)} disabled={busy}>Publish</Button>
          ) : (
            <Button onClick={() => save(false)} disabled={busy} variant="outline">Unpublish</Button>
          )}
          {!isNew && <Button onClick={duplicate} variant="ghost"><Copy className="h-4 w-4 mr-1.5" />Duplicate</Button>}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}
