
export interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: string | number;
    active: boolean;
    service_category?: 'woman' | 'men' | 'additional';
    service_category_color?: string;
    image_url?: string;
}

export interface BookingData {
    id: string;
    customerName: string; // Changed from clientName to match usage
    customerEmail: string;
    customerPhone: string;
    date: string;
    time: string;
    services: Service[];
    totalPrice: number;
    status: 'pending' | 'confirmed' | 'attended' | 'cancelled';
    address?: string;
    history?: any[];
}

export interface UserProfile {
    uid: string;
    email: string;
    full_name: string;
    role: 'client' | 'staff' | 'admin' | 'owneradmin' | 'employ' | 
          'GROWTH_L0' | 'GROWTH_L1' | 'GROWTH_L2' | 'GROWTH_L3' | 'GROWTH_L4' | 'GROWTH_L5' | 'GROWTH_L6' |
          'ENG_L0' | 'ENG_L1' | 'ENG_L2' | 'ENG_L3' | 'ENG_L4' |
          'CLOUD_L0' | 'CLOUD_L1' | 'CLOUD_L2' | 'CLOUD_L3' | 'CLOUD_L4' | 'CLOUD_L5' |
          'CS_L0' | 'CS_L1' | 'CS_L2' | 'CS_L3';
    created_at: any;
    last_password_change?: any;
    team_id?: string;
}

export interface Team {
    id: string;
    name: string;
    pillar: 'GROW' | 'OPERATIONS' | 'SUPPORT';
    manager_id: string; // The uid of the team manager
    member_ids: string[]; // List of uids of the team members
    created_at: any;
}

export interface BusinessProfile {
    schedules: Record<string, { open: string; close: string; closed: boolean }>;
    timeInterval: number;
    tax_percentage?: number;
}
