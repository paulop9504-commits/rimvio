import {
  buildRealityObject,
  type BuildRealityObjectInput,
} from "@/lib/reality-object/build-reality-object";
import { upsertRealityObjectMetadata } from "@/lib/reality-object/store";
import type { RealityObjectV1 } from "@/lib/reality-object/types";

/** Build + upsert Reality Object onto pin metadata (Context Pin → Object). */
export function attachRealityObjectToPinMetadata(input: {
  metadata?: Record<string, unknown> | null;
  build: BuildRealityObjectInput;
}): { metadata: Record<string, unknown>; object: RealityObjectV1 } {
  const object = buildRealityObject(input.build);
  return {
    object,
    metadata: upsertRealityObjectMetadata({
      metadata: input.metadata,
      object,
    }),
  };
}
