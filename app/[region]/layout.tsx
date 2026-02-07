import { RegionProvider } from "../context/RegionContext";

export default async function RegionalLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ region: string }>;
}) {
    const { region } = await params;

    return (
        <RegionProvider initialRegion={region}>
            <main>
                {children}
            </main>
        </RegionProvider>
    );
}
