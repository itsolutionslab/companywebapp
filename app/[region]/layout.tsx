import { RegionProvider } from "../context/RegionContext";

export default async function RegionalLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ region: string }>;
}) {
    const { region } = await params;
    const lang = region === 'us' ? 'en' : 'es';

    return (
        <html lang={lang}>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
            </head>
            <body className="antialiased">
                <RegionProvider initialRegion={region}>
                    <main>
                        {children}
                    </main>
                </RegionProvider>
            </body>
        </html>
    );
}
