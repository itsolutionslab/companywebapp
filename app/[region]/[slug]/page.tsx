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
    if (!['us', 'latam'].includes(region)) return {};

    const match = parseSlug(slug, region as Region);
    if (!match) return { title: 'Not Found' };

    const { service, location } = match;

    return {
        title: `${service.title} in ${location.city}, ${location.state || ''} | Top Rated`,
        description: `Looking for ${service.title} in ${location.city}? We provide ${service.description} tailored for ${location.city} businesses. Contact us today.`,
        keywords: [...service.keywords, location.city, location.state ?? "", "IT Services", "Consulting"].join(', '),
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
    if (!['us', 'latam', 'es'].includes(region)) {
        notFound();
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
