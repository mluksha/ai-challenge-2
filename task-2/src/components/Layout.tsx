import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar, LogOut, Ticket, LayoutGrid } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string>("");
  const [hasHostAccess, setHasHostAccess] = useState(false);

  useEffect(() => {
    if (!user) { setDisplayName(""); setHasHostAccess(false); return; }
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));
    supabase.from("host_members").select("host_id", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => setHasHostAccess((count ?? 0) > 0));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = (displayName || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="container-wide flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm">G</span>
            <span>Gather</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <NavItem to="/explore" label="Explore" />
            {user && <NavItem to="/my-tickets" label="My Tickets" />}
            {user && hasHostAccess && <NavItem to="/my-events" label="My Events" />}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm">
                      <div className="font-medium truncate">{displayName || "Member"}</div>
                      <div className="text-muted-foreground text-xs truncate">{user.email}</div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/explore"><Calendar className="h-4 w-4 mr-2" />Explore events</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/my-tickets"><Ticket className="h-4 w-4 mr-2" />My tickets</Link></DropdownMenuItem>
                    {hasHostAccess
                      ? <DropdownMenuItem asChild><Link to="/my-events"><LayoutGrid className="h-4 w-4 mr-2" />My events</Link></DropdownMenuItem>
                      : <DropdownMenuItem asChild><Link to="/become-host"><LayoutGrid className="h-4 w-4 mr-2" />Become a host</Link></DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}><LogOut className="h-4 w-4 mr-2" />Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild size="sm"><Link to="/auth">Sign in</Link></Button>
                <Button asChild size="sm"><Link to="/auth?mode=signup">Sign up</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t mt-12">
        <div className="container-wide py-6 text-xs text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} Gather</span>
          <span>Community events, made simple.</span>
        </div>
      </footer>
    </div>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md text-sm transition-colors ${isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`
      }
    >
      {label}
    </NavLink>
  );
}
