import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    title: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg lg:text-xl font-semibold text-slate-800 truncate">{title}</h1>
                    </div>
                    <div className="flex items-center gap-3 lg:gap-4 shrink-0">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role</span>
                            <span className="text-sm font-medium text-slate-600">Administrator</span>
                        </div>
                        <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 border-2 border-white shadow-sm"></div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
