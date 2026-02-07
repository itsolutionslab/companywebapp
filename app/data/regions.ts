export type Region = 'us' | 'latam' | 'es';

export interface LocationInfo {
    city: string;
    state?: string;
    slug: string;
}

export interface ServiceInfo {
    id: string;
    title: string; // Display title
    slug: string;  // URL part
    keywords: string[];
    description: string;
}

export const REGIONS: Record<Region, {
    name: string;
    locale: string;
    currency: string;
    locations: LocationInfo[];
}> = {
    us: {
        name: "United States",
        locale: "en-US",
        currency: "USD",
        locations: [
            { city: "Dallas", state: "Texas", slug: "dallas" },
            { city: "Plano", state: "Texas", slug: "plano-texas" },
            { city: "Austin", state: "Texas", slug: "austin" },
            { city: "Houston", state: "Texas", slug: "houston" },
            { city: "Texas", state: "USA", slug: "texas" }, // State-wide coverage
            { city: "USA", state: "", slug: "usa" }, // Country-wide coverage
            { city: "New York", state: "NY", slug: "nyc" },
            { city: "San Francisco", state: "CA", slug: "sf" },
        ]
    },
    latam: {
        name: "Latinoamérica",
        locale: "es-PE", // Defaulting to PE for generic LatAm Spanish for now, or mix
        currency: "USD", // Often used in B2B
        locations: [
            { city: "Lima", state: "Peru", slug: "lima" },
            { city: "Cusco", state: "Peru", slug: "cusco" },
            { city: "Arequipa", state: "Peru", slug: "arequipa" },
            { city: "Bogotá", state: "Colombia", slug: "bogota" },
            { city: "Santiago", state: "Chile", slug: "santiago" },
            { city: "Buenos Aires", state: "Argentina", slug: "buenos-aires" },
        ]
    },
    es: {
        name: "Latinoamérica",
        locale: "es", // Generic Spanish
        currency: "USD",
        locations: [
            { city: "Lima", state: "Peru", slug: "lima" },
            { city: "Cusco", state: "Peru", slug: "cusco" },
            { city: "Arequipa", state: "Peru", slug: "arequipa" },
            { city: "Bogotá", state: "Colombia", slug: "bogota" },
            { city: "Santiago", state: "Chile", slug: "santiago" },
            { city: "Buenos Aires", state: "Argentina", slug: "buenos-aires" },
        ]
    }
};

export const SERVICES: ServiceInfo[] = [
    {
        id: "it-consulting",
        title: "IT Consulting",
        slug: "it-consulting",
        keywords: ["IT Strategy", "Digital Transformation", "Tech Consultancy"],
        description: "Expert IT consulting services to drive your business forward."
    },
    {
        id: "ai-solutions",
        title: "AI Solutions",
        slug: "ai-solutions",
        keywords: ["Artificial Intelligence", "Machine Learning", "Automation"],
        description: "Cutting-edge AI solutions for modern enterprises."
    },
    {
        id: "web-development",
        title: "Web Development",
        slug: "web-development",
        keywords: ["Web Design", "Frontend", "Backend", "Fullstack"],
        description: "High-performance web applications tailored to your needs."
    },
    {
        id: "remote-it",
        title: "Remote IT Consulting",
        slug: "remote-it-consulting",
        keywords: ["Remote Work", "Virtual Teams", "Global IT Support"],
        description: "Reliable remote IT consulting for distributed teams."
    }
];

// Helper to generate all valid paths for SSG or Validation
export function getAllPaths() {
    const paths: { region: string; slug: string }[] = [];

    Object.keys(REGIONS).forEach((regionKey) => {
        const region = REGIONS[regionKey as Region];

        // Generates: /us/it-consulting-dallas
        SERVICES.forEach(service => {
            region.locations.forEach(location => {
                // e.g., it-consulting-dallas
                // e.g., ai-solutions-plano-texas
                const combinedSlug = `${service.slug}-${location.slug}`;
                paths.push({ region: regionKey, slug: combinedSlug });
            });

            // Also maybe just region wide? /us/it-consulting-usa?
            // For now let's stick to the user request pattern
        });
    });

    return paths;
}
