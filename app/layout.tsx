import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mondiali 2026 - Pronostici",
  description: "Lega privata di Matteo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className={`${geist.className} antialiased bg-slate-900 text-white`}>
        {/* La nostra Navbar dinamica */}
        <Navbar />

        <main className="max-w-7xl mx-auto px-4">
          {children}
        </main>
      </body>
    </html>
  );
}