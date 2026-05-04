export interface SolutionDemo {
    id: string;
    title: string;
    industry: string;
    description: string;
    path: string; // Main folder or path
    entryFile: string; // Specific HTML file (e.g., index.html or starter.html)
    tags: string[];
    featured?: boolean;
}

export const SOLUTIONS: SolutionDemo[] = [
    {
        id: "agro-andinacorp",
        title: "AgroTech Ecosystem",
        industry: "Agroindustrial",
        description: "Plataforma integral para startups agrotech, gestión de proyectos y ecommerce agrícola.",
        path: "agro",
        entryFile: "index.html",
        tags: ["Agro", "Ecommerce", "Management"]
    },
    {
        id: "beauty-booking",
        title: "Beauty & Spa Booking",
        industry: "Beauty",
        description: "Sistema de reservas avanzado con gestión de pagos y experiencia de usuario optimizada.",
        path: "beauty",
        entryFile: "index.html",
        tags: ["Booking", "Beauty", "Payments"]
    },
    {
        id: "industrial-cleaning",
        title: "CleanMax Industrial",
        industry: "Industrial",
        description: "Solución especializada para servicios de limpieza industrial y mantenimiento técnico.",
        path: "clean",
        entryFile: "cleanmax-starter.html",
        tags: ["Industrial", "Cleaning", "Operations"]
    },
    {
        id: "legal-business",
        title: "Legal Business Hub",
        industry: "Legal",
        description: "Portal corporativo para firmas de abogados con gestión de servicios y accidentes laborales.",
        path: "legal/business",
        entryFile: "index.html",
        tags: ["Legal", "Corporate", "Compliance"]
    },
    {
        id: "legal-enterprise",
        title: "Legal Enterprise Suite",
        industry: "Legal",
        description: "Soluciones de auditoría legal y cumplimiento para grandes corporaciones con integración de IA.",
        path: "legal/enterprise",
        entryFile: "index.html",
        tags: ["Legal", "Enterprise", "AI"]
    },
    {
        id: "farmacia-saas",
        title: "SaaS Farmacéutico API",
        industry: "Health",
        description: "Propuesta de valor para integración de APIs en el sector farmacéutico y retail salud.",
        path: "farmaciasenlinea-propuestas",
        entryFile: "api-farmacias-saas.html",
        tags: ["SaaS", "API", "Health"],
        featured: true
    },
    {
        id: "seguridad-industrial",
        title: "Seguridad & Inspección",
        industry: "Industrial",
        description: "Dashboards de inspección, cotizadores y sistemas LMS para seguridad industrial.",
        path: "seg-industrial",
        entryFile: "solucion1.html",
        tags: ["Safety", "Industrial", "LMS"]
    },
    {
        id: "telecom-business",
        title: "Telecom Enterprise",
        industry: "Telecom",
        description: "Solución de conectividad e infraestructura para el sector de telecomunicaciones.",
        path: "telecom",
        entryFile: "business-telcom.html",
        tags: ["Telecom", "Connectivity", "B2B"]
    }
];
