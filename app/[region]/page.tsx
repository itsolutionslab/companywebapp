
import ModernLanding from "../components/modern/ModernLanding";
import { REGIONS, Region } from "../data/regions";
import { Metadata } from "next";

type Props = {
    params: Promise<{ region: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { region } = await params;

    // SEO Configuration per region
    const seoConfigs: Record<string, Metadata> = {
        'us': {
            title: "IT Consulting & AI Solutions in Plano, Dallas, Texas | Brecomperu",
            description: "Leading IT Consulting and Software Development in Plano and Dallas, Texas. We specialize in AI solutions, custom software, and digital transformation for US enterprises.",
            keywords: ["IT Consulting Plano", "Software Development Dallas", "AI Solutions Texas", "Tech Consultancy USA", "Custom Software Dallas"],
            alternates: {
                canonical: "/us"
            }
        },
        'pe': {
            title: "Consultoría IT y Desarrollo de Software en Perú | Brecomperu",
            description: "Expertos en Ingeniería de Software e Inteligencia Artificial en Perú. Soluciones tecnológicas escalables, desarrollo a medida y soporte directo en Lima y provincias.",
            keywords: ["Desarrollo de Software Perú", "Consultoría IT Lima", "Inteligencia Artificial Perú", "Sistemas de Reservas Perú", "Apps a medida Perú"],
            alternates: {
                canonical: "/pe"
            }
        },
        'latam': {
            title: "Soluciones Tecnológicas e IA para Latinoamérica | Brecomperu",
            description: "Impulsamos la evolución digital en LATAM con software de clase mundial e integración de IA. Consultoría tecnológica para escalar su negocio en toda la región.",
            keywords: ["Desarrollo de Software Latinoamérica", "Consultoría IT LATAM", "Transformación Digital LATAM", "IA para empresas LATAM"],
            alternates: {
                canonical: "/latam"
            }
        }
    };

    const config = seoConfigs[region] || seoConfigs['latam'];

    return {
        ...config,
        openGraph: {
            title: config.title as string,
            description: config.description as string,
            type: 'website',
            siteName: 'Brecomperu IT Solutions',
        },
        twitter: {
            card: 'summary_large_image',
            title: config.title as string,
            description: config.description as string,
        }
    };
}

export default async function RegionPage({ params }: Props) {
    const { region } = await params;

    // We simply use ModernLanding for both regions now, as it handles localization
    return <ModernLanding region={region} />;
}
