import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";

interface Photo { id: string; storage_path: string; status: string; uploader_id: string }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function publicUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/event-photos/${path}`;
}

export default function EventGallery({ eventId, hostId, ended }: { eventId: string; hostId: string; ended: boolean }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("event_photos").select("id,storage_path,status,uploader_id")
      .eq("event_id", eventId)
      .in("status", ["approved", "pending"])
      .order("created_at", { ascending: false });
    setPhotos(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [eventId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${eventId}/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("event-photos").upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("event_photos").insert({
        event_id: eventId, uploader_id: user.id, storage_path: path,
      });
      if (dbErr) throw dbErr;
      toast.success("Photo submitted for host approval");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const visible = photos.filter((p) => p.status === "approved" || p.uploader_id === user?.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Event gallery</h2>
        {user && ended && (
          <label className="cursor-pointer">
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
            <Button asChild variant="outline" size="sm" disabled={uploading}>
              <span><Upload className="h-4 w-4 mr-1.5" />{uploading ? "Uploading…" : "Add photo"}</span>
            </Button>
          </label>
        )}
      </div>
      {visible.length === 0 ? (
        <div className="text-sm text-muted-foreground bg-secondary/40 rounded-lg p-6 text-center">
          <ImageIcon className="h-6 w-6 mx-auto mb-2 opacity-60" />
          No photos yet{ended ? " — be the first to share one." : "."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {visible.map((p) => (
            <div key={p.id} className="aspect-square rounded-md bg-secondary overflow-hidden relative">
              <img src={publicUrl(p.storage_path)} alt="" className="w-full h-full object-cover" loading="lazy" />
              {p.status === "pending" && (
                <div className="absolute bottom-1 left-1 bg-background/90 text-xs px-2 py-0.5 rounded">Pending approval</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
