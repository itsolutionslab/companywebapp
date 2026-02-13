import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";

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
      <body className="antialiased">
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID || ""} />
        {children}
      </body>
    </html>
  );
}
