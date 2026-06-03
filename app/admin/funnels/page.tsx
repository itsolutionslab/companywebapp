"use client";

import { useState } from "react";
import CampaignsTab from "@/admin/funnels/components/CampaignsTab";
import FunnelListTab from "@/admin/funnels/components/FunnelListTab";

export default function FunnelsPage() {
    const [activeTab, setActiveTab] = useState<'campaigns' | 'list'>('campaigns');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2 relative">
                <div>
                    <div className="admin-decorator-line mb-4 bg-[#EE05F2]"></div>
                    <h1 className="admin-h1 text-4xl mb-2 text-[#0511F2]">Funnels de Ventas</h1>
                    <p className="admin-subtitle text-gray-500 font-medium">Gestión de prospectos internos y configuración de captación</p>
                </div>

                <div className="flex bg-gray-50 p-1.5 rounded-[2rem] border border-gray-100 shadow-inner overflow-x-auto no-scrollbar max-w-full">
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setActiveTab('campaigns')}
                            className={`
                                px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 flex items-center justify-center gap-2 whitespace-nowrap
                                ${activeTab === 'campaigns'
                                    ? "bg-[#EE05F2] text-white shadow-xl shadow-pink-200 scale-[1.05]"
                                    : "text-gray-400 hover:text-[#EE05F2] hover:bg-white"
                                }
                            `}
                        >
                            <span className="text-sm">📢</span>
                            <span>Campañas</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`
                                px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 flex items-center justify-center gap-2 whitespace-nowrap
                                ${activeTab === 'list'
                                    ? "bg-[#0511F2] text-white shadow-xl shadow-blue-200 scale-[1.05]"
                                    : "text-gray-400 hover:text-[#0511F2] hover:bg-white"
                                }
                            `}
                        >
                            <span className="text-sm">📋</span>
                            <span>Leads Captados</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                {activeTab === 'campaigns' ? <CampaignsTab /> : <FunnelListTab />}
            </div>
        </div>
    );
}
