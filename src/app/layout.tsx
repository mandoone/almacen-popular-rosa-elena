import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { obtenerOrigenPublico } from "@/lib/fase10/metadataPublica";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  ...(obtenerOrigenPublico() ? { metadataBase: obtenerOrigenPublico() as URL } : {}),
  title: {
    default: "Almacén Popular Rosa Elena Morales",
    template: "%s | Almacén Popular Rosa Elena Morales",
  },
  description:
    "Proyecto comunitario sin fines de lucro. Población Juan Antonio Ríos, Independencia, Santiago.",
  applicationName: "Almacén Popular Rosa Elena Morales",
  icons: { icon: "/favicon.ico" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} ${playfair.variable} bg-background font-sans antialiased min-h-screen flex flex-col`}
      >
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
