export type {
  ExperiencePhase,
  ExperienceTripTiming,
  ExperienceWindow,
} from "@/lib/experience-window/experience-window-types";

export { classifyExperiencePhase, stampTimelineItemPhase } from "@/lib/experience-window/classify-experience-phase";
export { resolveExperienceWindow } from "@/lib/experience-window/resolve-experience-window";
export { projectPeerMessagesToTimeline } from "@/lib/experience-window/project-peer-messages-timeline";
export {
  formatExperiencePhaseLabel,
  formatExperienceTripTimingLabel,
  formatExperienceWindowRangeLabel,
  formatTimelineOccurredLabel,
} from "@/lib/experience-window/format-experience-window-label";
export {
  groupBridgeTimelineByPhase,
  isBridgeTimelineMediaKind,
} from "@/lib/experience-window/group-timeline-by-phase";
export type { ExperienceTimelinePhaseGroup } from "@/lib/experience-window/group-timeline-by-phase";
export {
  formatContextTalkSegmentLabel,
  projectContextTalkSegments,
  resolveContextTalkSegmentForMessage,
} from "@/lib/experience-window/project-context-talk-segments";
export type { ContextTalkSegment } from "@/lib/experience-window/project-context-talk-segments";
