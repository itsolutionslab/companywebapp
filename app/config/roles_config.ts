
export type Pillar = 'GROW' | 'OPERATIONS' | 'SUPPORT' | 'ADMIN';

export interface RoleInfo {
    id: string;
    pillar: Pillar;
    label: string;
    level: number;
    allowedPaths: string[];
}

export const ROLES_CONFIG: Record<string, RoleInfo> = {
    'admin': {
        id: 'admin',
        pillar: 'ADMIN',
        label: 'Administrador',
        level: 10,
        allowedPaths: ['/admin/panel', '/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas', '/admin/horarios', '/admin/usuarios', '/admin/configuracion']
    },
    'owner': {
        id: 'owner',
        pillar: 'ADMIN',
        label: 'Owner',
        level: 11,
        allowedPaths: ['/admin/panel', '/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas', '/admin/horarios', '/admin/usuarios', '/admin/configuracion']
    },
    'owneradmin': {
        id: 'owneradmin',
        pillar: 'ADMIN',
        label: 'Owner',
        level: 11,
        allowedPaths: ['/admin/panel', '/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas', '/admin/horarios', '/admin/usuarios', '/admin/configuracion']
    },
    // GROW (Comercial + Marketing + Preventa)
    'GROW_L0': { id: 'GROW_L0', pillar: 'GROW', label: 'Intern de Crecimiento', level: 0, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    'GROW_L1': { id: 'GROW_L1', pillar: 'GROW', label: 'SDR (Sales Development Rep)', level: 1, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    'GROW_L2': { id: 'GROW_L2', pillar: 'GROW', label: 'BDR (Business Development Rep)', level: 2, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    'GROW_L3': { id: 'GROW_L3', pillar: 'GROW', label: 'Account Executive', level: 3, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    'GROW_L4': { id: 'GROW_L4', pillar: 'GROW', label: 'Solutions Consultant', level: 4, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    'GROW_L5': { id: 'GROW_L5', pillar: 'GROW', label: 'Growth Lead', level: 5, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    
    // OPERATIONS (Delivery + Ingeniería + Project Management)
    'OPS_L0': { id: 'OPS_L0', pillar: 'OPERATIONS', label: 'Engineering Intern', level: 0, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/panel'] },
    'OPS_L1': { id: 'OPS_L1', pillar: 'OPERATIONS', label: 'Junior Developer', level: 1, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/panel'] },
    'OPS_L2': { id: 'OPS_L2', pillar: 'OPERATIONS', label: 'Software Engineer', level: 2, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/panel'] },
    'OPS_L3': { id: 'OPS_L3', pillar: 'OPERATIONS', label: 'Project Manager / Scrum Master', level: 3, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/panel'] },
    'OPS_L4': { id: 'OPS_L4', pillar: 'OPERATIONS', label: 'Solutions Architect', level: 4, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/panel'] },
    'OPS_L5': { id: 'OPS_L5', pillar: 'OPERATIONS', label: 'Delivery Director', level: 5, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/panel', '/admin/usuarios'] },
    
    // SUPPORT (Customer Success + Postventa + Soporte)
    'SUP_L0': { id: 'SUP_L0', pillar: 'SUPPORT', label: 'Support Intern', level: 0, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes'] },
    'SUP_L1': { id: 'SUP_L1', pillar: 'SUPPORT', label: 'Support Agent', level: 1, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes'] },
    'SUP_L2': { id: 'SUP_L2', pillar: 'SUPPORT', label: 'Customer Success Specialist', level: 2, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes'] },
    'SUP_L3': { id: 'SUP_L3', pillar: 'SUPPORT', label: 'CS Manager', level: 3, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes'] },
    
    // CONSULTORIA & ESTRATEGIA (Cross-Domain)
    'CONSULTOR': { id: 'CONSULTOR', pillar: 'OPERATIONS', label: 'Consultor Senior (Cross-Domain)', level: 6, allowedPaths: ['/admin/panel', '/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },

    // --- ALIASES PARA COMPATIBILIDAD (Legacy) ---
    'GROWTH_L0': { id: 'GROW_L0', pillar: 'GROW', label: 'Intern de Crecimiento', level: 0, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    'GROWTH_L1': { id: 'GROW_L1', pillar: 'GROW', label: 'SDR (Sales Development Rep)', level: 1, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    'GROWTH_L2': { id: 'GROW_L2', pillar: 'GROW', label: 'BDR (Business Development Rep)', level: 2, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    'GROWTH_L3': { id: 'GROW_L3', pillar: 'GROW', label: 'Account Executive', level: 3, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    'GROWTH_L4': { id: 'GROW_L4', pillar: 'GROW', label: 'Solutions Consultant', level: 4, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    'GROWTH_L5': { id: 'GROW_L5', pillar: 'GROW', label: 'Growth Lead', level: 5, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/reservas'] },
    
    'ENG_L0': { id: 'OPS_L0', pillar: 'OPERATIONS', label: 'Engineering Intern', level: 0, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/panel'] },
    'ENG_L1': { id: 'OPS_L1', pillar: 'OPERATIONS', label: 'Junior Developer', level: 1, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/panel'] },
    'ENG_L2': { id: 'OPS_L2', pillar: 'OPERATIONS', label: 'Software Engineer', level: 2, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/panel'] },
    'ENG_L3': { id: 'OPS_L3', pillar: 'OPERATIONS', label: 'Project Manager / Scrum Master', level: 3, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/panel'] },
    'ENG_L4': { id: 'OPS_L4', pillar: 'OPERATIONS', label: 'Solutions Architect', level: 4, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes', '/admin/panel'] },
    'ENG_L5': { id: 'OPS_L5', pillar: 'OPERATIONS', label: 'Delivery Director', level: 5, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/panel', '/admin/usuarios'] },

    'CLOUD_L0': { id: 'OPS_L0', pillar: 'OPERATIONS', label: 'Cloud Intern', level: 0, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/panel'] },
    'CLOUD_L1': { id: 'OPS_L1', pillar: 'OPERATIONS', label: 'Cloud Junior', level: 1, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/panel'] },
    
    'CS_L0': { id: 'SUP_L0', pillar: 'SUPPORT', label: 'Support Intern', level: 0, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes'] },
    'CS_L1': { id: 'SUP_L1', pillar: 'SUPPORT', label: 'Support Agent', level: 1, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes'] },
    'CS_L2': { id: 'SUP_L2', pillar: 'SUPPORT', label: 'Customer Success Specialist', level: 2, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes'] },
    'CS_L3': { id: 'SUP_L3', pillar: 'SUPPORT', label: 'CS Manager', level: 3, allowedPaths: ['/admin/prospectos', '/admin/cotizaciones', '/admin/mensajes'] },
};
