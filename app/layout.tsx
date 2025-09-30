import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthInitializer } from "@/components/AuthInitializer";
import { AuthProvider } from "@/components/AuthProvider";
import { ConvexProvider } from "@/components/ConvexProvider";
import { ToastProvider } from "@/components/ui/ToastManager";

export const metadata: Metadata = {
  title: "Celestial Drakon Aquatics",
  description:
    "Premium aquatic products and services - Your trusted partner for aquarium fish, tanks, and accessories.",
  keywords: ["aquarium", "fish", "tanks", "aquatic", "Philippines"],
  authors: [{ name: "Celestial Drakon Aquatics" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FF6B00",
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
          <AuthProvider>
            <ToastProvider>
              <AuthInitializer />
              <div className="min-h-screen bg-background text-foreground">
                {children}
              </div>
            </ToastProvider>
          </AuthProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}
