import { format, isPast, isToday, isTomorrow } from "date-fns";

export function fmtDateTime(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return format(d, "EEE, MMM d · h:mm a");
}

export function fmtDate(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return format(d, "EEE, MMM d, yyyy");
}

export function fmtTime(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return format(d, "h:mm a");
}

export function fmtRelativeDay(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isToday(d)) return `Today · ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, "h:mm a")}`;
  return format(d, "EEE, MMM d · h:mm a");
}

export function eventEnded(endsAt: string | Date) {
  return isPast(typeof endsAt === "string" ? new Date(endsAt) : endsAt);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
