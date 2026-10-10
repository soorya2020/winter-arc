import type { Metadata, Viewport } from "next";
import { Anton, Archivo } from "next/font/google";
import "./globals.css";
import { palette, themeCss } from "@/lib/theme";

const display = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const body = Archivo({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Winter Arc 2026",
  description: "Six athletes. Six events. Two weekends to find your limits. By invitation.",
  robots: { index: false, follow: false },
  applicationName: "Winter Arc",
  appleWebApp: { capable: true, title: "Winter Arc", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192" }, { url: "/icon-512.png", sizes: "512x512" }], apple: "/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: palette.paper, width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head><style dangerouslySetInnerHTML={{ __html: themeCss() }} /></head>
      <body>{children}</body>
    </html>
  );
}
