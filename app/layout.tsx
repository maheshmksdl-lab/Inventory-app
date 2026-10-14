import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppChrome } from "@/components/layout/app-chrome";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Inventory", template: "%s · EVOQ Inventory" },
  description: "EVOQ Inventory — track products, stock levels and movements across warehouses.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only z-[70] rounded-md bg-white px-3 py-2 text-sm font-medium text-ink shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
