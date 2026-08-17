import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentDebate — AI Debate Arena",
  description:
    "Watch AI models debate head-to-head in structured arguments, scored by an impartial judge. Real-time streaming, multi-round debates, and detailed scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
