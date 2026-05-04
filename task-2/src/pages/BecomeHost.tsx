import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { slugify } from "@/lib/format";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  contact_email: z.string().trim().email("Valid email required").max(255),
  bio: z.string().trim().max(500).optional(),
});

export default function BecomeHost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get("invite");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Become a host · Gather"; }, []);

  // Auto-redeem invite path
  useEffect(() => {
    if (!user || !inviteToken) return;
    (async () => {
      const { data, error } = await supabase.rpc("redeem_host_invite", { _token: inviteToken });
      if (error) { toast.error(error.message); return; }
      toast.success("You're in!");
      navigate(`/host/${data}/dashboard`);
    })();
  }, [user, inviteToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ name, contact_email: email, bio });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      // Generate unique-ish slug
      const baseSlug = slugify(parsed.data.name) || "host";
      let slug = baseSlug;
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.from("hosts").select("id").eq("slug", slug).maybeSingle();
        if (!data) break;
        slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }
      const { data: host, error } = await supabase.from("hosts").insert({
        name: parsed.data.name, contact_email: parsed.data.contact_email,
        bio: parsed.data.bio ?? null, slug, created_by: user.id,
      }).select().single();
      if (error) throw error;
      // Creator is added as a host member automatically via DB trigger.
      toast.success("Host created");
      navigate(`/host/${host.id}/dashboard`);
    } catch (err: any) {
      toast.error(err.message ?? "Could not create host");
    } finally {
      setBusy(false);
    }
  };

  if (inviteToken && user) {
    return <div className="container-tight py-16 text-sm text-muted-foreground">Redeeming invite…</div>;
  }

  return (
    <div className="container-tight py-12 max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Become a host</h1>
      <p className="text-sm text-muted-foreground mt-1">Set up your community page and start publishing events.</p>
      <Card className="p-6 mt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Host name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Brooklyn Book Club" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Contact email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Short bio (optional)</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4}
              placeholder="What kind of events do you host?" />
          </div>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating…" : "Create host"}</Button>
        </form>
      </Card>
    </div>
  );
}
