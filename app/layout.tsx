import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;
  return {
    applicationName: "JLCG Task Workspace",
    title: "JLCG | Task Workspace",
    description:
      "Plan with purpose. Tasks, priorities, and schedules together in your JLCG workspace.",
    icons: { icon: "/logo.png", shortcut: "/logo.png", apple: "/logo.png" },
    openGraph: {
      title: "JLCG | Task Workspace",
      description: "A clear plan for what comes next.",
      images: [`${origin}/og.png`],
    },
    twitter: { card: "summary_large_image", images: [`${origin}/og.png`] },
  };
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
