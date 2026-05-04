# Gather — Usage Guide

A step-by-step walkthrough of how to use the app, from publishing an event to checking attendees in at the door.

---

## 1. What Gather is

Gather is a lightweight platform for **free, community-style events**. There are two roles:

- **Host** — creates and manages events for a host profile.
- **Checker** — door staff who can check attendees in, but cannot edit events.

Browsing is open to everyone. Anything that changes data (RSVP, publish, check-in) requires a signed-in account.

---

## 2. Quick map of the app

| Page | Route | Purpose |
|---|---|---|
| Landing | `/` | Marketing entry point |
| Explore | `/explore` | Browse all public events |
| Event detail | `/events/:id` | View an event and RSVP |
| My Tickets | `/my-tickets` | Tickets for events you RSVP'd to |
| My Events | `/my-events` | Events you've signed up for, filterable |
| Become a Host | `/become-host` | Create a host profile |
| Host dashboard | `/host/:hostId/dashboard` | Stats and management for a host |
| Check-in | `/host/:hostId/events/:eventId/check-in` | Door check-in screen |
| Notifications | bell icon in header | In-app notifications only |

---

## 3. Account basics

1. Click **Sign in** in the header (or any RSVP / Host button).
2. Sign up with email + password at `/auth`, or sign in if you already have an account.
3. Browsing events does not require an account. RSVPs, hosting, and check-in do.

---

## 4. Flow 1 — Become a Host & Publish an event

1. From the landing page, click **Host your own**, or open `/become-host`.
2. Fill in the host profile: name, slug (your public URL), short bio, optional logo.
3. You'll land on the **Host dashboard**. Click **New event**.
4. Fill in the event form:
   - Title and description
   - Start and end date/time (end must be after start)
   - Venue address and/or online link
   - Capacity (1–10000)
   - Visibility: **Public** (appears in Explore) or **Unlisted** (only people with the link can find it)
   - Cover image (optional, max 5 MB)
   - Pricing is **Free** only — paid events are not supported.
5. Click **Save** to keep it as a draft, or **Publish** to make it live. Drafts are not visible to anyone outside your host team.
6. Optional extras:
   - **Duplicate** an existing event to reuse its content.
   - Open **Members** to invite co-hosts or checkers — copy the invite link and send it to them. They redeem it at `/invite/:token`.

---

## 5. Flow 2 — Discover & RSVP

1. Open `/explore`. Use the filters to narrow results:
   - Text search (title, description)
   - Location
   - Date range (from / to)
   - Toggle **Include past** to see ended events
2. Click an event to open its detail page. You'll see capacity, seats left, and waitlist count.
3. Click the action button:
   - **RSVP — Free** when there's space
   - **Join waitlist** when the event is full
   - If you're signed out, you'll be sent to sign in and brought back to **auto-complete the RSVP** — no need to click again.
4. To cancel, open the event again and click **Cancel RSVP**. The next person on the waitlist is promoted automatically.
5. Past events never accept RSVPs — the button is replaced by **Event ended**.

---

## 6. Flow 3 — Your ticket

1. After confirming, go to **My Tickets** in the header, or click **View ticket** on the event page.
2. Each ticket shows:
   - Event details (title, date, venue)
   - A **QR code** (rendered locally on your device)
   - A short **manual code** — used at the door if scanning isn't available
3. Add the event to your calendar with the **.ics download** link.

---

## 7. Flow 4 — Check-in at the door (Host / Checker)

1. Open the Host dashboard, pick the event, and click **Check-in**.
2. Either:
   - **Type or paste** the attendee's manual code, or
   - Use any external QR scanner that types the scanned code into the input field.
   The app does **not** open the device camera.
3. Press Enter. The system:
   - Confirms the check-in and updates the live counters (checked in / confirmed)
   - Blocks **duplicate check-ins** automatically
   - Lets you click **Undo** to reverse a mistaken scan
4. The flow is venue-friendly: manual codes work even if the Wi-Fi or camera is unreliable.

---

## 8. Flow 5 — After the event

- **Feedback** — once the event end time passes, attendees can leave a 1–5 star rating and a short comment on the event page.
- **Photos** — attendees can upload photos to the event gallery. Photos appear publicly only after a host **approves** them in the moderation queue.
- **Attendee export** — from the host dashboard, hosts can download a CSV with the columns: `Name`, `Email`, `RSVP status`, `Check-in time`. The file is Excel- and Sheets-safe.

---

## 9. Reporting & moderation

1. Any signed-in user can flag an event or a photo using the **Report** (flag) icon.
2. Reports land in the host's **Moderation** queue.
3. Hosts can:
   - **Hide** a reported event (it goes back to draft and disappears from public view), or
   - **Hide** a reported photo, or
   - **Mark resolved** if no action is needed.

---

## 10. What the app does NOT do

To keep behavior predictable, these are explicit non-goals:

- No payments or paid tickets
- No email, SMS, or push notifications — only the **in-app bell**
- No camera-based QR scanning
- No roles other than **Host** and **Checker**
- No RSVP approval flow — RSVP is instant (or waitlisted)
- No RSVPs on past events

# CSV
"Name","Email","RSVP status","Check-in time"
"User1","user1@mail.com","confirmed",""