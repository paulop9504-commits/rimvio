import type { EnricherContext } from "@/lib/enrichers/types";

import type { LinkActionItem } from "@/types/database";

import { hasInstalledApp, isCommuteHour } from "@/lib/enrichers/context";

import {

  isMapOrNaviAction,

  isPlaceRelatedUrl,

} from "@/lib/resolvers";



function scoreAction(

  action: LinkActionItem,

  context: EnricherContext,

  sourceUrl: string

) {

  let score = 0;

  const href = action.href ?? sourceUrl;



  if (

    (isCommuteHour(context.hour) || context.locationCategory === "commute") &&

    isMapOrNaviAction(action)

  ) {

    score += 100;

  }



  if (

    hasInstalledApp(context, "kakaomap") &&

    action.payload?.icon === "kakaomap"

  ) {

    score += 200;

  }



  if (

    hasInstalledApp(context, "kakaomap") &&

    isPlaceRelatedUrl(href) &&

    action.payload?.icon === "kakaomap"

  ) {

    score += 50;

  }



  if (action.payload?.icon === "external-link") {

    score -= 10;

  }



  return score;

}



export function rankActionsByContext(

  actions: LinkActionItem[],

  context: EnricherContext,

  sourceUrl: string

) {

  return [...actions].sort((left, right) => {

    const scoreDelta =

      scoreAction(right, context, sourceUrl) -

      scoreAction(left, context, sourceUrl);



    if (scoreDelta !== 0) {

      return scoreDelta;

    }



    return 0;

  });

}



export { isPlaceRelatedUrl } from "@/lib/resolvers";


