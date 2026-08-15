import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Display serif — warm, editorial, with SOFT/WONK axes for the chunky, hand-made
// personality of the wordmark. Optical sizing applies automatically at display sizes.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

// Body + UI sans.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Café Le Den | Pointe-Claire",
  description:
    "Homemade bread, specialty lattes, and fresh meals in Valois Village, Pointe-Claire. Order online for pickup.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
