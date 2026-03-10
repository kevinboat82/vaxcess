import React, { useEffect, useState } from 'react';
import { Plus, Search, Users, Activity, Syringe, CalendarClock, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Layout } from '../components/Layout';
import { AddWorkerModal } from '../components/AddWorkerModal';
import api from '../api';

interface SystemMetrics {
    total_children: number;
    total_caregivers: number;
    total_vaccines_administered: number;
    total_vaccines_pending: number;
}

interface Worker {
    id: string;
    username: string;
    facility_name: string;
    role: string;
    created_at: string;
}

const COLORS = {
    Completed: '#10b981', // emerald-500
    Pending: '#f59e0b',   // amber-500
    Overdue: '#f43f5e',   // rose-500
    Other: '#94a3b8'      // slate-400
};

const Dashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
    const [chartData, setChartData] = useState<{ distribution: any[], trend: any[] } | null>(null);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            const [overviewRes, workersRes, chartsRes] = await Promise.all([
                api.get('/analytics/overview'),
                api.get('/auth/workers'),
                api.get('/analytics/charts')
            ]);
            setMetrics(overviewRes.data);
            setWorkers(workersRes.data);
            setChartData(chartsRes.data);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const filteredWorkers = (workers || []).filter(w =>
        w.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.facility_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout title="System Overview">

            {/* Top Level Meta Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
                {/* Registered Children */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:p-6 flex flex-col justify-between items-start hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start w-full mb-3 lg:mb-4">
                        <div className="bg-blue-50 text-blue-600 p-2.5 lg:p-3 rounded-lg shadow-sm border border-blue-100 shrink-0">
                            <Users className="w-5 h-5 lg:w-6 lg:h-6" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">
                            {isLoading ? '...' : metrics?.total_children?.toLocaleString() || '0'}
                        </h3>
                        <p className="text-xs lg:text-sm font-medium text-slate-500 mt-1">Children Patrons</p>
                    </div>
                </div>

                {/* Primary Caregivers */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:p-6 flex flex-col justify-between items-start hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start w-full mb-3 lg:mb-4">
                        <div className="bg-emerald-50 text-emerald-600 p-2.5 lg:p-3 rounded-lg shadow-sm border border-emerald-100 shrink-0">
                            <Activity className="w-5 h-5 lg:w-6 lg:h-6" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">
                            {isLoading ? '...' : metrics?.total_caregivers?.toLocaleString() || '0'}
                        </h3>
                        <p className="text-xs lg:text-sm font-medium text-slate-500 mt-1">Primary Caregivers</p>
                    </div>
                </div>

                {/* Vaccines Administered */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:p-6 flex flex-col justify-between items-start hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start w-full mb-3 lg:mb-4">
                        <div className="bg-indigo-50 text-indigo-600 p-2.5 lg:p-3 rounded-lg shadow-sm border border-indigo-100 shrink-0">
                            <Syringe className="w-5 h-5 lg:w-6 lg:h-6" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">
                            {isLoading ? '...' : metrics?.total_vaccines_administered?.toLocaleString() || '0'}
                        </h3>
                        <p className="text-xs lg:text-sm font-medium text-slate-500 mt-1">EPI Doses Given</p>
                    </div>
                </div>

                {/* Urgent Pending Pipelines */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:p-6 flex flex-col justify-between items-start hover:shadow-md transition-shadow ring-1 ring-amber-500/20">
                    <div className="flex justify-between items-start w-full mb-3 lg:mb-4">
                        <div className="bg-amber-50 text-amber-600 p-2.5 lg:p-3 rounded-lg shadow-sm border border-amber-100 shrink-0">
                            <CalendarClock className="w-5 h-5 lg:w-6 lg:h-6" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight text-amber-600">
                            {isLoading ? '...' : metrics?.total_vaccines_pending?.toLocaleString() || '0'}
                        </h3>
                        <p className="text-xs lg:text-sm font-medium text-amber-700/70 mt-1">Pending Pipelines</p>
                    </div>
                </div>
            </div>

            {/* Analytics Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                {/* Trend Bar Chart */}
                <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-base lg:text-lg font-bold text-slate-800">Vaccination Trends (Last 6 Months)</h2>
                    </div>
                    <div className="h-64 lg:h-72 w-full">
                        {isLoading ? (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100">
                                <Activity className="w-6 h-6 text-slate-300 animate-pulse" />
                            </div>
                        ) : chartData?.trend && chartData.trend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="vaccines" fill="#6366f1" radius={[4, 4, 0, 0]} name="Doses Administered" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 text-sm rounded-lg border border-slate-100">
                                No trend data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Distribution Pie Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChartIcon className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-base lg:text-lg font-bold text-slate-800">Schedule Distribution</h2>
                    </div>
                    <div className="h-64 lg:h-72 w-full">
                        {isLoading ? (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100">
                                <Activity className="w-6 h-6 text-slate-300 animate-pulse" />
                            </div>
                        ) : chartData?.distribution && chartData.distribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData.distribution}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={55}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.Other} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 text-sm rounded-lg border border-slate-100">
                                No distribution data
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Health Workers Roster Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Administrative Roster</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage health workers registered to the platform.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search workers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm"
                        />
                    </div>
                    <button
                        onClick={() => setIsWorkerModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Worker
                    </button>
                </div>
            </div>

            <AddWorkerModal
                isOpen={isWorkerModalOpen}
                onClose={() => setIsWorkerModalOpen(false)}
                onSuccess={() => fetchDashboardData()}
            />

            {/* Worker Data Table Widget */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Username</th>
                                <th className="px-6 py-4">Access Role</th>
                                <th className="px-6 py-4">Facility Name</th>
                                <th className="px-6 py-4">Registered Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredWorkers.length > 0 ? (
                                filteredWorkers.map((worker) => (
                                    <tr key={worker.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase border border-slate-200">
                                                {worker.username.charAt(0)}
                                            </div>
                                            {worker.username}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${worker.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {worker.role === 'ADMIN' ? 'Administrator' : 'Worker'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{worker.facility_name}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(worker.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                                        No workers found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
