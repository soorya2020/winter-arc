import type { Metadata, Viewport } from "next";
import { Anton, Archivo } from "next/font/google";
import "./globals.css";

const display = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const body = Archivo({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Winter Arc 2026",
  description: "Six athletes. Six events. Two weekends to find your limits. By invitation.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#f4f5f1", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
