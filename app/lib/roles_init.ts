
import { db } from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const ROLES_INITIAL_DATA = {
    'admin': {
        id: 'admin',
        pillar: 'ADMIN',
        label: 'Administrador',
        level: 10,
        allowedPaths: ['/admin/panel', '/admin/prospectos', '/admin/mensajes', '/admin/reservas', '/admin/horarios', '/admin/usuarios', '/admin/configuracion']
    },
    'owneradmin': {
        id: 'owneradmin',
        pillar: 'ADMIN',
        label: 'Owner',
        level: 11,
        allowedPaths: ['/admin/panel', '/admin/prospectos', '/admin/mensajes', '/admin/reservas', '/admin/horarios', '/admin/usuarios', '/admin/configuracion']
    },
    'GROWTH_L0': { id: 'GROWTH_L0', pillar: 'GROWTH', label: 'Growth Intern', level: 0, allowedPaths: ['/admin/prospectos', '/admin/mensajes', '/admin/reservas'] },
    'GROWTH_L1': { id: 'GROWTH_L1', pillar: 'GROWTH', label: 'SDR', level: 1, allowedPaths: ['/admin/prospectos', '/admin/mensajes', '/admin/reservas'] },
    'GROWTH_L2': { id: 'GROWTH_L2', pillar: 'GROWTH', label: 'BDR', level: 2, allowedPaths: ['/admin/prospectos', '/admin/mensajes', '/admin/reservas'] },
    'GROWTH_L3': { id: 'GROWTH_L3', pillar: 'GROWTH', label: 'BDR Associate', level: 3, allowedPaths: ['/admin/prospectos', '/admin/mensajes', '/admin/reservas'] },
    'GROWTH_L4': { id: 'GROWTH_L4', pillar: 'GROWTH', label: 'Solutions Consultant', level: 4, allowedPaths: ['/admin/prospectos', '/admin/mensajes', '/admin/reservas'] },
    'GROWTH_L5': { id: 'GROWTH_L5', pillar: 'GROWTH', label: 'Senior Account Executive', level: 5, allowedPaths: ['/admin/prospectos', '/admin/mensajes', '/admin/reservas'] },
    'GROWTH_L6': { id: 'GROWTH_L6', pillar: 'GROWTH', label: 'Growth Lead', level: 6, allowedPaths: ['/admin/prospectos', '/admin/mensajes', '/admin/reservas'] },
    
    'ENG_L0': { id: 'ENG_L0', pillar: 'ENGINEERING', label: 'Engineering Intern', level: 0, allowedPaths: ['/admin/prospectos'] },
    'ENG_L1': { id: 'ENG_L1', pillar: 'ENGINEERING', label: 'Associate Software Engineer', level: 1, allowedPaths: ['/admin/prospectos'] },
    'ENG_L2': { id: 'ENG_L2', pillar: 'ENGINEERING', label: 'Software Engineer', level: 2, allowedPaths: ['/admin/prospectos'] },
    'ENG_L3': { id: 'ENG_L3', pillar: 'ENGINEERING', label: 'Senior Software Engineer', level: 3, allowedPaths: ['/admin/prospectos'] },
    'ENG_L4': { id: 'ENG_L4', pillar: 'ENGINEERING', label: 'Solutions Architect', level: 4, allowedPaths: ['/admin/prospectos', '/admin/mensajes', '/admin/reservas'] },
    
    'CLOUD_L0': { id: 'CLOUD_L0', pillar: 'CLOUD', label: 'Cloud Operations Intern', level: 0, allowedPaths: ['/admin/prospectos'] },
    'CLOUD_L1': { id: 'CLOUD_L1', pillar: 'CLOUD', label: 'Junior DevOps Engineer', level: 1, allowedPaths: ['/admin/prospectos'] },
    'CLOUD_L2': { id: 'CLOUD_L2', pillar: 'CLOUD', label: 'Cloud Engineer', level: 2, allowedPaths: ['/admin/prospectos'] },
    'CLOUD_L3': { id: 'CLOUD_L3', pillar: 'CLOUD', label: 'Senior DevOps / SRE', level: 3, allowedPaths: ['/admin/prospectos'] },
    'CLOUD_L4': { id: 'CLOUD_L4', pillar: 'CLOUD', label: 'Platform Lead', level: 4, allowedPaths: ['/admin/prospectos'] },
    'CLOUD_L5': { id: 'CLOUD_L5', pillar: 'CLOUD', label: 'Principal Cloud Architect', level: 5, allowedPaths: ['/admin/prospectos'] },

    'CS_L0': { id: 'CS_L0', pillar: 'CUSTOMER_SUCCESS', label: 'Customer Support Intern', level: 0, allowedPaths: ['/admin/prospectos', '/admin/mensajes'] },
    'CS_L1': { id: 'CS_L1', pillar: 'CUSTOMER_SUCCESS', label: 'Customer Success Associate', level: 1, allowedPaths: ['/admin/prospectos', '/admin/mensajes'] },
    'CS_L2': { id: 'CS_L2', pillar: 'CUSTOMER_SUCCESS', label: 'Customer Success Specialist', level: 2, allowedPaths: ['/admin/prospectos', '/admin/mensajes'] },
    'CS_L3': { id: 'CS_L3', pillar: 'CUSTOMER_SUCCESS', label: 'Technical Customer Success Manager', level: 3, allowedPaths: ['/admin/prospectos', '/admin/mensajes'] },
};

export const initializeRoles = async () => {
    const rolesRef = doc(db, "settings", "roles");
    const docSnap = await getDoc(rolesRef);
    if (!docSnap.exists()) {
        await setDoc(rolesRef, ROLES_INITIAL_DATA);
        console.log("Roles initialized successfully");
    }
};
