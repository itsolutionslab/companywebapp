import { MetadataRoute } from 'next'
import { REGIONS, getAllPaths } from './data/regions'

const BASE_URL = 'https://www.brecomperu.com'

export default function sitemap(): MetadataRoute.Sitemap {
    const paths = getAllPaths();

    // Mapping function for language alternatives
    const getRegionLangObj = (slugEn: string, slugEs: string) => ({
        'en-US': `${BASE_URL}/us/${slugEn}`,
        'es-PE': `${BASE_URL}/pe/${slugEs}`,
        'es-419': `${BASE_URL}/latam/${slugEs}`,
        'x-default': `${BASE_URL}/us/${slugEn}`,
    });

    const dynamicRoutes = paths.map(({ region, slug }) => {
        const langObj: Record<string, string> = {};
        if (region === 'us') langObj['en-US'] = `${BASE_URL}/us/${slug}`;
        if (region === 'pe') langObj['es-PE'] = `${BASE_URL}/pe/${slug}`;
        if (region === 'latam') langObj['es-419'] = `${BASE_URL}/latam/${slug}`;
        langObj['x-default'] = `${BASE_URL}/us/${slug}`;

        return {
            url: `${BASE_URL}/${region}/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
            alternates: {
                languages: langObj
            }
        };
    });

    const regionRoutes = Object.keys(REGIONS).map((region) => ({
        url: `${BASE_URL}/${region}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1.0,
        alternates: {
            languages: {
                'en-US': `${BASE_URL}/us`,
                'es-PE': `${BASE_URL}/pe`,
                'es-419': `${BASE_URL}/latam`,
                'x-default': `${BASE_URL}/us`,
            }
        }
    }));

    // Add core sections for each region
    const sectionRoutes: any[] = [];
    
    // Define the core translations
    const coreMap = [
        { en: 'industries', es: 'industrias' },
        { en: 'services', es: 'servicios' },
        { en: 'about', es: 'nosotros' },
        { en: 'contact', es: 'contacto' },
        { en: 'casos', es: 'casos' }
    ];

    Object.keys(REGIONS).forEach((region) => {
        coreMap.forEach(map => {
            const currentSlug = region === 'us' ? map.en : map.es;
            sectionRoutes.push({
                url: `${BASE_URL}/${region}/${currentSlug}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.9,
                alternates: {
                    languages: getRegionLangObj(map.en, map.es)
                }
            });
        });
    });

    return [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
            alternates: {
                languages: {
                    'en-US': `${BASE_URL}/us`,
                    'es-PE': `${BASE_URL}/pe`,
                    'es-419': `${BASE_URL}/latam`,
                    'x-default': `${BASE_URL}/us`,
                }
            }
        },
        ...regionRoutes,
        ...sectionRoutes,
        ...dynamicRoutes,
    ]
}
