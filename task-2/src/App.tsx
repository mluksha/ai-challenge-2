import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import RequireAuth from "@/components/RequireAuth";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Explore from "./pages/Explore";
import EventDetail from "./pages/EventDetail";
import HostPublic from "./pages/HostPublic";
import BecomeHost from "./pages/BecomeHost";
import MyTickets from "./pages/MyTickets";
import TicketDetail from "./pages/TicketDetail";
import MyEvents from "./pages/MyEvents";
import NotificationsPage from "./pages/NotificationsPage";
import InviteRedeem from "./pages/InviteRedeem";
import HostLayout from "./pages/host/HostLayout";
import HostDashboard from "./pages/host/HostDashboard";
import HostEventsList from "./pages/host/HostEventsList";
import HostEventEditor from "./pages/host/HostEventEditor";
import HostMembers from "./pages/host/HostMembers";
import HostModeration from "./pages/host/HostModeration";
import HostSettings from "./pages/host/HostSettings";
import CheckIn from "./pages/host/CheckIn";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/hosts/:slug" element={<HostPublic />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/invite/:token" element={<InviteRedeem />} />

              <Route path="/become-host" element={<RequireAuth><BecomeHost /></RequireAuth>} />
              <Route path="/my-tickets" element={<RequireAuth><MyTickets /></RequireAuth>} />
              <Route path="/tickets/:rsvpId" element={<RequireAuth><TicketDetail /></RequireAuth>} />
              <Route path="/my-events" element={<RequireAuth><MyEvents /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />

              <Route path="/host/:hostId" element={<HostLayout />}>
                <Route path="dashboard" element={<HostDashboard />} />
                <Route path="events" element={<HostEventsList />} />
                <Route path="events/new" element={<HostEventEditor />} />
                <Route path="events/:eventId/edit" element={<HostEventEditor />} />
                <Route path="members" element={<HostMembers />} />
                <Route path="moderation" element={<HostModeration />} />
                <Route path="settings" element={<HostSettings />} />
              </Route>
              {/* Check-in lives outside the host nav so Checkers (no dashboard access) can use it */}
              <Route path="/host/:hostId/events/:eventId/checkin" element={<RequireAuth><CheckIn /></RequireAuth>} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
