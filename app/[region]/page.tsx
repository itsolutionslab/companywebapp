
import ModernLanding from "../components/modern/ModernLanding";
import { REGIONS, Region } from "../data/regions";
import { Metadata } from "next";

type Props = {
    params: Promise<{ region: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { region } = await params;
    const regionData = REGIONS[region as Region] || REGIONS['latam'];

    return {
        title: `Brecomperu IT Solutions - ${regionData.name}`,
        description: region === 'us'
            ? "Leading IT Consulting, AI Solutions & Software Development."
            : "Consultora líder en desarrollo de software con IA y automatización.",
    }
}

export default async function RegionPage({ params }: Props) {
    const { region } = await params;

    // We simply use ModernLanding for both regions now, as it handles localization
    return <ModernLanding region={region} />;
}
