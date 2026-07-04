import { businessBrainPolicy } from "@/lib/situation-projection/business-brain-policy";
import { caregivingBrainPolicy } from "@/lib/situation-projection/caregiving-brain-policy";
import { travelBrainPolicy } from "@/lib/situation-projection/travel-brain-policy";

export const BRAIN_SECTOR_POLICIES = {
  travel: travelBrainPolicy,
  caregiving: caregivingBrainPolicy,
  business: businessBrainPolicy,
} as const;
