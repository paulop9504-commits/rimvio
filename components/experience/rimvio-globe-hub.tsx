"use client";



import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { SpatialGlobeStage } from "@/components/experience/spatial-globe-stage";

import { SpatialMediaSyncPlayer } from "@/components/experience/spatial-media-sync-player";

import { useExperienceGraph } from "@/hooks/use-experience-graph";

import { useSpatialContextSync } from "@/hooks/use-spatial-context-sync";

import {

  buildGlobeSpaceBlobs,

  filterVolumesByCluster,

  globeViewForBlob,

  type GlobeSpaceBlob,

} from "@/lib/experience-graph/build-globe-space-blobs";

import { projectClusterSpatialMedia } from "@/lib/experience-graph/project-cluster-spatial-media";

import { ensureGlobeDemoEvents } from "@/lib/experience-graph/seed-globe-demo-events";

import type { EventCandidate } from "@/lib/events/event-candidate";

import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";

import { indexEventsById } from "@/lib/plan-context/project-plan-to-feed-slot";

import type { ExperienceGraphProjection } from "@/lib/experience-graph/experience-volume-types";

import { cn } from "@/lib/utils";



function useGlobeEventSnapshot() {

  const [ready, setReady] = useState(false);

  const [eventsById, setEventsById] = useState<ReadonlyMap<string, EventCandidate>>(

    () => new Map<string, EventCandidate>(),

  );



  useEffect(() => {

    ensureGlobeDemoEvents();

    const refresh = () => {

      setEventsById(indexEventsById(listLifeEventCandidates()));

      setReady(true);

    };

    refresh();

    window.addEventListener(EVENT_CANDIDATES_UPDATED, refresh);

    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, refresh);

  }, []);



  return { ready, eventsById };

}



export type RimvioGlobeHubProps = {

  className?: string;

};



type RimvioGlobeHubBodyProps = {

  className?: string;

  graph: ExperienceGraphProjection;

};



/** Loaded globe body — hooks must not sit behind a conditional return in the parent. */

const RimvioGlobeHubBody = memo(function RimvioGlobeHubBody({

  className,

  graph,

}: RimvioGlobeHubBodyProps) {

  const blobs = useMemo(

    () => buildGlobeSpaceBlobs(graph.volumes),

    [graph.volumes],

  );



  const [activeBlobId, setActiveBlobId] = useState<string | null>(null);



  useEffect(() => {

    if (!activeBlobId && blobs[0]) {

      setActiveBlobId(blobs[0].id);

    }

  }, [activeBlobId, blobs]);



  const activeBlob = useMemo(

    () => blobs.find((blob) => blob.id === activeBlobId) ?? blobs[0] ?? null,

    [activeBlobId, blobs],

  );



  const clusterVolumes = useMemo(

    () =>

      activeBlob

        ? filterVolumesByCluster(graph.volumes, activeBlob.clusterId)

        : [],

    [activeBlob, graph.volumes],

  );



  const clusterMedia = useMemo(

    () => projectClusterSpatialMedia(clusterVolumes),

    [clusterVolumes],

  );



  const sync = useSpatialContextSync(clusterMedia);



  const globe = useMemo(() => {

    if (sync.globe) {

      return { ...sync.globe, zoom: 1.9 };

    }

    return activeBlob ? globeViewForBlob(activeBlob) : null;

  }, [activeBlob, sync.globe]);



  const selectBlob = useCallback((blobId: string) => {

    setActiveBlobId(blobId);

  }, []);



  if (!globe || !activeBlob) {

    return (

      <div

        className={cn(

          "flex min-h-[50vh] items-center justify-center px-6 text-center text-[13px] text-white/50",

          className,

        )}

        data-rimvio-globe-hub-empty

      >

        일정이 쌓이면 지구본에 공간이 나타납니다.

      </div>

    );

  }



  return (

    <div className={cn("flex flex-col", className)} data-rimvio-globe-hub>

      <SpatialGlobeStage

        variant="immersive"

        globe={globe}

        timeLabel={sync.frame?.timeLabel}

        environmentLabel={sync.frame?.environmentLabel}

        blobs={blobs}

        activeBlobId={activeBlob.id}

        onBlobPress={selectBlob}

      />



      <div className="border-b border-white/8 px-3 py-2.5">

        <p className="text-[11px] font-medium text-white/40">이 공간의 경험</p>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">

          {blobs.map((blob: GlobeSpaceBlob) => {

            const active = blob.id === activeBlob.id;

            return (

              <button

                key={blob.id}

                type="button"

                data-globe-space-chip={blob.id}

                aria-pressed={active}

                onClick={() => selectBlob(blob.id)}

                className={cn(

                  "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",

                  active

                    ? "border-sky-300/45 bg-sky-500/20 text-sky-50"

                    : "border-white/12 bg-white/[0.04] text-white/72 hover:border-white/22",

                )}

              >

                {blob.label} · {blob.experienceCount}

              </button>

            );

          })}

        </div>

      </div>



      <div className="px-3 py-3">

        <p className="mb-2 text-[12px] leading-snug text-white/48">

          사진·영상·글을 누르면 지구본·시간·환경이 함께 이동합니다.

        </p>

        <SpatialMediaSyncPlayer

          items={clusterMedia}

          sync={sync}

          hideGlobe

        />

      </div>

    </div>

  );

});



/** Rimvio globe tab — tap a space blob, then photo/video/text syncs place·time·environment. */

export const RimvioGlobeHub = memo(function RimvioGlobeHub({

  className,

}: RimvioGlobeHubProps) {

  const { ready, eventsById } = useGlobeEventSnapshot();

  const { graph } = useExperienceGraph(ready ? eventsById : undefined);



  if (!ready) {

    return (

      <div

        className={cn(

          "flex min-h-[50vh] items-center justify-center px-6 text-center text-[13px] text-white/45",

          className,

        )}

        data-rimvio-globe-hub-loading

      >

        지구본 불러오는 중…

      </div>

    );

  }



  return <RimvioGlobeHubBody className={className} graph={graph} />;

});


