import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Café Le Den Admin",
    template: "%s — Café Le Den Admin",
  },
  description: "Café Le Den operations workspace.",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
