import { Metadata } from 'next';
import SolutionsShowroom from '@/app/components/solutions/SolutionsShowroom';
import { notFound } from 'next/navigation';

type Props = {
    params: Promise<{ region: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { region } = await params;
    
    const titles: Record<string, string> = {
        pe: "Showroom de Soluciones Tecnológicas en Perú | Brecomperu",
        us: "IT Solutions Showroom & Demos | Brecomperu",
        latam: "Showroom Digital: Soluciones por Industria para Latam | Brecomperu"
    };

    const descriptions: Record<string, string> = {
        pe: "Explora nuestras demos interactivas de software para banca, retail, industria y más. Soluciones digitales listas para transformar tu empresa en Perú.",
        us: "Explore our interactive software demos for banking, retail, industrial sectors and more. Cutting-edge IT solutions for your business growth.",
        latam: "Demos interactivas y propuestas de valor para diversas industrias en Latinoamérica. Visualiza el impacto de la tecnología en tu negocio."
    };

    return {
        title: titles[region] || titles['latam'],
        description: descriptions[region] || descriptions['latam'],
        openGraph: {
            title: titles[region] || titles['latam'],
            description: descriptions[region] || descriptions['latam'],
            type: 'website'
        }
    };
}

export default async function SolucionesPage({ params }: Props) {
    const { region } = await params;

    if (!['us', 'latam', 'pe', 'es'].includes(region)) {
        notFound();
    }

    // Mapping 'es' to 'latam' if needed, or handle it
    const effectiveRegion = region === 'es' ? 'latam' : region;

    return <SolutionsShowroom region={effectiveRegion} />;
}
