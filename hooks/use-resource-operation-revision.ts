"use client";

import { useEffect, useState } from "react";
import { subscribeResourceOperations } from "@/lib/resource-operation";

/** Bump when resource operation store changes — refresh map pin signals. */
export function useResourceOperationRevision(): number {
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribeResourceOperations(() => setRevision((value) => value + 1)), []);
  return revision;
}
