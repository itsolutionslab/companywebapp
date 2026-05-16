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
    const completedLeads = filteredLeads.filter(l => l.status_flow?.current === 'WON').length;
    const newLeadsCount = filteredLeads.filter(l => l.status_flow?.current === 'NEW').length;
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
        { name: 'Total Leads', value: totalLeads, icon: '🎯', color: 'bg-blue-50 text-[#0511F2]', border: 'border-blue-100' },
        { name: 'Nuevos', value: newLeadsCount, icon: '✨', color: 'bg-emerald-50 text-[#6FD904]', border: 'border-emerald-100' },
        { name: 'Conversión', value: `${conversionRate.toFixed(1)}%`, icon: '📈', color: 'bg-pink-50 text-[#EE05F2]', border: 'border-pink-100' },
        { name: 'Sesión Prom.', value: `${Math.round(avgDuration / 60)}m`, icon: '⏱️', color: 'bg-cyan-50 text-[#26A3BF]', border: 'border-cyan-100' },
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
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0511F2]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2 relative">
                <div>
                    <div className="admin-decorator-line mb-4"></div>
                    <h1 className="admin-h1 text-4xl mb-2">{t('dashboard')}</h1>
                    <p className="admin-subtitle text-gray-500 font-medium">Métricas de tracking y consultoría global en tiempo real</p>
                </div>

                <div className="flex bg-gray-50 p-1.5 rounded-[2rem] border border-gray-100 shadow-inner overflow-x-auto no-scrollbar max-w-full">
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
                                        px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 flex items-center justify-center gap-2 whitespace-nowrap
                                        ${isActive
                                            ? "bg-[#0511F2] text-white shadow-xl shadow-blue-200 scale-[1.05]"
                                            : "text-gray-400 hover:text-[#0511F2] hover:bg-white"
                                        }
                                    `}
                                >
                                    <span className={`text-sm transition-all ${isActive ? 'scale-110' : 'opacity-40 grayscale'}`}>
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
                    <div key={stat.name} className="admin-card group hover:shadow-2xl hover:shadow-blue-100/50 border-gray-100">
                        <div className="diagonal-accent"></div>
                        <div className={`w-14 h-14 rounded-2xl ${stat.color} flex items-center justify-center text-3xl mb-8 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                            {stat.icon}
                        </div>
                        <div className="text-4xl font-black text-[#0511F2] tracking-tighter mb-2">{stat.value}</div>
                        <div className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em]">{stat.name}</div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                {/* 1. Leads Growth */}
                <div className="admin-card !p-10 shadow-sm relative group">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-8 bg-[#EE05F2] rounded-full" />
                            <h3 className="text-[12px] font-black text-[#0511F2] uppercase tracking-[0.2em]">Crecimiento Global</h3>
                        </div>
                        <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Leads Activos</div>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={leadsGrowthData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EE05F2" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#EE05F2" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 30px 60px rgba(5, 17, 242, 0.15)', padding: '20px' }}
                                    itemStyle={{ fontWeight: 800, fontSize: '12px', color: '#EE05F2' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#EE05F2" fillOpacity={1} fill="url(#colorValue)" strokeWidth={5} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Popular Landings */}
                <div className="admin-card !p-10 shadow-sm relative group">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-8 bg-[#0511F2] rounded-full" />
                            <h3 className="text-[12px] font-black text-[#0511F2] uppercase tracking-[0.2em]">Impacto por Solución</h3>
                        </div>
                        <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Conversión</div>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={popularLandingsData} layout="vertical">
                                <CartesianGrid strokeDasharray="5 5" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} width={120} />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(5, 17, 242, 0.03)' }}
                                    contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 30px 60px rgba(5, 17, 242, 0.15)' }}
                                />
                                <Bar dataKey="value" radius={[0, 20, 20, 0]} barSize={28} fill="#0511F2" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Source Distribution */}
                <div className="admin-card !p-10 shadow-sm">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-2 h-8 bg-[#26A3BF] rounded-full" />
                        <h3 className="text-[12px] font-black text-[#0511F2] uppercase tracking-[0.2em]">Canales de Adquisición</h3>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sourcesData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={10}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {sourcesData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#EE05F2', '#0511F2', '#26A3BF', '#6FD904', '#EAF207'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 30px 60px rgba(5, 17, 242, 0.15)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Budget Distribution */}
                <div className="admin-card !p-10 shadow-sm">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-2 h-8 bg-[#6FD904] rounded-full" />
                        <h3 className="text-[12px] font-black text-[#0511F2] uppercase tracking-[0.2em]">Escala de Proyectos</h3>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={budgetData} layout="vertical">
                                <CartesianGrid strokeDasharray="5 5" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} width={120} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 30px 60px rgba(5, 17, 242, 0.15)' }}
                                />
                                <Bar dataKey="value" radius={[0, 20, 20, 0]} barSize={28} fill="#6FD904" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 5. Service Interests */}
                <div className="admin-card !p-10 shadow-sm lg:col-span-2 overflow-visible relative">
                    <div className="diagonal-accent !opacity-10"></div>
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-8 bg-[#EAF207] rounded-full" />
                            <h3 className="text-[12px] font-black text-[#0511F2] uppercase tracking-[0.2em]">Interés Tecnológico Global</h3>
                        </div>
                    </div>
                    <div className="h-[380px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={servicesInterestsData}>
                                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(5, 17, 242, 0.03)' }}
                                    contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 30px 60px rgba(5, 17, 242, 0.15)' }}
                                />
                                <Bar dataKey="value" radius={[20, 20, 0, 0]} barSize={60}>
                                    {servicesInterestsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#0511F2', '#26A3BF', '#EE05F2', '#6FD904'][index % 4]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
