export interface RubroInfo {
  name: string;
  subrubros: string[];
}

export const RUBROS_CATALOG: Record<string, RubroInfo> = {
  TECNOLOGIA: {
    name: "Tecnología e informática",
    subrubros: ["Software y desarrollo", "Ciberseguridad", "Cloud y hosting", "Telecomunicaciones"]
  },
  SERVICIOS_PROFESIONALES: {
    name: "Servicios profesionales",
    subrubros: ["Consultoría empresarial", "Contabilidad y auditoría", "Legal y notaría"]
  },
  FINANZAS: {
    name: "Finanzas y seguros",
    subrubros: ["Banca y fintech"]
  },
  SALUD: {
    name: "Salud y bienestar",
    subrubros: ["Clínicas y hospitales", "Laboratorios"]
  },
  EDUCACION: {
    name: "Educación y capacitación",
    subrubros: []
  },
  INDUSTRIA: {
    name: "Industria y manufactura",
    subrubros: ["Alimentos y bebidas", "Agroindustria"]
  },
  COMERCIO: {
    name: "Comercio y retail",
    subrubros: ["E-commerce"]
  },
  CONSTRUCCION: {
    name: "Construcción e inmobiliaria",
    subrubros: []
  },
  TRANSPORTE: {
    name: "Transporte y logística",
    subrubros: ["Comercio exterior e importación/exportación"]
  },
  MARKETING: {
    name: "Marketing y publicidad",
    subrubros: []
  },
  TURISMO: {
    name: "Turismo y hospitalidad",
    subrubros: []
  },
  ENERGIA: {
    name: "Energía y servicios públicos",
    subrubros: []
  },
  MINERIA: {
    name: "Minería y extracción",
    subrubros: []
  },
  AGRICULTURA: {
    name: "Agricultura y ganadería",
    subrubros: []
  },
  SEGURIDAD: {
    name: "Seguridad y vigilancia",
    subrubros: []
  },
  RECURSOS_HUMANOS: {
    name: "Recursos humanos",
    subrubros: []
  },
  LIMPIEZA: {
    name: "Limpieza y mantenimiento",
    subrubros: []
  },
  BELLEZA: {
    name: "Belleza y cuidado personal",
    subrubros: []
  },
  HOGAR: {
    name: "Hogar y jardinería",
    subrubros: []
  },
  MEDIOS: {
    name: "Medios, comunicación y audiovisual",
    subrubros: []
  },
  EVENTOS: {
    name: "Eventos y entretenimiento",
    subrubros: []
  },
  ESTADO: {
    name: "Estado e instituciones públicas",
    subrubros: []
  },
  ONG: {
    name: "ONG y asociaciones",
    subrubros: []
  },
  INVESTIGACION: {
    name: "Investigación y desarrollo",
    subrubros: []
  },
  MEDIO_AMBIENTE: {
    name: "Medio ambiente y residuos",
    subrubros: []
  }
};

// Subrubros útiles para vender mejor (aplicables de forma transversal)
export const SUBRUBROS_VENTAS = [
  "Desarrollo web",
  "Desarrollo móvil",
  "ERP y sistemas administrativos",
  "Automatización de procesos",
  "IA aplicada a negocios",
  "Mesa de ayuda y soporte TI",
  "Infraestructura y redes",
  "Migración a la nube",
  "Integración de APIs",
  "Marketing digital",
  "Generación de leads",
  "E-commerce y marketplaces",
  "Facturación electrónica",
  "Gestión documental",
  "CRM y ventas",
  "Analítica y BI"
];

// Tipo de empresa (Constitución)
export const TIPO_EMPRESA_OPTIONS = [
  "Persona natural con negocio",
  "Empresa formal constituida",
  "Empresa pública",
  "Startup",
  "Pyme"
];

// Tamaño de la empresa
export const TAMANO_EMPRESA_OPTIONS = [
  "Microempresa",
  "Pequeña empresa",
  "Mediana empresa",
  "Gran empresa"
];

// Zona geográfica
export const ZONA_GEOGRAFICA_OPTIONS = [
  "Local",
  "Regional",
  "Nacional",
  "Multinacional"
];

// Prioridad / Clasificación del lead
export const PRIORIDAD_LEAD_OPTIONS = [
  { value: "caliente", label: "Caliente", color: "#ef4444" },
  { value: "tibio", label: "Tibio", color: "#f97316" },
  { value: "frio", label: "Frío", color: "#3b82f6" }
];
