import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MatchPath — Find roles that fit your path",
  description: "AI-assisted job discovery and explainable matching for remote frontend and AI product roles.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
