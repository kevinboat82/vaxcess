import React, { useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AddChildModal } from '../components/AddChildModal';
import { useAuth } from '../context/AuthContext';
import api from '../api';

interface RegistryRecord {
    id: string;
    name: string;
    dob: string;
    gender: string;
    address: string;
    health_facility_centre: string;
    caregiver_name: string;
    phone_number: string;
    incentive_status: string;
}

const Registry: React.FC = () => {
    const navigate = useNavigate();
    const { role } = useAuth();
    const [children, setChildren] = useState<RegistryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchRegistry = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/children/registry');
            setChildren(response.data);
        } catch (error) {
            console.error("Failed to fetch registry", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistry();
    }, []);

    const filteredChildren = (children || []).filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.caregiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone_number.includes(searchTerm)
    );

    return (
        <Layout title="Vaccine Registry">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search child or caregiver..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm"
                    />
                </div>

                {role === 'ADMIN' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        Register New Child
                    </button>
                )}
            </div>

            {/* Registration Modal */}
            <AddChildModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    // Re-fetch the registry table immediately when a child is explicitly added
                    fetchRegistry();
                }}
            />

            {/* Data Table Widget - Desktop */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Child Name</th>
                                <th className="px-6 py-4">Address</th>
                                <th className="px-6 py-4">Facility</th>
                                <th className="px-6 py-4">Phone Number</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                            <p>Loading registry data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredChildren.length > 0 ? (
                                filteredChildren.map((child) => (
                                    <tr
                                        key={child.id}
                                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/registry/child/${child.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${child.incentive_status?.includes('Eligible')
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${child.incentive_status?.includes('Eligible') ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                {child.incentive_status || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase">
                                                {child.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="font-semibold">{child.name}</div>
                                                    {child.gender && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black tracking-tighter ${child.gender === 'MALE' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                            child.gender === 'FEMALE' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                'bg-slate-50 text-slate-400 border border-slate-100'
                                                            }`}>
                                                            {child.gender === 'MALE' ? 'M' : child.gender === 'FEMALE' ? 'F' : '?'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">DOB: {new Date(child.dob).toLocaleDateString()}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">{child.address || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-slate-800">{child.health_facility_centre || 'N/A'}</div>
                                            <div className="text-[10px] text-slate-500">{child.caregiver_name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{child.phone_number}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No registry records found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {isLoading ? (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                            <p>Loading registry data...</p>
                        </div>
                    </div>
                ) : filteredChildren.length > 0 ? (
                    filteredChildren.map((child) => (
                        <div
                            key={child.id}
                            onClick={() => navigate(`/registry/child/${child.id}`)}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm active:bg-slate-50 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm uppercase">
                                        {child.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-900">{child.name}</h4>
                                            {child.gender && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black tracking-tighter ${child.gender === 'MALE' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                    child.gender === 'FEMALE' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                        'bg-slate-50 text-slate-400 border border-slate-100'
                                                    }`}>
                                                    {child.gender === 'MALE' ? 'M' : child.gender === 'FEMALE' ? 'F' : '?'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">DOB: {new Date(child.dob).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${child.incentive_status?.includes('Eligible')
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                    {child.incentive_status || 'Unknown'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight mb-0.5">Facility</p>
                                    <p className="text-xs font-semibold text-slate-700 leading-tight">{child.health_facility_centre || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight mb-0.5">Caregiver</p>
                                    <p className="text-xs font-semibold text-slate-700 leading-tight truncate">{child.caregiver_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight mb-0.5">Address</p>
                                    <p className="text-xs font-medium text-slate-600 leading-tight">{child.address || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight mb-0.5">Phone</p>
                                    <p className="text-xs font-mono font-bold text-emerald-600">{child.phone_number}</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
                        No registry records found matching your search.
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Registry;
