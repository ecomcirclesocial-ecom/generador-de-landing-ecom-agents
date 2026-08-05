import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Generador de Landing Pages · Ecom Agents",
  description: "Arma landing pages de producto sección por sección y súbelas a Shopify.",
};

const themeInit = `try{var t=localStorage.getItem("theme");if(t==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={sans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="bg-background font-sans text-foreground antialiased">
        <Sidebar />
        <main className="min-h-[100dvh] pb-24 pl-0 pt-20 sm:pl-64 sm:pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
