import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Providers from "@/components/Providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PredictIQ — Trade Predictions. Let AI Resolve Reality.",
  description:
    "AI-powered prediction markets on GenLayer. Intelligent Contracts use on-chain AI reasoning and validator consensus to resolve markets with verifiable accuracy.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
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
