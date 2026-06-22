import type {
  TrendContextDeliveryInput,
  TrendContextMessage,
} from "@/lib/globe/trend-bridge/analysis/trend-capture-types";
import {
  formatTrendClockLabel,
  normalizeCaptureTimeAnchor,
} from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";

function peakHourNarrative(peakHour: string): string {
  const match = peakHour.match(/^(\d{2}):00/u);
  if (!match) {
    return peakHour;
  }
  const hour = Number(match[1]);
  if (hour >= 5 && hour < 12) {
    return `오전 ${hour}시`;
  }
  if (hour >= 12 && hour < 18) {
    const pm = hour === 12 ? 12 : hour - 12;
    return `오후 ${pm}시`;
  }
  if (hour >= 18 && hour < 22) {
    return `저녁 ${hour - 12}시`;
  }
  return `밤 ${hour}시`;
}

function userAlignedWithPeak(
  userHour: number,
  peakBucketStart: number,
): boolean {
  return userHour === peakBucketStart;
}

/** Deterministic Pulse copy — LLM polish is optional downstream. */
export function formatTrendContextMessage(
  input: TrendContextDeliveryInput,
  options?: { timeZone?: string; honorific?: string },
): TrendContextMessage {
  const { analysis, userCaptureTimestamp, userLocation } = input;
  const timeZone = options?.timeZone ?? "Asia/Seoul";
  const name = options?.honorific?.trim() || "당신";
  const area = userLocation?.trim() || analysis.hotspot_area;
  const peakNarrative = peakHourNarrative(analysis.peak_hour);

  let userClock: string | null = null;
  let aligned = false;
  if (userCaptureTimestamp?.trim()) {
    const anchor = normalizeCaptureTimeAnchor({
      timestamp: userCaptureTimestamp,
      timeZone,
    });
    if (anchor) {
      userClock = anchor.clockLabel;
      aligned = userAlignedWithPeak(anchor.hourStart, analysis.peak_bucket_start);
    }
  }

  const headline = aligned
    ? `${area}, 그 시간이 딱 맞았어요`
    : `${area} 흐름`;

  const body = aligned
    ? `지난번 ${area}에 계셨을 때 ${peakNarrative}쯤이 가장 활기찼어요. 그때 많은 분들이 같은 순간을 느꼈대요.`
    : userClock
      ? `지난번 ${userClock}에 남기셨는데, 요즘 ${area}는 ${peakNarrative}경 흐름이 가장 빨라요. ${name}과 취향이 비슷한 분들이 그 시간을 좋아하네요.`
      : `요즘 ${area}는 ${peakNarrative}경 활기가 모여요. 많은 분들이 그 시간대를 즐기고 있어요.`;

  return {
    headline,
    body,
    peak_hour: analysis.peak_hour,
    user_capture_hour: userClock,
  };
}
