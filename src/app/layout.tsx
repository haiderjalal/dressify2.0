import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/noto-nastaliq-urdu/400.css";
import "@fontsource/noto-nastaliq-urdu/600.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getCurrentUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { env } from "@/server/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: { default: "Dressify — Bespoke tailoring, delivered", template: "%s · Dressify" },
  description: "Connect with trusted tailors, book a stitching slot and get bespoke clothing delivered.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#234e42" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, dir }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const session = user ? { id: user.id, role: user.role } : null;
  return (
    <html lang={locale} dir={dir} data-scroll-behavior="smooth">
      <body>
        <Providers locale={locale} session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
