import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@fontsource-variable/inter";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "7MZ Store",
  description: "Premium digital goods — instant delivery inside Telegram.",
  applicationName: "7MZ Store",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#09090B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Providers>
          <div className="relative mx-auto min-h-dvh w-full max-w-md">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
