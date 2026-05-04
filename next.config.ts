import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 90],
  },
  async headers() {
    return [
      {
        // Aplicar a todas las rutas de soluciones para permitir el embebido
        source: '/soluciones/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' http://localhost:3000 https://brecomperu.com https://*.brecomperu.com",
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Permitir acceso desde las subrutas de región
          }
        ],
      },
    ];
  },
};

export default nextConfig;
