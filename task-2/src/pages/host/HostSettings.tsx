import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  contact_email: z.string().trim().email("Valid email required").max(255),
  bio: z.string().trim().max(500).optional(),
});

type Ctx = { role: "host" | "checker"; host: any };

export default function HostSettings() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const ctx = useOutletContext<Ctx>();
  const [host, setHost] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = "Host settings · Gather"; }, []);

  // Defense-in-depth: only hosts may access
  useEffect(() => {
    if (ctx?.role && ctx.role !== "host") navigate(`/host/${hostId}/dashboard`, { replace: true });
  }, [ctx?.role, hostId, navigate]);

  useEffect(() => {
    if (!hostId) return;
    (async () => {
      const { data } = await supabase.from("hosts").select("*").eq("id", hostId).maybeSingle();
      if (data) {
        setHost(data);
        setName(data.name ?? "");
        setEmail(data.contact_email ?? "");
        setBio(data.bio ?? "");
        setLogoUrl(data.logo_url ?? null);
      }
    })();
  }, [hostId]);

  const handleLogo = async (file: File) => {
    if (!user || !hostId) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Image must be under 4 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${hostId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("host-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("host-logos").getPublicUrl(path);
      setLogoUrl(pub.publicUrl);
      toast.success("Logo uploaded — remember to save");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, contact_email: email, bio });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("hosts").update({
        name: parsed.data.name,
        contact_email: parsed.data.contact_email,
        bio: parsed.data.bio ?? null,
        logo_url: logoUrl,
      }).eq("id", hostId!);
      if (error) throw error;
      toast.success("Host updated");
    } catch (err: any) {
      toast.error(err.message ?? "Could not save");
    } finally {
      setBusy(false);
    }
  };

  if (!host) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const publicPath = `/hosts/${host.slug}`;
  const publicUrl = `${window.location.origin}${publicPath}`;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight mb-4">Host settings</h1>

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-secondary overflow-hidden flex items-center justify-center text-lg font-medium">
                {logoUrl
                  ? <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                  : (host.name?.[0] ?? "?")}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogo(f); e.target.value = ""; }}
              />
              <Button type="button" variant="outline" size="sm" disabled={uploading}
                onClick={() => fileInput.current?.click()}>
                <Upload className="h-4 w-4 mr-1.5" />{uploading ? "Uploading…" : "Upload logo"}
              </Button>
              {logoUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl(null)}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Host name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Contact email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Short bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4} />
            <p className="text-xs text-muted-foreground">{bio.length}/500</p>
          </div>

          <div className="space-y-1.5">
            <Label>Public page</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={publicUrl} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon"
                onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copied"); }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" asChild>
                <Link to={publicPath} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Slug: <span className="font-mono">{host.slug}</span> — contact support to change it.
            </p>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
