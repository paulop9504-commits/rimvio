"use client";

import { useState } from "react";
import { CalendarBoard } from "@/components/action-chat/calendar-board";
import { AppShell } from "@/components/app-shell";
export default function CalendarPage() {
  const [open, setOpen] = useState(true);

  return (
    <AppShell title="캘린더" compact iosSurface>
      <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
        <CalendarBoard
          variant="compact"
          compactTitle="캘린더"
          onExpand={() => setOpen(true)}
        />
        {open ? (
          <p className="mt-3 text-center text-[12px] text-muted-foreground">
            실행 화면에서 일정을 추가할 수 있습니다
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
