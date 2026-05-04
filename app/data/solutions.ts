export interface SolutionFile {
    name: string;
    file: string;
}

export interface SolutionDemo {
    id: string;
    title: string;
    industry: string;
    description: string;
    path: string; // Main folder or path
    entryFile: string; // Specific HTML file (e.g., index.html or starter.html)
    demos?: SolutionFile[];
    tags: string[];
    featured?: boolean;
}

export const SOLUTIONS: SolutionDemo[] = [
    {
        id: "agro-andinacorp",
        title: "AgroTech Ecosystem",
        industry: "Agroindustrial",
        description: "Soluciones integrales para el sector agrícola: desde consultoría corporativa hasta comercio electrónico B2B.",
        path: "agriculture",
        entryFile: "exporter/standard/essential.html",
        demos: [
            { name: "Andina Corp (Essential)", file: "exporter/standard/essential.html" },
            { name: "PeruAgro Export (B2B)", file: "exporter/standard/growth.html" },
            { name: "Andina Corp (Custom)", file: "exporter/custom/andina-corp/essential.html" },
            { name: "Agro General", file: "general/standard/essential.html" },
            { name: "Agro Exponential", file: "exporter/standard/exponential.html" }
        ],
        tags: ["Agro", "Ecommerce", "Export"]
    },
    {
        id: "telecom-business",
        title: "Telecom Enterprise",
        industry: "Telecom",
        description: "Infraestructura de telecomunicaciones avanzada, radiocomunicación y redes de fibra óptica.",
        path: "telecom",
        entryFile: "general/standard/essential.html",
        demos: [
            { name: "TEC PERUVIAN (Essential)", file: "general/standard/essential.html" }
        ],
        tags: ["Telecom", "Connectivity", "Infrastructure"]
    },
    {
        id: "beauty-booking",
        title: "Beauty & Spa Booking",
        industry: "Beauty",
        description: "Plataforma de gestión para centros de estética, spas y salones de belleza con sistema de reservas.",
        path: "beauty",
        entryFile: "general/standard/escential.html",
        demos: [
            { name: "Beauty Essential", file: "general/standard/escential.html" },
            { name: "Beauty Growth", file: "general/standard/growth.html" },
            { name: "Beauty Exponential", file: "general/standard/exponential.html" }
        ],
        tags: ["Booking", "Beauty", "SaaS"]
    },
    {
        id: "legal-business",
        title: "Legal Business Hub",
        industry: "Legal",
        description: "Portal corporativo para servicios legales especializados en sector inmobiliario y laboral.",
        path: "legal",
        entryFile: "real-estate/standard/essential.html",
        demos: [
            { name: "Inmobiliario (Essential)", file: "real-estate/standard/essential.html" },
            { name: "Inmobiliario (Growth)", file: "real-estate/standard/growth.html" },
            { name: "Inmobiliario (Exp)", file: "real-estate/standard/exponential.html" },
            { name: "Laboral (Essential)", file: "labor/standard/essential.html" },
            { name: "Laboral (Growth)", file: "labor/standard/growth.html" }
        ],
        tags: ["Legal", "Corporate", "Compliance"]
    },
    {
        id: "industrial-safety",
        title: "Seguridad Industrial",
        industry: "Industrial",
        description: "Sistemas de gestión de seguridad, inspección técnica y prevención de riesgos laborales.",
        path: "industrial-safety",
        entryFile: "general/standard/essential.html",
        demos: [
            { name: "Seguridad General", file: "general/standard/essential.html" },
            { name: "FireCenter (Essential)", file: "firecenter/standard/essential.html" },
            { name: "FireCenter (Growth)", file: "firecenter/standard/growth.html" },
            { name: "FireCenter (Exp)", file: "firecenter/standard/exponential.html" }
        ],
        tags: ["Safety", "Industrial", "Compliance"]
    },
    {
        id: "farmacia-saas",
        title: "SaaS Farmacéutico",
        industry: "Health",
        description: "Soluciones digitales para farmacias y retail de salud con integración de APIs.",
        path: "pharmacy",
        entryFile: "general/standard/growth.html",
        tags: ["SaaS", "Health", "API"],
        featured: true
    },
    {
        id: "cleaning-services",
        title: "Servicios de Limpieza",
        industry: "Industrial",
        description: "Gestión operativa para empresas de limpieza industrial y mantenimiento de instalaciones.",
        path: "cleaning",
        entryFile: "general/standard/essential.html",
        tags: ["Industrial", "Cleaning", "Operations"]
    }
];



