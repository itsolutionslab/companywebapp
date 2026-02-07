export type ContactStrategyType = 'WHATSAPP' | 'CALL_SMS' | 'EMAIL';

export interface RegionConfig {
    countryCode: string;
    name: string;
    phone: string;
    phoneFormatted: string;
    whatsapp: string;
    whatsappFormatted: string;
    email: string;
    primaryContact: ContactStrategyType;
    secondaryContact: ContactStrategyType[];
    label: string;
}

export const REGIONAL_CONFIG: Record<string, RegionConfig> = {
    PE: {
        countryCode: 'PE',
        name: 'Perú',
        phone: '+51972243083',
        phoneFormatted: '+51 972 243 083',
        whatsapp: '51972243083',
        whatsappFormatted: '+51 972 243 083',
        email: 'solutions@brecomperu.com',
        primaryContact: 'WHATSAPP',
        secondaryContact: ['EMAIL'],
        label: 'Soporte Local Perú'
    },
    US: {
        countryCode: 'US',
        name: 'United States',
        phone: '+12146997537',
        phoneFormatted: '+1 (214) 699-7537',
        whatsapp: '12146997537',
        whatsappFormatted: '+1 (214) 699-7537',
        email: 'solutions@brecomperu.com',
        primaryContact: 'CALL_SMS',
        secondaryContact: ['EMAIL', 'WHATSAPP'],
        label: 'US Sales & Support'
    }
};

export const DEFAULT_REGION = REGIONAL_CONFIG.US;

export const getRegionConfig = (countryCode?: string | null): RegionConfig => {
    if (!countryCode) return DEFAULT_REGION;
    return REGIONAL_CONFIG[countryCode.toUpperCase()] || DEFAULT_REGION;
};
