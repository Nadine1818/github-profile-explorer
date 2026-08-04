import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "explore — GitHub profile explorer",
  description: "Search GitHub profiles, compare users, and chat with an AI grounded in real repo data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
