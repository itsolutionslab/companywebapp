"use client";

import { useEffect, useState, useMemo } from "react";
import { getLeads, getServices } from "@/lib/firebase";
import { Lead } from "@/types/tracking";
import { Service } from "@/types/booking";
import { useTranslation } from "@/components/admin/LanguageContext";
import { TranslationKey } from "@/lib/admin-translations";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, AreaChart, Area, PieChart, Pie
} from 'recharts';

type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'custom';

export default function DashboardPage() {
    const { t, lang } = useTranslation();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<TimeFilter>('month');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    useEffect(() => {
        async function fetchData() {
            try {
                const [leadsData, servicesData] = await Promise.all([
                    getLeads(),
                    getServices()
                ]);
                setLeads(leadsData);
                setServices(servicesData);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const filteredLeads = useMemo(() => {
        const now = new Date();
        return leads.filter(l => {
            const lDate = l.audit_logs.created_at?.toDate?.() || new Date(l.audit_logs.created_at);
            if (isNaN(lDate.getTime())) return false;

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
            if (filter === 'custom') {
                if (!startDate || !endDate) return true;
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return lDate >= start && lDate <= end;
            }
            return true;
        });
    }, [leads, filter, startDate, endDate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Calculations
    const totalLeads = filteredLeads.length;
    const completedLeads = filteredLeads.filter(l => l.status_flow.current === 'CLOSED' || l.status_flow.current === 'PROJ_FINISHED').length;
    const newLeads = filteredLeads.filter(l => l.status_flow.current === 'LEAD_NEW').length;
    const conversionRate = totalLeads > 0 ? (completedLeads / totalLeads) * 100 : 0;

    // Average session duration from KPIs
    const avgDuration = totalLeads > 0
        ? filteredLeads.reduce((sum, l) => sum + (l.kpis.session_duration || 0), 0) / totalLeads
        : 0;

    // Charts Data Preparation

    // 1. Leads Growth
    const leadsGrowthData = filteredLeads.reduce((acc: any[], l) => {
        const lDate = l.audit_logs.created_at?.toDate?.() || new Date(l.audit_logs.created_at);
        const dateStr = lDate.toLocaleDateString(lang, { day: 'numeric', month: 'short' });
        const existing = acc.find(item => item.name === dateStr);
        if (existing) {
            existing.value += 1;
        } else {
            acc.push({ name: dateStr, value: 1 });
        }
        return acc;
    }, [])
        .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
        .slice(-7);

    // 2. Performance by Landing Page
    const landingImpact = filteredLeads.reduce((acc: any, l) => {
        const landing = l.source_attribution.landing_page || 'Unknown';
        acc[landing] = (acc[landing] || 0) + 1;
        return acc;
    }, {});
    const popularLandingsData = Object.entries(landingImpact)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value);

    // 3. Source Attribution
    const sourceImpact = filteredLeads.reduce((acc: any, l) => {
        const source = l.source_attribution.utm_source || 'Direct';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});
    const sourcesData = Object.entries(sourceImpact).map(([name, value]) => ({ name, value: value as number }));

    const mainStats = [
        { name: 'Total Leads', value: totalLeads, icon: '🎯', color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
        { name: 'Nuevos', value: newLeads, icon: '✨', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
        { name: 'Conversión', value: `${conversionRate.toFixed(1)}%`, icon: '📈', color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
        { name: 'Sesión Prom.', value: `${Math.round(avgDuration / 60)}m`, icon: '⏱️', color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
    ];

    const filterOptions: { id: TimeFilter; label: TranslationKey }[] = [
        { id: 'day', label: 'day' },
        { id: 'week', label: 'week' },
        { id: 'month', label: 'month' },
        { id: 'year', label: 'year' },
    ];

    return (
        <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight mb-1">{t('dashboard')}</h1>
                    <p className="text-[#8E8E93] text-sm font-medium leading-tight">Métricas de tracking y conversión en tiempo real</p>
                </div>

                <div className="flex bg-[#EEEEF0] p-0.5 rounded-xl shadow-inner overflow-x-auto no-scrollbar">
                    {filterOptions.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setFilter(opt.id)}
                            className={`px-4 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 ${filter === opt.id
                                ? "bg-white text-black shadow-sm ring-1 ring-black/5"
                                : "text-[#8E8E93] hover:text-black"
                                }`}
                        >
                            {t(opt.label as any)}
                        </button>
                    ))}
                </div>
            </div>

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
                    <div className="h-64 w-full">
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
                    <div className="h-64 w-full">
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
                    <div className="h-64 w-full">
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

            </div>
        </div>
    );
}
