
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
    role: 'client' | 'staff' | 'admin' | 'owneradmin' | 'employ';
    created_at: any;
}

export interface BusinessProfile {
    schedules: Record<string, { open: string; close: string; closed: boolean }>;
    timeInterval: number;
    tax_percentage?: number;
}
