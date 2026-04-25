import { MetadataRoute } from 'next'
import { REGIONS, getAllPaths } from './data/regions'

const BASE_URL = 'https://www.brecomperu.com' // Replace with actual domain

export default function sitemap(): MetadataRoute.Sitemap {
    const paths = getAllPaths();

    const dynamicRoutes = paths.map(({ region, slug }) => ({
        url: `${BASE_URL}/${region}/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    const regionRoutes = Object.keys(REGIONS).map((region) => ({
        url: `${BASE_URL}/${region}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1.0,
    }));

    // Add core sections for each region
    const sectionRoutes: any[] = [];
    Object.keys(REGIONS).forEach((region) => {
        const sections = region === 'us' 
            ? ['industries', 'services', 'about', 'contact', 'casos']
            : ['industrias', 'servicios', 'nosotros', 'contacto', 'casos'];
        
        sections.forEach(section => {
            sectionRoutes.push({
                url: `${BASE_URL}/${region}/${section}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.9,
            });
        });
    });

    return [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        ...regionRoutes,
        ...sectionRoutes,
        ...dynamicRoutes,
    ]
}
