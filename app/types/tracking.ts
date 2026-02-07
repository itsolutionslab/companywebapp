export type LeadStatus =
    | 'LEAD_NEW'
    | 'CONTACTED'
    | 'MEETING_SCHEDULED'
    | 'QUOTATION_SENT'
    | 'QUOTATION_APPROVED'
    | 'PROJECT_PLANNING'
    | 'WAITING_DOWNPAYMENT'
    | 'DOWNPAYMENT_RECEIVED'
    | 'PROJECT_STARTING'
    | 'IN_PROGRESS'
    | 'TESTING'
    | 'COMPLETED'
    | 'DELIVERY_PENDING'
    | 'DELIVERED'
    | 'SUPPORT_ACTIVE'
    | 'SUPPORT_ENDED'
    | 'CLOSED_LOST';

export interface StatusHistory {
    status: LeadStatus;
    timestamp: string; // ISO
    notes?: string;
}

export interface LeadData {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    project_desc?: string;
    file_url?: string;
    service_interest?: string;
    budget_range?: string;
    region?: string;
}

export interface LeadKPIs {
    session_duration: number; // seconds
    clicks_count: number;
    pages_visited?: number;
}

export interface Lead {
    lead_id: string; // UUID
    status_flow: {
        current: LeadStatus;
        history: StatusHistory[];
    };
    audit_logs: {
        created_at: any; // Firestore Timestamp
        updated_at: any;
        ip: string;
        user_agent: string;
        geo_location?: {
            city?: string;
            country?: string;
            region?: string;
        };
    };
    source_attribution: {
        utm_source?: string | null;
        utm_medium?: string | null;
        utm_campaign?: string | null;
        utm_term?: string | null;
        utm_content?: string | null;
        referrer?: string | null;
        landing_page?: string; // US_LANDING, LATAM_LANDING, PE_LANDING
    };
    data: LeadData;
    kpis: LeadKPIs;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface InteractionEvent {
    id?: string;
    event_type: 'click_whatsapp' | 'start_call' | 'submit_form' | 'file_uploaded' | 'view_page' | 'click_cta';
    timestamp: any;
    session_id: string;
    lead_id?: string | null; // If known
    metadata: Record<string, any>;
    url: string;
}
