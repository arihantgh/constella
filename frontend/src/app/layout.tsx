import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
