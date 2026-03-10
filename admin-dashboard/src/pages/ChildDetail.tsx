import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    User, Phone, Calendar, Clock,
    CheckCircle2, AlertCircle, PlayCircle, Edit3, Check, ArrowLeft
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { EditChildModal } from '../components/EditChildModal';
import { useAuth } from '../context/AuthContext';
import api from '../api';

interface Schedule {
    id: string;
    vaccine_id: string; // Acts as the name temporarily based on our core logic
    due_date: string;
    window_start: string;
    window_end: string;
    status: 'PENDING' | 'COMPLETED' | 'MISSED';
    administered_at: string | null;
}

interface ChildDetailData {
    child_id: string;
    child_name: string;
    dob: string;
    gender: string;
    address: string;
    health_facility_centre: string;
    incentive_status: string;
    incentive_value: number;
    all_incentives_given: string;
    vaccination_count: number;
    caregiver_name: string;
    phone_number: string;
    secondary_phone: string | null;
    contact_validation: string | null;
    schedules: Schedule[];
}

const ChildDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { role } = useAuth();
    const [data, setData] = useState<ChildDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [completingScheduleId, setCompletingScheduleId] = useState<string | null>(null);
    const [remindingScheduleId, setRemindingScheduleId] = useState<string | null>(null);

    const fetchChildDetails = async () => {
        try {
            setIsLoading(true);
            const response = await api.get(`/children/${id}/details`);
            setData(response.data);
        } catch (error) {
            console.error("Failed to fetch child details", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchChildDetails();
        }
    }, [id]);

    const handleGenerateSchedule = async () => {
        if (!id) return;
        try {
            setIsGenerating(true);
            await api.post(`/schedule/generate/${id}`);
            await fetchChildDetails(); // Refresh to show the new timeline
        } catch (error) {
            console.error("Failed to generate schedule", error);
            alert("Error generating schedule. Check console.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCompleteVaccine = async (scheduleId: string) => {
        try {
            setCompletingScheduleId(scheduleId);
            const response = await api.patch(`/schedule/${scheduleId}/complete`);
            const { payout_status } = response.data;

            if (payout_status && payout_status !== 'No payout triggered') {
                alert(`Vaccine completed! MoMo Status: ${payout_status}`);
            }

            await fetchChildDetails(); // Re-fetch to seamlessly update UI to COMPLETED
        } catch (error) {
            console.error("Failed to mark vaccine as complete", error);
            alert("Error updating schedule. Check console.");
        } finally {
            setCompletingScheduleId(null);
        }
    };

    const handleSendReminder = async (scheduleId: string) => {
        try {
            setRemindingScheduleId(scheduleId);
            await api.post(`/schedule/${scheduleId}/remind`);
            alert("Voice reminder call queued successfully!");
        } catch (error) {
            console.error("Failed to trigger reminder", error);
            alert("Error triggering reminder. Check console.");
        } finally {
            setRemindingScheduleId(null);
        }
    };

    const getStatusBadge = (status: Schedule['status']) => {
        switch (status) {
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Administered
                    </span>
                );
            case 'MISSED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5" /> Missed
                    </span>
                );
            case 'PENDING':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" /> Upcoming
                    </span>
                );
        }
    };

    if (isLoading) {
        return (
            <Layout title="Child Details">
                <div className="flex h-64 items-center justify-center">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    if (!data) {
        return (
            <Layout title="Child Not Found">
                <div className="text-center py-12">
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">Record Not Found</h2>
                    <button onClick={() => navigate('/registry')} className="text-emerald-600 hover:underline">
                        Return to Registry
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Patient Timeline">
            {/* Header / Navigation */}
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={() => navigate('/registry')}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Registry
                </button>

                {role === 'ADMIN' && data.schedules.length === 0 && (
                    <button
                        onClick={handleGenerateSchedule}
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-emerald-600/20"
                    >
                        {isGenerating ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <PlayCircle className="w-4 h-4" />
                        )}
                        {isGenerating ? "Generating EPI Tracker..." : "Generate EPI Schedule"}
                    </button>
                )}

                {role === 'ADMIN' && data.schedules.length > 0 && (
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Edit3 className="w-4 h-4" />
                        Edit Profile
                    </button>
                )}
            </div>

            {/* Profile Context Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Child Info */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 lg:gap-8">
                    <div className="w-20 lg:w-24 h-20 lg:h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-3xl lg:text-4xl font-black shadow-lg shadow-emerald-200/50 shrink-0">
                        {data.child_name.charAt(0)}
                    </div>
                    <div className="flex-1 w-full text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{data.child_name}</h2>
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${data.gender === 'MALE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    data.gender === 'FEMALE' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                        'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                    {data.gender || 'UNKNOWN'}
                                </span>
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${data.incentive_status?.includes('Eligible')
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                    {data.incentive_status}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                            <div className="flex items-center justify-center sm:justify-start gap-3 text-slate-600 bg-slate-50/50 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                                <Calendar className="w-4 h-4 text-emerald-500" />
                                <div className="text-left">
                                    <span className="text-[10px] block uppercase font-bold text-slate-400 leading-none mb-1">Date of Birth</span>
                                    <span className="font-semibold text-slate-700">{new Date(data.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-center sm:justify-start gap-3 text-slate-600 bg-slate-50/50 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-emerald-500" />
                                <div className="text-left">
                                    <span className="text-[10px] block uppercase font-bold text-slate-400 leading-none mb-1">Health Facility</span>
                                    <span className="font-semibold text-slate-700">{data.health_facility_centre || 'Not Assigned'}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-center sm:justify-start gap-3 text-slate-600 bg-slate-50/50 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <div className="text-left">
                                    <span className="text-[10px] block uppercase font-bold text-slate-400 leading-none mb-1">Location / Address</span>
                                    <span className="font-semibold text-slate-700 truncate max-w-[150px] inline-block">{data.address || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-center sm:justify-start gap-3 text-slate-600 bg-slate-50/50 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                                <Clock className="w-4 h-4 text-emerald-500" />
                                <div className="text-left">
                                    <span className="text-[10px] block uppercase font-bold text-slate-400 leading-none mb-1">Vaccination Progress</span>
                                    <span className="font-semibold text-slate-700">{data.vaccination_count} Doses Administered</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Caregiver & Incentives */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Caregiver & Incentives</h3>
                    </div>
                    <div className="p-5 flex-1 space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 flex items-center gap-2"><User className="w-4 h-4" /> Name</span>
                                <span className="font-bold text-slate-800">{data.caregiver_name}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 flex items-center gap-2"><Phone className="w-4 h-4" /> Phone</span>
                                <span className="font-mono font-bold text-emerald-700">{data.phone_number}</span>
                            </div>
                            {data.contact_validation && (
                                <div className="text-[10px] text-right text-emerald-600 font-bold uppercase tracking-tighter">
                                    ✓ {data.contact_validation}
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold">Total Incentives</div>
                                <div className="text-xl font-black text-slate-900">₵{data.incentive_value}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-400 uppercase font-bold">Status</div>
                                <div className="text-xs font-bold text-emerald-600">{data.all_incentives_given || 'Active'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* EPI Schedule Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="font-black text-slate-900 tracking-tight">Vaccination Timeline</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Clinical Schedule Overview</p>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200">
                        {data.schedules.length} Required Doses
                    </span>
                </div>

                {data.schedules.length > 0 ? (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-white border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Vaccine</th>
                                        <th className="px-6 py-4">Target Due Date</th>
                                        <th className="px-6 py-4">Valid Window</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.schedules.map((schedule) => (
                                        <tr key={schedule.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                {getStatusBadge(schedule.status)}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900 uppercase">
                                                {schedule.vaccine_id.replace('v-', '').replace(/([A-Z])/g, ' $1').trim()}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700">
                                                {new Date(schedule.due_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">
                                                {new Date(schedule.window_start).toLocaleDateString()} &mdash; {new Date(schedule.window_end).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {role === 'ADMIN' && schedule.status === 'PENDING' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleSendReminder(schedule.id)}
                                                            disabled={remindingScheduleId === schedule.id}
                                                            title="Trigger Reminder"
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-transparent hover:border-indigo-100 disabled:opacity-50"
                                                        >
                                                            {remindingScheduleId === schedule.id ? (
                                                                <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
                                                            ) : (
                                                                <Phone className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleCompleteVaccine(schedule.id)}
                                                            disabled={completingScheduleId === schedule.id}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black rounded-xl transition-colors border border-emerald-200 disabled:opacity-50 shadow-sm shadow-emerald-200/20"
                                                        >
                                                            {completingScheduleId === schedule.id ? (
                                                                <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-700 rounded-full animate-spin"></div>
                                                            ) : (
                                                                <Check className="w-3.5 h-3.5" />
                                                            )}
                                                            Record Dose
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {data.schedules.map((schedule) => (
                                <div key={schedule.id} className="p-5 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg leading-none mb-1">
                                                {schedule.vaccine_id.replace('v-', '').replace(/([A-Z])/g, ' $1').trim()}
                                            </h4>
                                            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Target Dose</p>
                                        </div>
                                        {getStatusBadge(schedule.status)}
                                    </div>

                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="text-[10px] block font-black text-slate-400 uppercase leading-none mb-1">Due Date</span>
                                            <span className="text-xs font-black text-slate-700">{new Date(schedule.due_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] block font-black text-slate-400 uppercase leading-none mb-1 text-right">Window</span>
                                            <span className="text-xs font-bold text-slate-500">{new Date(schedule.window_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} &ndash; {new Date(schedule.window_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    </div>

                                    {role === 'ADMIN' && schedule.status === 'PENDING' && (
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleSendReminder(schedule.id)}
                                                disabled={remindingScheduleId === schedule.id}
                                                className="flex-1 flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl active:bg-slate-50 transition-colors"
                                            >
                                                {remindingScheduleId === schedule.id ? (
                                                    <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
                                                ) : (
                                                    <Phone className="w-4 h-4 text-indigo-500" />
                                                )}
                                                Call Parent
                                            </button>
                                            <button
                                                onClick={() => handleCompleteVaccine(schedule.id)}
                                                disabled={completingScheduleId === schedule.id}
                                                className="flex-1 flex items-center justify-center gap-2 p-3 bg-emerald-600 text-white text-xs font-black rounded-xl active:bg-emerald-700 shadow-lg shadow-emerald-200 transition-colors"
                                            >
                                                {completingScheduleId === schedule.id ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <Check className="w-3.5 h-3.5" />
                                                )}
                                                Mark Given
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="py-20 text-center flex flex-col items-center justify-center bg-white">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100">
                            <Calendar className="w-10 h-10 text-slate-300" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 mb-2">Timeline Dormant</h4>
                        <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">This record needs a clinical schedule generated to track upcoming EPI doses.</p>
                    </div>
                )}
            </div>

            <EditChildModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={fetchChildDetails}
                childDetails={data}
            />
        </Layout >
    );
};

export default ChildDetail;
