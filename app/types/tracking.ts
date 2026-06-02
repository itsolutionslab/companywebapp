export type LeadStatus =
    // GROW (Comercial)
    | 'LEAD_NEW'
    | 'QUALIFICATION'
    | 'CONTACTED'
    | 'DISCOVERY_SCHEDULED'
    | 'DISCOVERY_COMPLETED'
    | 'PROPOSAL_PREPARING'
    | 'PROPOSAL_SENT'
    | 'NEGOTIATION'
    | 'WIN_CLOSED'
    | 'LOST'
    | 'ON_HOLD'
    // OPERATIONS (Delivery)
    | 'HANDOFF'
    | 'PROJECT_CREATED'
    | 'KICK_OFF'
    | 'INCEPTION_SPRINT_0'
    | 'IN_EXECUTION'
    | 'QA_UAT'
    | 'DELIVERY'
    | 'CLIENT_ACCEPTANCE'
    | 'TECHNICAL_CLOSURE'
    | 'ADMIN_CLOSURE'
    | 'CLOSED'
    // SUPPORT (Post-venta)
    | 'HYPERCARE'
    | 'ACTIVE_SUPPORT'
    | 'EVOLUTIVE'
    | 'RENEWAL'
    | 'ACCOUNT_EXPANDED'

    | 'ACCOUNT_CLOSED';

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

export type DeliveryModel = 'ADVISORY' | 'IMPLEMENTATION' | 'MANAGED_SERVICES' | 'STAFF_AUGMENTATION';
export type Capability = 'SOFTWARE' | 'AI' | 'MARKETING' | 'CLOUD' | 'ERP' | 'DATA' | 'PMO' | 'AUTOMATION';

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
    delivery_model?: DeliveryModel;
    capability?: Capability;
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
    created_by?: string; // Creator UID
    created_by_name?: string; // Creator Name
    dev_team?: string; // Assigned development team name
    solutions_architect_id?: string; // Assigned Solutions Architect UID
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
