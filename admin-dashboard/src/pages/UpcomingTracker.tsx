import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, AlertCircle, Clock, CheckCircle2, Search, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import api from '../api';

interface UpcomingSchedule {
    schedule_id: string;
    child_id: string;
    child_name: string;
    child_gender: string;
    caregiver_name: string;
    phone_number: string;
    vaccine_display_name: string;
    due_date: string;
    days_remaining: number;
    status: string;
}

const UpcomingTracker: React.FC = () => {
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState<UpcomingSchedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'overdue' | 'dueSoon' | 'future'>('overdue');

    const counts = useMemo(() => {
        const list = (schedules || []);
        return {
            overdue: list.filter((s) => s.days_remaining < 0).length,
            dueSoon: list.filter((s) => s.days_remaining >= 0 && s.days_remaining <= 7).length,
            future: list.filter((s) => s.days_remaining > 7).length,
        };
    }, [schedules]);

    const groupedSchedules = useMemo(() => {
        const filtered = (schedules || []).filter((s) =>
            s.child_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.caregiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.phone_number.includes(searchTerm) ||
            s.vaccine_display_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
            overdue: filtered.filter((s) => s.days_remaining < 0).sort((a, b) => a.days_remaining - b.days_remaining),
            dueSoon: filtered.filter((s) => s.days_remaining >= 0 && s.days_remaining <= 7).sort((a, b) => a.days_remaining - b.days_remaining),
            future: filtered.filter((s) => s.days_remaining > 7).sort((a, b) => a.days_remaining - b.days_remaining),
        };
    }, [schedules, searchTerm]);

    useEffect(() => {
        const fetchUpcoming = async () => {
            try {
                const response = await api.get('/schedule/upcoming');
                setSchedules(response.data);
            } catch (error) {
                console.error("Failed to fetch upcoming schedules", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUpcoming();
    }, []);

    const getTimeBadge = (daysRemaining: number) => {
        if (daysRemaining < 0) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-tight">
                    <AlertCircle className="w-3 h-3" /> {-daysRemaining} Days Overdue
                </span>
            );
        } else if (daysRemaining <= 7) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-tight">
                    <Clock className="w-3 h-3" /> Due in {daysRemaining}D
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-tight">
                    <Calendar className="w-3 h-3" /> {daysRemaining} Days Away
                </span>
            );
        }
    };

    const renderEmptyState = () => (
        <div className="py-24 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-200" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-1 tracking-tight">No results found</h4>
            <p className="text-slate-500 max-w-sm px-6 text-sm font-medium">We couldn't find any records matching your search in this category.</p>
        </div>
    );

    const activeItems = groupedSchedules[activeTab];

    return (
        <Layout title="Upcoming Tracker">
            <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div className="max-w-xl">
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Immunization Pipeline</h2>
                    <p className="text-slate-500 mt-2 font-medium text-sm lg:text-base leading-relaxed">Prioritize caregiver outreach based on clinical urgency and dose windows.</p>
                </div>
                <div className="relative w-full xl:w-80 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search patient, vaccine, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-medium shadow-sm"
                    />
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <div onClick={() => setActiveTab('overdue')} className={`cursor-pointer p-5 rounded-2xl border transition-all ${activeTab === 'overdue' ? 'bg-rose-50 border-rose-200 shadow-md shadow-rose-200/20 lg:scale-[1.02]' : 'bg-white border-slate-100 hover:border-rose-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${activeTab === 'overdue' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'}`}>
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Overdue</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{counts.overdue}</div>
                    <div className="text-[10px] font-black text-rose-600 mt-1 uppercase tracking-widest">Immediate Action Required</div>
                </div>

                <div onClick={() => setActiveTab('dueSoon')} className={`cursor-pointer p-5 rounded-2xl border transition-all ${activeTab === 'dueSoon' ? 'bg-amber-50 border-amber-200 shadow-md shadow-amber-200/20 lg:scale-[1.02]' : 'bg-white border-slate-100 hover:border-amber-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${activeTab === 'dueSoon' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Due Soon</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{counts.dueSoon}</div>
                    <div className="text-[10px] font-black text-amber-600 mt-1 uppercase tracking-widest">Next 7 Days Pipeline</div>
                </div>

                <div onClick={() => setActiveTab('future')} className={`cursor-pointer p-5 rounded-2xl border transition-all sm:col-span-2 lg:col-span-1 ${activeTab === 'future' ? 'bg-indigo-50 border-indigo-200 shadow-md shadow-indigo-200/20 lg:scale-[1.02]' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${activeTab === 'future' ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                            <Calendar className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Upcoming</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{counts.future}</div>
                    <div className="text-[10px] font-black text-indigo-600 mt-1 uppercase tracking-widest">Long Term Schedule</div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
                {/* Custom Tab Navigation */}
                <div className="flex items-center border-b border-slate-100 bg-slate-50/50 px-2 pt-2">
                    <button
                        onClick={() => setActiveTab('overdue')}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all relative ${activeTab === 'overdue' ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <span>Overdue</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${activeTab === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-500'}`}>{groupedSchedules.overdue.length}</span>
                        {activeTab === 'overdue' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 rounded-t-full shadow-[0_-2px_8px_rgba(244,63,94,0.4)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('dueSoon')}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all relative ${activeTab === 'dueSoon' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <span>Due Soon</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${activeTab === 'dueSoon' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>{groupedSchedules.dueSoon.length}</span>
                        {activeTab === 'dueSoon' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-t-full shadow-[0_-2px_8px_rgba(245,158,11,0.4)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('future')}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all relative ${activeTab === 'future' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <span>Upcoming</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${activeTab === 'future' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>{groupedSchedules.future.length}</span>
                        {activeTab === 'future' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full shadow-[0_-2px_8px_rgba(99,102,241,0.4)]" />}
                    </button>
                </div>

                <div className="flex-1 bg-white">
                    {isLoading ? (
                        <div className="flex h-96 items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                                <p className="text-xs text-slate-400 font-black tracking-widest uppercase animate-pulse">Syncing Clinic Data...</p>
                            </div>
                        </div>
                    ) : schedules.length > 0 ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {activeItems.length === 0 ? renderEmptyState() : (
                                <>
                                    {/* Desktop View */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left text-sm text-slate-600">
                                            <thead className="bg-white border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                                <tr>
                                                    <th className="px-6 py-5">Status</th>
                                                    <th className="px-6 py-5">Child Name</th>
                                                    <th className="px-6 py-5">Vaccine Target</th>
                                                    <th className="px-6 py-5">Primary Contact</th>
                                                    <th className="px-6 py-5 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {activeItems.map((schedule) => (
                                                    <tr
                                                        key={schedule.schedule_id}
                                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                                        onClick={() => navigate(`/registry/child/${schedule.child_id}`)}
                                                    >
                                                        <td className="px-6 py-5">
                                                            {getTimeBadge(schedule.days_remaining)}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="font-black text-slate-900 group-hover:text-emerald-600 transition-colors leading-none mb-1">
                                                                {schedule.child_name}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                                PID: {schedule.child_id.substring(0, 8).toUpperCase()}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="font-black text-slate-700 uppercase tracking-tight text-[11px]">
                                                                {schedule.vaccine_display_name.replace('v-', '').replace(/([A-Z])/g, ' $1').trim()}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-bold">
                                                                <Calendar className="w-3 h-3 text-emerald-500" /> {new Date(schedule.due_date).toLocaleDateString()}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="font-bold text-slate-700 leading-none mb-1">{schedule.caregiver_name}</div>
                                                            <div className="text-emerald-600 text-[10px] font-mono font-black tracking-widest">{schedule.phone_number}</div>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <button className="p-2.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100">
                                                                <Phone className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile View */}
                                    <div className="md:hidden divide-y divide-slate-100">
                                        {activeItems.map((schedule) => (
                                            <div
                                                key={schedule.schedule_id}
                                                onClick={() => navigate(`/registry/child/${schedule.child_id}`)}
                                                className="p-5 flex flex-col gap-4 active:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-black text-slate-900 text-lg leading-none mb-1">{schedule.child_name}</h4>
                                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{schedule.caregiver_name}</p>
                                                    </div>
                                                    {getTimeBadge(schedule.days_remaining)}
                                                </div>

                                                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight mb-1 leading-none">Target Vaccine</p>
                                                            <p className="text-sm font-black text-slate-800 uppercase leading-none">
                                                                {schedule.vaccine_display_name.replace('v-', '').replace(/([A-Z])/g, ' $1').trim()}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight mb-1 leading-none text-right">Due Date</p>
                                                            <p className="text-xs font-black text-slate-600 leading-none">{new Date(schedule.due_date).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3">
                                                    <button className="flex-1 flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 text-slate-700 text-xs font-black rounded-xl active:bg-slate-50 transition-colors shadow-sm">
                                                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                                        Outreach
                                                    </button>
                                                    <div className="flex items-center justify-center p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                        <span className="text-[10px] font-mono font-black text-emerald-700 tracking-tighter">{schedule.phone_number}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="py-24 text-center flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-emerald-100">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h4 className="text-2xl font-black text-slate-900 mb-2">Registry Silent</h4>
                            <p className="text-slate-500 max-w-sm px-6 font-medium text-sm leading-relaxed">No vaccinations are scheduled for the selected category in the clinical pipeline.</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default UpcomingTracker;
