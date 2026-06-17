import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Providers from "@/components/Providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["700", "900"],
});

export const metadata: Metadata = {
  title: "PredictIQ — Trade Predictions. Let AI Resolve Reality.",
  description:
    "AI-powered prediction markets on GenLayer. Intelligent Contracts use on-chain AI reasoning and validator consensus to resolve markets with verifiable accuracy.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className={playfair.variable}>
        <Providers>
          <Navigation />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          <footer className="border-t border-border mt-16 py-8 text-center text-xs text-muted">
            <p>
              PredictIQ — Powered by{" "}
              <a
                href="https://genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-electric-blue hover:underline"
              >
                GenLayer
              </a>{" "}
              Intelligent Contracts &middot; StudioNet
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
