import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const orbitron = Orbitron({ variable: "--font-orbitron", subsets: ["latin"], weight: ["500", "700", "900"] });

export const metadata: Metadata = {
  title: "HopperEye Command",
  description: "Every garbage hopper becomes a sensor: ward segregation scores, dump-spot radar and optimised beats.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${orbitron.variable} antialiased`}>{children}</body>
    </html>
  );
}
