import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/header/Header";
import AutoScroll from "./components/auto-scroll/AutoScroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brecomperu IT Solutions - Inteligencia Artificial & Desarrollo de Software",
  description: "Consultora líder en desarrollo de software con IA, automatización y soluciones tecnológicas para transformar tu negocio",
  keywords: "desarrollo software, inteligencia artificial, automatización, consultoría TI, Perú",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header></Header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
