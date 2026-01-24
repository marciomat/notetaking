import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NumpadJazzProvider } from "@/components/providers/jazz-provider";
import { DnDWrapper } from "@/components/providers/dnd-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "sonner";
import { IOSInstallPrompt } from "@/components/ios-install-prompt";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Numpad",
  description: "E2E encrypted notetaking with real-time sync",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Numpad",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120x120.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <NumpadJazzProvider>
            <DnDWrapper>
              {children}
              <Toaster theme="dark" position="bottom-right" />
              <IOSInstallPrompt />
            </DnDWrapper>
          </NumpadJazzProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
