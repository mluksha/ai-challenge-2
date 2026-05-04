import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarCheck, QrCode, Users } from "lucide-react";
import { useEffect } from "react";

export default function Landing() {
  useEffect(() => { document.title = "Gather · Community events made simple"; }, []);
  return (
    <div>
      <section className="container-wide pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          A lightweight platform for free, community-style events
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight max-w-3xl mx-auto leading-tight">
          Run events your community will actually show up to.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
          Publish events, manage RSVPs and waitlists, and check people in at the door — all in one calm, fast dashboard.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/explore">Browse events <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/become-host">Host your own</Link></Button>
        </div>
      </section>

      <section className="container-wide pb-24 grid sm:grid-cols-3 gap-4">
        <Feature icon={<CalendarCheck className="h-5 w-5" />} title="Effortless RSVPs" body="Free tickets, automatic waitlist promotion, and a clean attendee experience." />
        <Feature icon={<QrCode className="h-5 w-5" />} title="Door-friendly check-in" body="Manual codes work even when the venue Wi-Fi doesn't. Live counters update instantly." />
        <Feature icon={<Users className="h-5 w-5" />} title="Made for teams" body="Invite co-hosts and door-staff with copyable links. Roles are scoped and explicit." />
      </section>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="h-9 w-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">{icon}</div>
      <div className="mt-3 font-medium">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{body}</div>
    </div>
  );
}
