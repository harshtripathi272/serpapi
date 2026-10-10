import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "First Seen",
  description: "Before you forward it, see where it's been.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f4f6",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Browser extensions add attributes to <html> before React loads; don't warn about those.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${jakarta.variable} ${devanagari.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
