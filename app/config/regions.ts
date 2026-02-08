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
        phone: '+51900828470',
        phoneFormatted: '+51 900 828 470',
        whatsapp: '51900828470',
        whatsappFormatted: '+51 900 828 470',
        email: 'solutions@brecomperu.com',
        primaryContact: 'WHATSAPP',
        secondaryContact: ['EMAIL'],
        label: 'Soporte Local Perú'
    },
    US: {
        countryCode: 'US',
        name: 'United States',
        phone: '+14697564476',
        phoneFormatted: '+1 (469) 756-4476',
        whatsapp: '14697564476',
        whatsappFormatted: '+1 (469) 756-4476',
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
