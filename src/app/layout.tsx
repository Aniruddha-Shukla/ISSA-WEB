import type { Metadata, Viewport } from "next";
import { Exo_2, JetBrains_Mono, Orbitron } from "next/font/google";
import { siteConfig } from "@/config/site";
import { AppProviders } from "@/components/providers/app-providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DemoBanner } from "@/components/layout/demo-banner";
import { BootScreen } from "@/components/layout/boot-screen";
import { Starfield } from "@/components/ui/starfield";
import { ChatWidget } from "@/components/chat/chat-widget";
import "./globals.css";

const exo = Exo_2({ subsets: ["latin"], variable: "--font-exo", display: "swap" });
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
  weight: ["500", "600", "700", "800", "900"],
});
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: ["ISSA", "cybersecurity club", "CTF", "hackathon", "tech club", "student chapter", siteConfig.college],
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
  },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${exo.variable} ${orbitron.variable} ${jetbrains.variable}`} data-scroll-behavior="smooth">
      <body className="flex min-h-dvh flex-col antialiased">
        <BootScreen />
        <Starfield />
        <a
          href="#main"
          className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 font-medium text-on-primary focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Skip to content
        </a>
        <AppProviders>
          <DemoBanner />
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <ChatWidget />
        </AppProviders>
      </body>
    </html>
  );
}
