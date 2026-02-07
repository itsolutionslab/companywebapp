'use client';

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { RegionConfig, getRegionConfig, DEFAULT_REGION } from '../config/regions';
import { setUserProperties } from '../lib/analytics';

interface RegionContextType {
    region: RegionConfig;
    isLoading: boolean;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export const RegionProvider: React.FC<{ children: React.ReactNode, initialRegion?: string }> = ({ children, initialRegion }) => {
    const [regionCode, setRegionCode] = useState<string | undefined>(initialRegion);
    const [isLoading, setIsLoading] = useState(!initialRegion);

    useEffect(() => {
        if (!initialRegion) {
            // Try to get region from cookie if not provided as prop
            const getCookie = (name: string) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop()?.split(';').shift();
            };

            const cookieRegion = getCookie('NEXT_REGION') || 'US';
            const upRegion = cookieRegion.toUpperCase();
            setRegionCode(upRegion);
            setUserProperties({
                region: upRegion,
                country_id: upRegion,
                language: upRegion === 'US' ? 'en' : 'es'
            });
            setIsLoading(false);
        } else {
            setUserProperties({
                region: initialRegion.toUpperCase(),
                country_id: initialRegion.toUpperCase(),
                language: initialRegion.toLowerCase() === 'us' ? 'en' : 'es'
            });
        }
    }, [initialRegion]);

    const region = useMemo(() => getRegionConfig(regionCode), [regionCode]);

    const value = useMemo(() => ({
        region,
        isLoading
    }), [region, isLoading]);

    return (
        <RegionContext.Provider value={value}>
            {children}
        </RegionContext.Provider>
    );
};

export const useContactRegion = () => {
    const context = useContext(RegionContext);
    if (context === undefined) {
        throw new Error('useContactRegion must be used within a RegionProvider');
    }
    return context;
};
