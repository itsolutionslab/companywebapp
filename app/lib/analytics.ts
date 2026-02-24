'use client';

/**
 * Global analytics utility for tracking conversion events and telemetry.
 * Ensures data is segmented by region and avoids PII.
 */

// Extend window object for GA4
declare global {
    interface Window {
        gtag?: (command: string, ...args: any[]) => void;
        dataLayer?: any[];
    }
}

export interface AnalyticsMetadata {
    region?: string;
    country_id?: string;
    language?: string;
    device_type?: string;
    [key: string]: any;
}

export const trackConversion = (eventName: string, metadata: object = {}) => {
    // 1. Log to console in development mode (Removed for security)

    // 2. Track with GA4 if available
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, {
            ...metadata,
            send_to: 'default',
        });
    }

    // 3. Track with Vercel Analytics if available (handled automatically if configured)
};

/**
 * Sets user properties for segmentation.
 * Called when region is detected.
 */
export const setUserProperties = (properties: AnalyticsMetadata) => {
    // Removed for security

    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('set', 'user_properties', properties);
        // Also add to dataLayer for other potential tags
        window.dataLayer?.push({
            event: 'user_properties_update',
            ...properties
        });
    }
};
