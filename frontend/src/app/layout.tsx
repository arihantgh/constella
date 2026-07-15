import type { Metadata } from "next";
import "./globals.css";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const metadata: Metadata = {
  title: "constella — Agent Payments on Stellar",
  description:
    "Autonomous AI agent payment system on the Stellar network via Soroban smart contracts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <GlobalErrorBoundary>{children}</GlobalErrorBoundary>
      </body>
    </html>
  );
}
