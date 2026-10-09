import type { Metadata, Viewport } from "next";
import { Unbounded, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Unbounded({ subsets: ["latin"], weight: ["500", "700", "900"], variable: "--font-display" });
const body = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Winter Arc 2026",
  description: "Seven people. Six events. Two weekends to find your limits. Invite only.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#120a2e", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
