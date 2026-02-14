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
        <RegionProvider initialRegion={region}>
            <main>
                {children}
            </main>
        </RegionProvider>
    );
}
