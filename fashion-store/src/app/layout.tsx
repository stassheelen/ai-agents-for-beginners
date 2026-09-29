import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin", "cyrillic"], display: "swap" });
const display = Inter_Tight({ variable: "--font-display", subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "VELLA", template: "%s — VELLA" },
  description: "Преміальний activewear та базовий гардероб",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        {children}
      </body>
    </html>
  );
}
