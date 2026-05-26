import type { MetadataRoute } from "next";

const SHARE_TARGET = {
  action: "/share",
  method: "GET" as const,
  params: {
    title: "title",
    text: "text",
    url: "url",
  },
};

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Blink",
    short_name: "Blink",
    description: "Link-to-Action Operating Layer",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
    share_target: SHARE_TARGET,
  };
}
