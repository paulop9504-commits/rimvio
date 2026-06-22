import type {
  TrendCaptureAnalysisOptions,
  TrendCaptureAnalysisResult,
  TrendCaptureRecord,
  TrendContextDeliveryInput,
  TrendContextMessage,
} from "@/lib/globe/trend-bridge/analysis/trend-capture-types";
import { aggregateTrendCaptureDensity } from "@/lib/globe/trend-bridge/analysis/aggregate-trend-capture-density";
import { formatTrendContextMessage } from "@/lib/globe/trend-bridge/analysis/format-trend-context-message";
import {
  buildTrendAnalysisEngineUserPrompt,
  TREND_ANALYSIS_ENGINE_SYSTEM_PROMPT,
} from "@/lib/globe/trend-bridge/analysis/trend-analysis-engine-prompt";
import {
  buildTrendContextDeliveryUserPrompt,
  TREND_CONTEXT_DELIVERY_SYSTEM_PROMPT,
} from "@/lib/globe/trend-bridge/analysis/trend-context-delivery-prompt";

export type TrendCaptureAnalysisPipeline = {
  filteredCount: number;
  analysis: TrendCaptureAnalysisResult | null;
  analysisLlm: {
    system: string;
    user: string;
  };
  contextMessage: TrendContextMessage | null;
  contextLlm: {
    system: string;
    user: string;
  } | null;
};

export function runTrendCaptureAnalysisPipeline(input: {
  records: TrendCaptureRecord[];
  options?: TrendCaptureAnalysisOptions;
  delivery?: Omit<TrendContextDeliveryInput, "analysis">;
}): TrendCaptureAnalysisPipeline {
  const analysis = aggregateTrendCaptureDensity(input.records, input.options);

  const analysisLlm = {
    system: TREND_ANALYSIS_ENGINE_SYSTEM_PROMPT,
    user: buildTrendAnalysisEngineUserPrompt({
      records: input.records,
      deterministic: analysis,
      timeZone: input.options?.timeZone,
    }),
  };

  let contextMessage: TrendContextMessage | null = null;
  let contextLlm: TrendCaptureAnalysisPipeline["contextLlm"] = null;

  if (analysis) {
    const deliveryInput: TrendContextDeliveryInput = {
      analysis,
      userCaptureTimestamp: input.delivery?.userCaptureTimestamp,
      userLocation: input.delivery?.userLocation,
    };
    contextMessage = formatTrendContextMessage(deliveryInput, {
      timeZone: input.options?.timeZone,
    });
    contextLlm = {
      system: TREND_CONTEXT_DELIVERY_SYSTEM_PROMPT,
      user: buildTrendContextDeliveryUserPrompt(deliveryInput),
    };
  }

  return {
    filteredCount: input.records.length,
    analysis,
    analysisLlm,
    contextMessage,
    contextLlm,
  };
}

export {
  aggregateTrendCaptureDensity,
  aggregateTrendForLocationCategory,
} from "@/lib/globe/trend-bridge/analysis/aggregate-trend-capture-density";
export { filterTrendCaptureOutliers } from "@/lib/globe/trend-bridge/analysis/filter-trend-capture-outliers";
export { formatTrendContextMessage } from "@/lib/globe/trend-bridge/analysis/format-trend-context-message";
export {
  formatTrendClockLabel,
  formatTrendHourBucketLabel,
  normalizeCaptureTimeAnchor,
  resolveTrendDaySegment,
} from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";
export {
  buildTrendAnalysisEngineUserPrompt,
  TREND_ANALYSIS_ENGINE_SYSTEM_PROMPT,
} from "@/lib/globe/trend-bridge/analysis/trend-analysis-engine-prompt";
export {
  buildTrendContextDeliveryUserPrompt,
  parseTrendContextDeliveryLlmResult,
  TREND_CONTEXT_DELIVERY_SYSTEM_PROMPT,
} from "@/lib/globe/trend-bridge/analysis/trend-context-delivery-prompt";
export type {
  TrendCaptureAnalysisOptions,
  TrendCaptureAnalysisResult,
  TrendCaptureRecord,
  TrendContextDeliveryInput,
  TrendContextMessage,
  TrendDaySegment,
  TrendTimeBucket,
  TrendVelocity,
} from "@/lib/globe/trend-bridge/analysis/trend-capture-types";
