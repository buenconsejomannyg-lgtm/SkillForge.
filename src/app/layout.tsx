import type { Metadata } from "next";
import { PrototypeProvider } from "@/components/prototype-provider";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "SkillForge — Build Your Next Level",
    template: "%s | SkillForge",
  },
  description: "A local prototype for learning, building, and tracking skills.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PrototypeProvider>
          <AppShell>{children}</AppShell>
        </PrototypeProvider>
      </body>
    </html>
  );
}
