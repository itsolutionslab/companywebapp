// ESTE ARCHIVO ES GENERADO AUTOMÁTICAMENTE. NO EDITAR DIRECTAMENTE.
// Ejecuta 'node scripts/sync-solutions.mjs' para actualizar.

export interface SolutionFile {
    name: string;
    file: string;
}

export interface SolutionDemo {
    id: string;
    title: string;
    industry: string;
    description: string;
    path: string;
    entryFile: string;
    demos?: SolutionFile[];
    tags: string[];
    featured?: boolean;
}

export const SOLUTIONS: SolutionDemo[] = [
    {
        "id": "agriculture",
        "title": "Agriculture",
        "industry": "Agriculture",
        "description": "Soluciones especializadas para el sector Agriculture.",
        "path": "agriculture",
        "entryFile": "exporter/custom/andina-corp/essential.html",
        "demos": [
            {
                "name": "Exporter Custom Andina Corp Essential",
                "file": "exporter/custom/andina-corp/essential.html"
            },
            {
                "name": "Exporter Custom Cepde Cooperativas",
                "file": "exporter/custom/cepde/cooperativas.html"
            },
            {
                "name": "Exporter Standard Essential",
                "file": "exporter/standard/essential.html"
            },
            {
                "name": "Exporter Standard Exponential",
                "file": "exporter/standard/exponential.html"
            },
            {
                "name": "Exporter Standard Growth",
                "file": "exporter/standard/growth.html"
            },
            {
                "name": "General Standard Essential",
                "file": "general/standard/essential.html"
            }
        ],
        "tags": [
            "Agriculture",
            "Enterprise"
        ]
    },
    {
        "id": "beauty",
        "title": "Beauty",
        "industry": "Beauty",
        "description": "Soluciones especializadas para el sector Beauty.",
        "path": "beauty",
        "entryFile": "general/standard/escential.html",
        "demos": [
            {
                "name": "General Standard Escential",
                "file": "general/standard/escential.html"
            },
            {
                "name": "General Standard Exponential",
                "file": "general/standard/exponential.html"
            },
            {
                "name": "General Standard Growth",
                "file": "general/standard/growth.html"
            }
        ],
        "tags": [
            "Beauty",
            "Enterprise"
        ]
    },
    {
        "id": "cleaning",
        "title": "Cleaning",
        "industry": "Cleaning",
        "description": "Soluciones especializadas para el sector Cleaning.",
        "path": "cleaning",
        "entryFile": "general/standard/essential.html",
        "demos": [
            {
                "name": "General Standard Essential",
                "file": "general/standard/essential.html"
            }
        ],
        "tags": [
            "Cleaning",
            "Enterprise"
        ]
    },
    {
        "id": "industrial-safety",
        "title": "Industrial Safety",
        "industry": "Industrial Safety",
        "description": "Soluciones especializadas para el sector Industrial Safety.",
        "path": "industrial-safety",
        "entryFile": "firecenter/standard/essential.html",
        "demos": [
            {
                "name": "Firecenter Standard Essential",
                "file": "firecenter/standard/essential.html"
            },
            {
                "name": "Firecenter Standard Exponential",
                "file": "firecenter/standard/exponential.html"
            },
            {
                "name": "Firecenter Standard Growth",
                "file": "firecenter/standard/growth.html"
            },
            {
                "name": "General Standard Essential",
                "file": "general/standard/essential.html"
            }
        ],
        "tags": [
            "Industrial Safety",
            "Enterprise"
        ]
    },
    {
        "id": "legal",
        "title": "Legal",
        "industry": "Legal",
        "description": "Soluciones especializadas para el sector Legal.",
        "path": "legal",
        "entryFile": "general/custom/rasco-gutierrez/essential.html",
        "demos": [
            {
                "name": "General Custom Rasco Gutierrez Essential",
                "file": "general/custom/rasco-gutierrez/essential.html"
            },
            {
                "name": "General Custom Rasco Gutierrez Exponential",
                "file": "general/custom/rasco-gutierrez/exponential.html"
            },
            {
                "name": "Labor Standard Essential",
                "file": "labor/standard/essential.html"
            },
            {
                "name": "Labor Standard Exponential",
                "file": "labor/standard/exponential.html"
            },
            {
                "name": "Labor Standard Growth",
                "file": "labor/standard/growth.html"
            },
            {
                "name": "Real Estate Standard Essential",
                "file": "real-estate/standard/essential.html"
            },
            {
                "name": "Real Estate Standard Exponential",
                "file": "real-estate/standard/exponential.html"
            },
            {
                "name": "Real Estate Standard Growth",
                "file": "real-estate/standard/growth.html"
            }
        ],
        "tags": [
            "Legal",
            "Enterprise"
        ]
    },
    {
        "id": "pharmacy",
        "title": "Pharmacy",
        "industry": "Pharmacy",
        "description": "Soluciones especializadas para el sector Pharmacy.",
        "path": "pharmacy",
        "entryFile": "general/standard/growth.html",
        "demos": [
            {
                "name": "General Standard Growth",
                "file": "general/standard/growth.html"
            }
        ],
        "tags": [
            "Pharmacy",
            "Enterprise"
        ]
    },
    {
        "id": "telecom",
        "title": "Telecom",
        "industry": "Telecom",
        "description": "Soluciones especializadas para el sector Telecom.",
        "path": "telecom",
        "entryFile": "general/standard/essential.html",
        "demos": [
            {
                "name": "General Standard Essential",
                "file": "general/standard/essential.html"
            }
        ],
        "tags": [
            "Telecom",
            "Enterprise"
        ]
    }
];
