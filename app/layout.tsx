import type { Metadata } from "next";
import Script from "next/script";
import { GoogleTagManager } from "@next/third-parties/google";
import { Toaster } from 'react-hot-toast';
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
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {/* Google Tag Manager */}
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID || ""} />

        {/* Google Ads (gtag.js) - Commented out as GTM is being used
        {googleAdsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-ads" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAdsId}');
              `}
            </Script>
          </>
        )}
        */}

        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
