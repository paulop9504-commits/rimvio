import { CalendarPageClient } from "@/components/calendar/calendar-page-client";
import { AppShell } from "@/components/app-shell";

export default function CalendarPage() {
  return (
    <AppShell title="캘린더" compact iosSurface>
      <CalendarPageClient />
    </AppShell>
  );
}
