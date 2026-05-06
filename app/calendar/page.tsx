import { SiteHeader } from "@/components/site-header";

import { CalendarClient } from "./calendar-client";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div className="page-shell">
      <SiteHeader current="calendar" />
      <CalendarClient />
    </div>
  );
}
