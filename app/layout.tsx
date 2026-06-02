import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { GLANGO } from "@/lib/brand/glango";
import { STORE_META, storeAbsoluteUrl } from "@/lib/pwa/store-meta";
import { getServerLocale } from "@/lib/i18n/server-locale";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const appUrl = storeAbsoluteUrl("/");
const ogImage = storeAbsoluteUrl(STORE_META.ogImage);

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: GLANGO.lockup,
    template: `%s · ${GLANGO.name}`,
  },
  description: STORE_META.shortDescription,
  applicationName: GLANGO.name,
  manifest: "/manifest.webmanifest",
  keywords: [...STORE_META.keywords],
  category: STORE_META.category,
  creator: GLANGO.name,
  publisher: GLANGO.name,
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-1024.png", sizes: "1024x1024", type: "image/png" },
      { url: "/glango-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: GLANGO.name,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: appUrl,
    siteName: GLANGO.name,
    title: GLANGO.lockup,
    description: STORE_META.longDescription,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: `${GLANGO.name} preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: GLANGO.lockup,
    description: STORE_META.shortDescription,
    images: [ogImage],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1c1c1c",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const htmlLang = locale === "ko" ? "ko" : locale;

  return (
    <html
      lang={htmlLang}
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-dvh bg-background font-sans text-foreground"
      >
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
