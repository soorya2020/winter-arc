import type { MetadataRoute } from "next";

/** Lets members add Winter Arc to their home screen and open it full screen, like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Winter Arc 2026",
    short_name: "Winter Arc",
    description: "Six events. Two weekends. No excuses accepted.",
    start_url: "/board",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5f1",
    theme_color: "#0c0d0e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
