import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthInitializer } from "@/components/AuthInitializer";
import { ConvexProvider } from "@/components/ConvexProvider";
import { ReservationProvider } from "@/context/ReservationContext";
import ClientReservationOverlay from "@/components/ui/ClientReservationOverlay";

export const metadata: Metadata = {
  title: "Dragon's Cave — Admin",
  description:
    "Dragon's Cave — Home of Premium Arowanas. Admin console for inventory, reservations, and point of sale.",
  keywords: ["arowana", "aquarium", "fish", "tanks", "aquatic", "Philippines", "Dragon's Cave"],
  authors: [{ name: "Dragon's Cave" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#A02323",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ConvexProvider>
          <ReservationProvider>
            <AuthInitializer />
            <div className="min-h-screen-safe bg-background text-foreground safe-area-wrapper">
              {children}
            </div>
            <ClientReservationOverlay />
          </ReservationProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}
