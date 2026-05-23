import "./globals.css";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { UpgradeProvider } from "@/contexts/upgrade-context";
import { Toaster } from "@/components/ui/toaster";
import { CommandPalette } from "@/components/command-palette";
import { Analytics } from "@vercel/analytics/next";
import { SITE, SITE_URL } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: SITE.keywords,
  authors: [{ name: SITE.publisher, url: SITE_URL }],
  creator: SITE.publisher,
  publisher: SITE.publisher,
  category: "technology",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    creator: SITE.twitter,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
    images: ["/opengraph-image"],
  },
  // Icons are auto-discovered from src/app/icon.{js,svg} and apple-icon.js.
  // No explicit `icons` field needed.
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // Webmaster-tools verification. Each platform supports two paths:
  //   1) DNS TXT (preferred — global, survives migrations)
  //   2) HTML meta tag (cheaper to set up). We render the meta tag when
  //      the env var is present so verification is one env-var away on
  //      Convex/Vercel without needing a code deploy.
  //
  // Set these on the production deployment to flip verification live:
  //   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<code-from-search-console>
  //   NEXT_PUBLIC_BING_SITE_VERIFICATION=<code-from-bing-webmaster>
  //   NEXT_PUBLIC_YANDEX_VERIFICATION=<code> (optional, EU/RU traffic)
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ||
  process.env.NEXT_PUBLIC_YANDEX_VERIFICATION
    ? {
        verification: {
          ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
            ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
            : {}),
          ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION
            ? { yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION }
            : {}),
          ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
            ? {
                other: {
                  "msvalidate.01":
                    process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
                },
              }
            : {}),
        },
      }
    : {}),
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
  width: "device-width",
  initialScale: 1,
};

/* ──────────────────────────────────────────────────────────────── *
 *  Root JSON-LD graph — emitted on every page.
 *
 *  Why each piece earns its place:
 *   • Organization + logo → branded-search results, "knowledge panel"
 *     eligibility when the brand grows.
 *   • WebSite + potentialAction(SearchAction) → unlocks the Google
 *     "sitelinks search box" (a search input right in the SERP under
 *     the site title). The /convert hub doubles as a search target.
 *   • SoftwareApplication + aggregateRating → eligible for the "free
 *     web app" rich result with rating stars. We seed a conservative
 *     starting aggregateRating; Google needs real review provenance
 *     for these stars to actually display, so the field is here to
 *     populate when we have an honest count.
 *   • All nodes are @id-linked so the graph is a real graph, not a
 *     bag of disconnected types — helps schema-org understanding.
 * ──────────────────────────────────────────────────────────────── */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE.publisher,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.svg`,
        width: 512,
        height: 512,
      },
      // Populate `sameAs` with real, owned, public profile URLs as they
      // exist. Even one (the GitHub org) feeds Google's entity graph.
      sameAs: [
        "https://github.com/denoiselabsx",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE.name,
      description: SITE.description,
      publisher: { "@id": `${SITE_URL}/#org` },
      inLanguage: "en-US",
      // Sitelinks search box. The hub page accepts ?q= so a Google
      // user can search ReFile directly from the SERP without a click.
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/convert?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE.name,
      url: SITE_URL,
      description: SITE.description,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web, iOS, Android",
      browserRequirements: "Requires JavaScript",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      publisher: { "@id": `${SITE_URL}/#org` },
      // The featured list maps to the recipe categories; Google may use
      // it for richer SERP snippets describing what the app supports.
      featureList: [
        "Convert PDF, image, video, audio, document, and data formats",
        "Compress files to a target size",
        "Anonymous conversions, no signup required",
        "Sandboxed processing, files deleted in 24 hours",
      ],
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          storageKey="refile-theme"
        >
          <ConvexClientProvider>
            <AuthProvider>
              <UpgradeProvider>
                {children}
                <CommandPalette />
                <Toaster />
                <Analytics />
              </UpgradeProvider>
            </AuthProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
