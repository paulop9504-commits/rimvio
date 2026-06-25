"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { dispatchOpenFieldSheet } from "@/lib/nav/field-sheet-bridge";

/** Mobile-safe entry — never render the heavy /field page; open global sheet on home. */
export default function FieldPage() {
  const router = useRouter();

  useEffect(() => {
    dispatchOpenFieldSheet();
    router.replace("/");
  }, [router]);

  return (
    <div
      className="min-h-dvh bg-[#f2f4f6]"
      aria-busy="true"
      aria-label="맞춤 열기"
    />
  );
}
