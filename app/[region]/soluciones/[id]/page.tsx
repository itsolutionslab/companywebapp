import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SOLUTIONS } from '@/app/data/solutions';
import SolutionViewer from '@/app/components/solutions/SolutionViewer';

type Props = {
    params: Promise<{ region: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const solution = SOLUTIONS.find(s => s.id === id);

    if (!solution) return { title: 'Solution Not Found' };

    return {
        title: `${solution.title} - Demo Interactiva | Brecomperu`,
        description: solution.description,
        keywords: solution.tags.join(', '),
        openGraph: {
            title: solution.title,
            description: solution.description,
            type: 'website'
        }
    };
}

export async function generateStaticParams() {
    const regions = ['us', 'latam', 'pe', 'es'];
    const paths = [];

    for (const region of regions) {
        for (const solution of SOLUTIONS) {
            paths.push({ region, id: solution.id });
        }
    }

    return paths;
}

export default async function SolutionDetailPage({ params }: Props) {
    const { region, id } = await params;
    const solution = SOLUTIONS.find(s => s.id === id);

    if (!solution || !['us', 'latam', 'pe', 'es'].includes(region)) {
        notFound();
    }

    return <SolutionViewer solution={solution} region={region} />;
}
