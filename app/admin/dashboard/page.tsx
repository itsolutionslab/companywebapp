"use client";

import { useEffect, useState, useMemo } from "react";
import { onLeadsUpdate, onServicesUpdate } from "@/lib/firebase";
import { Lead } from "@/types/tracking";
import { Service } from "@/types/booking";
import { useTranslation } from "@/components/admin/LanguageContext";
import { TranslationKey } from "@/lib/admin-translations";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, AreaChart, Area, PieChart, Pie
} from 'recharts';

import DateFilterModal from "@/components/admin/DateFilterModal";

type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'single' | 'range' | 'custom';

const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function DashboardPage() {
    const { t, lang } = useTranslation();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [leadsLoading, setLeadsLoading] = useState(true);
    const [servicesLoading, setServicesLoading] = useState(true);
    const [filter, setFilter] = useState<TimeFilter>('month');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [dateModalMode, setDateModalMode] = useState<'single' | 'range'>('single');

    useEffect(() => {
        const unsubLeads = onLeadsUpdate((data) => {
            // Sort locally as we removed order from Firestore query for robustness
            const sortedData = [...data].sort((a, b) => {
                const getTimestamp = (l: Lead) => {
                    if (!l?.audit_logs?.created_at) return 0;
                    const ca = l.audit_logs.created_at;

                    if (ca && typeof ca === 'object' && 'toDate' in ca && typeof ca.toDate === 'function') {
                        return ca.toDate().getTime();
                    }

                    const date = new Date(ca);
                    return isNaN(date.getTime()) ? 0 : date.getTime();
                };

                return getTimestamp(b) - getTimestamp(a);
            });
            setLeads(sortedData);
            setLeadsLoading(false);
        });

        const unsubServices = onServicesUpdate((data) => {
            setServices(data);
            setServicesLoading(false);
        });

        return () => {
            unsubLeads();
            unsubServices();
        };
    }, []);

    useEffect(() => {
        if (!leadsLoading && !servicesLoading) {
            setLoading(false);
        }
    }, [leadsLoading, servicesLoading]);

    const filteredLeads = useMemo(() => {
        const now = new Date();
        const filtered = leads.filter(l => {
            if (!l?.audit_logs?.created_at) return false;

            const ca = l.audit_logs.created_at;
            const lDate = (ca && typeof ca === 'object' && 'toDate' in ca)
                ? ca.toDate()
                : (ca ? new Date(ca) : new Date(0));

            if (isNaN(lDate.getTime()) || lDate.getTime() === 0) {
                return false;
            }

            const lDateStr = getLocalDateString(lDate);

            // --- Filter logic ---
            if (filter === 'day') {
                return lDate.toDateString() === now.toDateString();
            }
            if (filter === 'week') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(now.getDate() - 7);
                return lDate >= oneWeekAgo && lDate <= now;
            }
            if (filter === 'month') {
                return lDate.getMonth() === now.getMonth() && lDate.getFullYear() === now.getFullYear();
            }
            if (filter === 'year') {
                return lDate.getFullYear() === now.getFullYear();
            }
            if (filter === 'single') {
                return lDateStr === startDate;
            }
            if (filter === 'range') {
                if (!startDate || !endDate) return true;
                return lDateStr >= startDate && lDateStr <= endDate;
            }
            if (filter === 'custom') {
                if (!startDate || !endDate) return true;
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return lDate >= start && lDate <= end;
            }
            return true;
        });

        return filtered;
    }, [leads, filter, startDate, endDate]);



    // Calculations
    const totalLeads = filteredLeads.length;
    const completedLeads = filteredLeads.filter(l => l.status_flow?.current === 'CLOSED' || l.status_flow?.current === 'PROJ_FINISHED').length;
    const newLeadsCount = filteredLeads.filter(l => l.status_flow?.current === 'LEAD_NEW').length;
    const conversionRate = totalLeads > 0 ? (completedLeads / totalLeads) * 100 : 0;

    // Average session duration from KPIs
    const avgDuration = totalLeads > 0
        ? filteredLeads.reduce((sum, l) => sum + (l.kpis?.session_duration || 0), 0) / totalLeads
        : 0;

    // Charts Data Preparation

    // 1. Leads Growth
    const leadsGrowthData = useMemo(() => {
        const data = filteredLeads.reduce((acc: any[], l) => {
            const ca = l.audit_logs?.created_at;
            const lDate = ca?.toDate?.() || (ca ? new Date(ca) : new Date());
            const dateStr = lDate.toLocaleDateString(lang, { day: 'numeric', month: 'short' });

            const existing = acc.find(item => item.name === dateStr);
            if (existing) {
                existing.value += 1;
            } else {
                acc.push({ name: dateStr, value: 1, rawDate: lDate });
            }
            return acc;
        }, []);

        return data
            .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
            .slice(-7);
    }, [filteredLeads, lang]);

    // 2. Performance by Landing Page
    const landingImpact = filteredLeads.reduce((acc: any, l) => {
        const landing = l.source_attribution?.landing_page || 'Unknown';
        acc[landing] = (acc[landing] || 0) + 1;
        return acc;
    }, {});
    const popularLandingsData = Object.entries(landingImpact)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value);

    // 3. Source Attribution
    const sourceImpact = filteredLeads.reduce((acc: any, l) => {
        const source = l.source_attribution?.utm_source || 'Direct';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});
    const sourcesData = Object.entries(sourceImpact).map(([name, value]) => ({ name, value: value as number }));

    // 4. Budget Range Distribution
    const budgetImpact = filteredLeads.reduce((acc: any, l) => {
        const budget = l.data?.budget_range || 'N/A';
        acc[budget] = (acc[budget] || 0) + 1;
        return acc;
    }, {});
    const budgetData = Object.entries(budgetImpact).map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value);

    // 5. Service Interests Distribution
    const serviceImpact = filteredLeads.reduce((acc: any, l) => {
        const interests = l.data?.service_interests || [];
        interests.forEach((service: string) => {
            acc[service] = (acc[service] || 0) + 1;
        });
        return acc;
    }, {});
    const servicesInterestsData = Object.entries(serviceImpact).map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value);

    const mainStats = [
        { name: 'Total Leads', value: totalLeads, icon: '🎯', color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
        { name: 'Nuevos', value: newLeadsCount, icon: '✨', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
        { name: 'Conversión', value: `${conversionRate.toFixed(1)}%`, icon: '📈', color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
        { name: 'Sesión Prom.', value: `${Math.round(avgDuration / 60)}m`, icon: '⏱️', color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
    ];

    const filterOptions: { id: TimeFilter; label: TranslationKey; icon: string }[] = [
        { id: 'day', label: 'day', icon: '☀️' },
        { id: 'week', label: 'week', icon: '📅' },
        { id: 'month', label: 'month', icon: '🗓️' },
        { id: 'year', label: 'year', icon: '📊' },
        { id: 'single', label: 'filter_date', icon: '📍' },
        { id: 'range', label: 'filter_range', icon: '↔️' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight mb-1">{t('dashboard')}</h1>
                    <p className="text-[#8E8E93] text-sm font-medium leading-tight">Métricas de tracking y conversión en tiempo real</p>
                </div>

                <div className="flex bg-white p-1.5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-x-auto no-scrollbar max-w-full">
                    <div className="flex items-center gap-1.5">
                        {filterOptions.map((opt) => {
                            const isActive = filter === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        if (opt.id === 'single' || opt.id === 'range') {
                                            setDateModalMode(opt.id);
                                            setIsDateModalOpen(true);
                                        } else {
                                            setFilter(opt.id);
                                        }
                                    }}
                                    className={`
                                        px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.12em] transition-all duration-300 flex items-center justify-center gap-2.5 whitespace-nowrap group
                                        ${isActive
                                            ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-100 scale-[1.05] ring-1 ring-blue-400/20"
                                            : "text-gray-500 hover:text-blue-600 hover:bg-blue-50/50"
                                        }
                                    `}
                                >
                                    <span className={`text-lg transition-all duration-500 ${isActive ? 'scale-110 rotate-[5deg]' : 'opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0'}`}>
                                        {opt.icon}
                                    </span>
                                    <span>{t(opt.label as any)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Date Filter Modal */}
            <DateFilterModal
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                mode={dateModalMode}
                initialStart={startDate}
                initialEnd={endDate}
                onSelect={(start, end) => {
                    setStartDate(start);
                    setEndDate(end);
                    setFilter(dateModalMode);
                }}
            />

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {mainStats.map((stat) => (
                    <div key={stat.name} className={`bg-white p-6 rounded-[2rem] border ${stat.border} shadow-sm hover:shadow-xl transition-all duration-300`}>
                        <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center text-2xl mb-4`}>
                            {stat.icon}
                        </div>
                        <div className="text-3xl font-black text-gray-800 tracking-tight">{stat.value}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">{stat.name}</div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 1. Leads Growth */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-2 h-8 bg-blue-400 rounded-full mr-3" />
                        Crecimiento de Leads
                    </h3>
                    <div className="h-[300px] w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={leadsGrowthData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Popular Landings */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-2 h-8 bg-indigo-400 rounded-full mr-3" />
                        Conversion por Landing
                    </h3>
                    <div className="h-[300px] w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={popularLandingsData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 600 }} width={100} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24} fill="#6366f1" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Source Distribution */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-2 h-8 bg-emerald-400 rounded-full mr-3" />
                        Fuentes de Tráfico
                    </h3>
                    <div className="h-[300px] w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sourcesData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sourcesData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#6366f1', '#f59e0b'][index % 4]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Budget Distribution */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-2 h-8 bg-amber-400 rounded-full mr-3" />
                        Distribución de Presupuestos
                    </h3>
                    <div className="h-[300px] w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={budgetData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 600 }} width={100} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24} fill="#f59e0b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 5. Service Interests */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-2 h-8 bg-rose-400 rounded-full mr-3" />
                        Servicios más Solicitados
                    </h3>
                    <div className="h-[300px] w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={servicesInterestsData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40} fill="#f43f5e" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
