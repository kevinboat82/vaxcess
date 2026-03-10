import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Syringe, LayoutDashboard, Calendar, X } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { logout } = useAuth();

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 shadow-xl z-50 lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 flex items-center justify-between text-white border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <img src="/vaxcess-logo.png" alt="VaxCess Logo" className="w-8 h-8 object-contain drop-shadow-md" />
                        <span className="text-xl font-bold tracking-tight">VaxCess</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavLink
                        to="/"
                        onClick={() => onClose()}
                        className={({ isActive }) => `flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-medium' : 'hover:bg-slate-800 hover:text-white font-medium'}`}
                        end
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Overview</span>
                    </NavLink>
                    <NavLink
                        to="/registry"
                        onClick={() => onClose()}
                        className={({ isActive }) => `flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 font-medium' : 'hover:bg-slate-800 hover:text-white font-medium'}`}
                    >
                        <Syringe className="w-5 h-5" />
                        <span>Vaccine Registry</span>
                    </NavLink>
                    <NavLink
                        to="/upcoming"
                        onClick={() => onClose()}
                        className={({ isActive }) => `flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-amber-600/10 text-amber-400 border border-amber-500/20 font-medium' : 'hover:bg-slate-800 hover:text-white font-medium'}`}
                    >
                        <Calendar className="w-5 h-5" />
                        <span>Due Tracker</span>
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};
