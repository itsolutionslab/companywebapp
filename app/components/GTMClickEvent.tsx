'use client';

/**
 * Google Tag Manager Click Event Handler
 * 
 * Client Component for sending custom events to GTM dataLayer.
 * This component provides utilities for tracking user interactions
 * such as button clicks, form submissions, etc.
 */

import { useCallback } from 'react';

/**
 * GTM Event interface for type safety
 */
export interface GTMEvent {
    event: string;
    category?: string;
    action?: string;
    label?: string;
    value?: number;
    [key: string]: any;
}

/**
 * Sends an event to the GTM dataLayer
 * 
 * @param eventData - The event data to send to GTM
 * @example
 * ```typescript
 * sendGTMEvent({
 *   event: 'click_whatsapp',
 *   category: 'contact',
 *   action: 'click',
 *   label: 'WhatsApp Button - Hero Section'
 * });
 * ```
 */
export function sendGTMEvent(eventData: GTMEvent): void {
    if (typeof window === 'undefined') {
        console.warn('GTM: Cannot send event on server-side');
        return;
    }

    // Ensure dataLayer exists
    if (!window.dataLayer) {
        window.dataLayer = [];
    }

    try {
        window.dataLayer.push(eventData);
        console.log('GTM Event sent:', eventData);
    } catch (error) {
        console.error('GTM: Error sending event', error);
    }
}

/**
 * Custom hook for sending GTM events
 * 
 * @returns A memoized function to send GTM events
 * @example
 * ```typescript
 * const Component = () => {
 *   const sendEvent = useGTMEvent();
 *   
 *   const handleClick = () => {
 *     sendEvent({
 *       event: 'button_click',
 *       category: 'engagement',
 *       action: 'click',
 *       label: 'Contact Form Button'
 *     });
 *   };
 *   
 *   return <button onClick={handleClick}>Contact</button>;
 * };
 * ```
 */
export function useGTMEvent() {
    const sendEvent = useCallback((eventData: GTMEvent) => {
        sendGTMEvent(eventData);
    }, []);

    return sendEvent;
}

/**
 * GTMClickEvent Component
 * 
 * This is a placeholder component that can be used to wrap
 * elements that need GTM tracking. Generally, you'll use the
 * sendGTMEvent function or useGTMEvent hook directly.
 * 
 * @example
 * ```typescript
 * <GTMClickEvent />
 * ```
 */
export default function GTMClickEvent() {
    return null;
}
