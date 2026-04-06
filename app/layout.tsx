import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthInitializer } from "@/components/AuthInitializer";
import { ConvexProvider } from "@/components/ConvexProvider";
import { ReservationProvider } from "@/context/ReservationContext";
import ClientReservationOverlay from "@/components/ui/ClientReservationOverlay";

export const metadata: Metadata = {
  title: "Dragon Cave Inventory",
  description:
    "Premium aquatic products and services - Your trusted partner for aquarium fish, tanks, and accessories.",
  keywords: ["aquarium", "fish", "tanks", "aquatic", "Philippines"],
  authors: [{ name: "Dragon Cave Inventory" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FF6B00",
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
