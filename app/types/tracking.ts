export type LeadStatus =
    | 'NEW'
    | 'QUALIFIED'
    | 'CONTACTED'
    | 'DISCOVERY_SCHEDULED'
    | 'DISCOVERY_COMPLETED'
    | 'PROPOSAL_PREPARING'
    | 'PROPOSAL_SENT'
    | 'NEGOTIATION'
    | 'WON'
    | 'LOST'
    | 'ON_HOLD'
    | 'KICK_OFF';

export interface LeadEvent {
    id: string;
    type:
    | 'LEAD_CREATED'
    | 'QUALIFIED'
    | 'CONTACTED'
    | 'MEETING_SCHEDULED'
    | 'MEETING_COMPLETED'
    | 'PROPOSAL_SENT'
    | 'STATUS_CHANGED'
    | 'NOTE_ADDED'
    | 'REQUIREMENTS_DEFINED'
    | 'REJECTED'
    | 'KICK_OFF_STARTED';
    description: string;
    timestamp: any; // Firestore Timestamp
    created_by?: string; // Admin user ID
    metadata?: Record<string, any>;
}

export interface StatusHistory {
    status: LeadStatus;
    timestamp: string; // ISO
    notes?: string;
}

export interface LeadData {
    name?: string;
    company?: string;
    website?: string;
    role?: string;
    email?: string;
    phone?: string;
    project_desc?: string;
    objectives?: string[];
    stage?: string;
    timeline?: string;
    investment_level?: string;
    impact?: string;
    decision_maker?: string;
    file_url?: string;
    service_interest?: string; // Legacy
    service_interests?: string[]; // New multiselect
    budget_range?: string; // Legacy?
    region?: string;
    origin?: 'web_page' | 'admin_panel';
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
    events?: LeadEvent[]; // Chronological events
    owner_id?: string; // Assigned admin UID
    value_estimate?: number; // Estimated project value
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
