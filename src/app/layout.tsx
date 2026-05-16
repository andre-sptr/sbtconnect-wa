import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SBT Connect WA",
  description: "Dashboard broadcast WhatsApp berbasis WAHA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
