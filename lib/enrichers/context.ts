import type { EnricherContext, LocationCategory } from "@/lib/enrichers/types";



export const DEFAULT_ENRICHER_CONTEXT: EnricherContext = {

  hour: new Date().getHours(),

  installedApps: [],

  locationCategory: "unknown",

};



export function inferLocationCategory(hour: number): LocationCategory {

  if (isCommuteHour(hour)) {

    return "commute";

  }



  if (hour >= 22 || hour < 6) {

    return "home";

  }



  if (hour >= 9 && hour < 18) {

    return "office";

  }



  return "unknown";

}



export function normalizeEnricherContext(

  partial?: Partial<EnricherContext> | null

): EnricherContext {

  const hour =

    typeof partial?.hour === "number" && partial.hour >= 0 && partial.hour <= 23

      ? partial.hour

      : DEFAULT_ENRICHER_CONTEXT.hour;



  const installedApps = Array.isArray(partial?.installedApps)

    ? partial.installedApps

        .filter((app): app is string => typeof app === "string")

        .map((app) => app.trim().toLowerCase())

        .filter(Boolean)

    : DEFAULT_ENRICHER_CONTEXT.installedApps;



  const locationCategory =

    partial?.locationCategory &&

    ["commute", "home", "office", "unknown"].includes(partial.locationCategory)

      ? partial.locationCategory

      : inferLocationCategory(hour);



  return { hour, installedApps, locationCategory };

}



export function isCommuteHour(hour: number) {

  return hour >= 7 && hour < 9;

}



export function hasInstalledApp(context: EnricherContext, appId: string) {

  return context.installedApps.includes(appId.toLowerCase());

}


