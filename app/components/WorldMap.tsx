'use client';

import React, { useEffect, useState } from 'react';

export type WorldMapProps = {
    highlightedCountries?: {
        code: string;
        name: string;
        color: string;
    }[];
    className?: string;
};

const COUNTRY_COORDINATES: Record<string, { x: number; y: number }> = {
    'US': { x: 480, y: 310 },
    'PE': { x: 590, y: 580 },
};

const WorldMap: React.FC<WorldMapProps> = ({
    highlightedCountries = [
        { code: 'US', name: 'USA', color: '#10b981' },
        { code: 'PE', name: 'Peru', color: '#06b6d4' }
    ],
    className = ''
}) => {
    const [svgContent, setSvgContent] = useState<string>('');

    useEffect(() => {
        fetch('/assets/world.svg')
            .then(res => res.text())
            .then(text => {
                // Clean up the SVG: remove XML header, doctype, and width/height to make it responsive
                const cleaned = text
                    .replace(/<\?xml.*?\?>/g, '')
                    .replace(/<!DOCTYPE.*?>/g, '')
                    .replace(/<svg.*?>/, (match) => {
                        return match
                            .replace(/height=".*?"/, '')
                            .replace(/width=".*?"/, '')
                            .replace(/fill=".*?"/, 'fill="currentColor"')
                            .replace(/viewbox=".*?"/i, 'viewBox="0 0 2000 857"');
                    });
                setSvgContent(cleaned);
            })
            .catch(err => console.error('Failed to load world map:', err));
    }, []);

    // Generate dynamic CSS for highlighting
    const highlightStyles = highlightedCountries.map(country => {
        const selectors = [
            `path#${country.code}`,
            `path.${country.name.replace(/\s+/g, '.')}`
        ];

        // Specific mapping for USA to include territories in world.svg
        if (country.code === 'US') {
            selectors.push('path.United.States');
            selectors.push('path.Puerto.Rico');
        }

        return selectors.map(s => `${s} { fill: ${country.color} !important; opacity: 1 !important; }`).join('\n');
    }).join('\n');

    return (
        <div className={`relative w-full aspect-[2000/857] flex items-center justify-center overflow-hidden ${className}`}>
            {/* Base SVG Injection */}
            <div
                className="absolute inset-0 w-full h-full text-slate-700/40 flex items-center justify-center p-0"
                dangerouslySetInnerHTML={{ __html: svgContent }}
            />

            {/* Overlay for Markers and Connection Lines */}
            <div className="absolute inset-0 pointer-events-none">
                <svg
                    viewBox="0 0 2000 857"
                    className="w-full h-full"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <filter id="markerGlow">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Connection Line */}
                    {highlightedCountries.length > 1 && (
                        <path
                            d="M 480 310 Q 535 445 590 580"
                            stroke="#0ea5e9"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray="8,4"
                            opacity="0.3"
                            className="animate-[dash_20s_linear_infinite]"
                        >
                            <animate attributeName="stroke-dashoffset" from="0" to="-100" dur="10s" repeatCount="indefinite" />
                        </path>
                    )}

                    {/* Markers */}
                    {highlightedCountries.map(country => {
                        const coords = COUNTRY_COORDINATES[country.code];
                        if (!coords) return null;

                        return (
                            <g key={country.code}>
                                <circle cx={coords.x} cy={coords.y} r="20" fill={country.color} opacity="0.15">
                                    <animate attributeName="r" values="15;25;15" dur="3s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="0.1;0.3;0.1" dur="3s" repeatCount="indefinite" />
                                </circle>
                                <circle cx={coords.x} cy={coords.y} r="6" fill={country.color} stroke="#fff" strokeWidth="2" filter="url(#markerGlow)" />

                                {/* Label Bubble */}
                                <g transform={`translate(${coords.x}, ${coords.y - 25})`}>
                                    <rect x="-40" y="-12" width="80" height="24" rx="12" fill="rgba(15, 23, 42, 0.9)" />
                                    <text textAnchor="middle" y="5" fill={country.color} fontSize="12" fontWeight="bold" className="font-sans">
                                        {country.name}
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                </svg>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                ${highlightStyles}
                svg path { 
                    transition: fill 0.5s ease, opacity 0.5s ease;
                    stroke: rgba(15, 23, 42, 0.2);
                    stroke-width: 0.5;
                }
                svg path:hover {
                    opacity: 0.8 !important;
                    fill: #94a3b8 !important;
                    cursor: pointer;
                }
                @keyframes dash {
                    to { stroke-dashoffset: -100; }
                }
            `}} />
        </div>
    );
};

export default WorldMap;
