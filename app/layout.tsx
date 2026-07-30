import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Krasun — Talk. Meet. Move together.",
  description: "A realtime social map and private group chat in one product.",
  other: { "codex-preview": "development" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
