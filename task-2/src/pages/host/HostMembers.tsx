import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";

export default function HostMembers() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [role, setRole] = useState<"host" | "checker">("checker");

  const load = async () => {
    const { data: m } = await supabase
      .from("host_members").select("id,role,user_id,profiles:user_id(display_name,email)")
      .eq("host_id", hostId!);
    setMembers(m ?? []);
    const { data: i } = await supabase
      .from("host_invites").select("*").eq("host_id", hostId!).is("used_at", null)
      .order("created_at", { ascending: false });
    setInvites(i ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hostId]);

  const createInvite = async () => {
    if (!user) return;
    const { error } = await supabase.from("host_invites").insert({ host_id: hostId, role, created_by: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Invite link created");
    load();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    const { error } = await supabase.from("host_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const deleteInvite = async (id: string) => {
    await supabase.from("host_invites").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight mb-4">Members</h1>

      <Card className="p-5">
        <div className="text-sm font-medium mb-3">Invite a new member</div>
        <div className="flex gap-2">
          <Select value={role} onValueChange={(v: any) => setRole(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="host">Host (full access)</SelectItem>
              <SelectItem value="checker">Checker (check-in only)</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={createInvite}>Generate invite link</Button>
        </div>

        {invites.length > 0 && (
          <div className="mt-4 space-y-2">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center gap-2 text-sm border rounded-md p-2">
                <span className="text-xs px-2 py-0.5 rounded bg-secondary">{i.role}</span>
                <span className="font-mono text-xs truncate flex-1">{`${window.location.origin}/invite/${i.token}`}</span>
                <Button size="sm" variant="ghost" onClick={() => copyLink(i.token)}><Copy className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => deleteInvite(i.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-6">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Current members</h2>
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{m.profiles?.display_name ?? "Member"}</div>
                <div className="text-xs text-muted-foreground">{m.profiles?.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-secondary capitalize">{m.role}</span>
                {m.user_id !== user?.id && (
                  <Button variant="ghost" size="sm" onClick={() => remove(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
