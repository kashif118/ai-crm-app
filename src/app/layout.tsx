import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { CrmProvider } from "@/providers/CrmProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { THEME_KEY } from "@/lib/constants";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-crm-app.vercel.app"),
  title: {
    default: "NovaCRM — AI-powered sales pipeline",
    template: "%s · NovaCRM",
  },
  description:
    "A modern CRM with AI lead scoring, a drag-and-drop deal pipeline and an assistant that drafts client emails. Built with Next.js, TypeScript and Tailwind CSS.",
  keywords: ["CRM", "sales pipeline", "lead scoring", "Next.js", "TypeScript", "Tailwind CSS"],
  openGraph: {
    title: "NovaCRM — AI-powered sales pipeline",
    description:
      "AI lead scoring, a drag-and-drop deal pipeline and an assistant that drafts client emails.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

/**
 * Applied before first paint so the page never flashes the wrong theme. It
 * mirrors the logic in ThemeProvider, which takes over once React hydrates.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_KEY)});
    var dark = stored === 'dark' ||
      ((stored === null || stored === 'system') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.dataset.theme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <CrmProvider>
            <AppShell>
              <div id="main">{children}</div>
            </AppShell>
          </CrmProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
