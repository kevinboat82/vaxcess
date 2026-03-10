import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Calendar, Activity } from 'lucide-react';
import api from '../api';

interface EditChildModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    childDetails: any; // Using any here for quick prototyping, could be properly typed
}

export const EditChildModal: React.FC<EditChildModalProps> = ({ isOpen, onClose, onSuccess, childDetails }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        caregiver_name: '',
        phone_number: '',
        address: '',
        child_name: '',
        dob: '',
        gender: 'UNKNOWN'
    });

    // Populate form data when the modal opens with specific child details
    useEffect(() => {
        if (isOpen && childDetails) {
            setFormData({
                caregiver_name: childDetails.caregiver_name || '',
                phone_number: childDetails.caregiver_phone || '',
                address: childDetails.address || '',
                child_name: childDetails.child_name || '',
                // Ensure date formatting is YYYY-MM-DD for the input[type="date"]
                dob: childDetails.child_dob ? new Date(childDetails.child_dob).toISOString().split('T')[0] : '',
                gender: childDetails.gender || 'UNKNOWN'
            });
        }
    }, [isOpen, childDetails]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await api.put(`/children/${childDetails.child_id}`, formData);
            onSuccess(); // Triggers a reload of the parent component
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update child details. Please verify inputs.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Edit Patient Records</h2>
                        <p className="text-sm text-slate-500">Update caregiver or child demographic information.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-3">
                            <Activity className="w-5 h-5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Caregiver Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase border-b border-slate-100 pb-2">Caregiver Details</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        required
                                        type="text"
                                        name="caregiver_name"
                                        value={formData.caregiver_name}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        required
                                        type="tel"
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Residential Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Child Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase border-b border-slate-100 pb-2">Child Profile</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Child Name *</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        required
                                        type="text"
                                        name="child_name"
                                        value={formData.child_name}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        required
                                        type="date"
                                        name="dob"
                                        max={new Date().toISOString().split('T')[0]} // Cannot be in future
                                        value={formData.dob}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 text-slate-500 cursor-not-allowed"
                                        title="Date of Birth cannot be modified as it breaks the EPI tracking logic natively."
                                        readOnly
                                    />
                                </div>
                                <p className="text-xs text-rose-500 mt-1 font-medium">DOB modifications are locked to preserve timeline integrity.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="UNKNOWN">Prefer not to say</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};
