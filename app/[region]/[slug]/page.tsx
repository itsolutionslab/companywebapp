import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { REGIONS, SERVICES, Region, ServiceInfo, LocationInfo, getAllPaths } from '../../data/regions';
import ModernLanding from '../../components/modern/ModernLanding';

// Helper to parse slug: "it-consulting-dallas"
// This is tricky because "plano-texas" has a hyphen. 
// Strategy: check if slug ends with a known city slug.
function parseSlug(slug: string, regionKey: Region): { service: ServiceInfo, location: LocationInfo } | null {
    const region = REGIONS[regionKey];

    for (const loc of region.locations) {
        if (slug.endsWith(loc.slug)) {
            // attempt to match service
            // slug = "it-consulting-dallas", loc.slug="dallas"
            // potential service slug = "it-consulting-" (minus the last hyphen)
            const serviceSlug = slug.slice(0, slug.lastIndexOf(loc.slug) - 1);
            const service = SERVICES.find(s => s.slug === serviceSlug);
            if (service) {
                return { service, location: loc };
            }
        }
    }
    return null;
}

type Props = {
    params: Promise<{ region: string; slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { region, slug } = await params;
    if (!['us', 'latam', 'pe'].includes(region)) return {};

    const baseUrl = 'https://www.brecomperu.com';
    const isEn = region === 'us';

    const getAlternates = (enSlug: string, esSlug: string) => ({
        canonical: `${baseUrl}/${region}/${slug}`,
        languages: {
            'en-US': `${baseUrl}/us/${enSlug}`,
            'es-PE': `${baseUrl}/pe/${esSlug}`,
            'es-419': `${baseUrl}/latam/${esSlug}`,
            'x-default': `${baseUrl}/us/${enSlug}`,
        },
    });

    const sectionMetadata: Record<string, Metadata> = {
        'industries': { title: 'Industries We Serve | Brecomperu', description: 'Expert IT solutions for E-commerce, Health, Logistics, and more.', alternates: getAlternates('industries', 'industrias') },
        'industrias': { title: 'Industrias que Servimos | Brecomperu', description: 'Soluciones IT expertas para E-commerce, Salud, Logística y más.', alternates: getAlternates('industries', 'industrias') },
        'services': { title: 'Our IT Services | Brecomperu', description: 'Custom software development, AI integration, and tech consulting.', alternates: getAlternates('services', 'servicios') },
        'servicios': { title: 'Nuestros Servicios IT | Brecomperu', description: 'Desarrollo de software a medida, integración de IA y consultoría tecnológica.', alternates: getAlternates('services', 'servicios') },
        'about': { title: 'About Us | Brecomperu', description: 'Learn about our mission to drive digital evolution.', alternates: getAlternates('about', 'nosotros') },
        'nosotros': { title: 'Sobre Nosotros | Brecomperu', description: 'Conoce nuestra misión de impulsar la evolución digital.', alternates: getAlternates('about', 'nosotros') },
        'contact': { title: 'Contact Us | Brecomperu', description: 'Get in touch for a strategic technology consultation.', alternates: getAlternates('contact', 'contacto') },
        'contacto': { title: 'Contáctanos | Brecomperu', description: 'Ponte en contacto para una consultoría tecnológica estratégica.', alternates: getAlternates('contact', 'contacto') },
        'casos': { title: 'Case Studies | Brecomperu', description: 'Explore our successful tech implementations.', alternates: getAlternates('casos', 'casos') }
    };

    if (sectionMetadata[slug]) {
        return sectionMetadata[slug];
    }

    const match = parseSlug(slug, region as Region);
    if (!match) return { title: 'Not Found' };

    const { service, location } = match;

    // For dynamic geographic service pages, build the alternate slugs
    // In English: seo-agencies-in-lima
    // In Spanish: agencias-seo-en-lima (Assuming base slug patterns)
    // For simplicity, we fallback to just the current canonical URL if complex translation logic isn't perfectly 1:1 mapped per term.
    const geoAlternates = {
        canonical: `${baseUrl}/${region}/${slug}`,
        // We can safely assume the structure is localized based on the region parameter
        languages: {
            'en-US': region === 'us' ? `${baseUrl}/us/${slug}` : undefined,
            'es-PE': region === 'pe' ? `${baseUrl}/pe/${slug}` : undefined,
            'es-419': region === 'latam' ? `${baseUrl}/latam/${slug}` : undefined,
        }
    };

    return {
        title: `${service.title} in ${location.city}, ${location.state || ''} | Top Rated`,
        description: `Looking for ${service.title} in ${location.city}? We provide ${service.description} tailored for ${location.city} businesses. Contact us today.`,
        keywords: [...service.keywords, location.city, location.state ?? "", "IT Services", "Consulting"].join(', '),
        alternates: geoAlternates,
        openGraph: {
            title: `${service.title} in ${location.city} - Brecomperu`,
            description: `Expert ${service.title} services in ${location.city}.`,
            locale: REGIONS[region as Region].locale,
            type: 'website',
        }
    };
}

// Generate static params for SSG
export async function generateStaticParams() {
    const paths = getAllPaths();
    return paths;
}

export default async function ServiceCityPage({ params }: Props) {
    const { region, slug } = await params;

    // Validate Region
    if (!['us', 'latam', 'pe'].includes(region)) {
        notFound();
    }

    // Check if slug is a core section
    const sectionMap: Record<string, string> = {
        'industries': 'industries',
        'industrias': 'industrias',
        'services': 'services',
        'servicios': 'servicios',
        'about': 'about',
        'nosotros': 'nosotros',
        'contact': 'contact',
        'contacto': 'contacto',
        'casos': 'casos'
    };

    if (sectionMap[slug]) {
        return <ModernLanding region={region} scrollTarget={sectionMap[slug]} />;
    }

    const match = parseSlug(slug, region as Region);
    if (!match) {
        notFound();
    }

    const { service, location } = match;

    return (
        <ModernLanding
            region={region}
            customHero={{
                title: <>{service.title} <span className="gradient-text">in {location.city}</span></>,
                description: `${service.description} - Specifically serving the ${location.city} area.`
            }}
        />
    );
}

