import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Heart, Sparkles, Syringe, Baby } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', { username, password });
            login(response.data.token);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to authenticate.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Left Side: Vibrant Animated Graphic Panel (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-indigo-500 via-fuchsia-400 to-rose-400 overflow-hidden items-center justify-center">
                {/* Decorative floating blobs */}
                <div className="absolute top-10 left-10 w-64 h-64 bg-white/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-10 right-10 w-72 h-72 bg-yellow-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />

                <div className="relative z-10 text-center text-white px-12">
                    <div className="relative inline-flex justify-center items-center mb-10 w-48 h-48">
                        {/* Central Animated Illustration Elements */}
                        <div className="absolute inset-0 bg-white/10 rounded-full animate-[ping_3s_ease-in-out_infinite]" />
                        <div className="absolute inset-4 bg-white/20 rounded-full animate-pulse" />
                        <Heart className="w-24 h-24 text-rose-100 fill-rose-100 animate-bounce" />

                        {/* Floating orbiting elements */}
                        <div className="absolute -top-4 -right-4 animate-[bounce_4s_infinite]">
                            <div className="bg-yellow-400 p-3 rounded-2xl shadow-xl transform rotate-12">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="absolute -bottom-4 -left-4 animate-[bounce_5s_infinite]">
                            <div className="bg-emerald-400 p-3 rounded-2xl shadow-xl transform -rotate-12">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="absolute top-1/2 -left-8 -translate-y-1/2 animate-[bounce_6s_infinite]">
                            <div className="bg-indigo-400 p-3 rounded-2xl shadow-xl transform -rotate-6">
                                <Baby className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="absolute top-1/2 -right-8 -translate-y-1/2 animate-[bounce_7s_infinite]">
                            <div className="bg-sky-400 p-3 rounded-2xl shadow-xl transform rotate-6">
                                <Syringe className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <h1 className="text-5xl font-extrabold tracking-tight mb-6 drop-shadow-md leading-tight">
                        Protecting Our Future,<br />One Vaccine At A Time.
                    </h1>
                    <p className="text-xl text-white/90 drop-shadow font-medium max-w-md mx-auto">
                        Timely, safe, and verifiable immunization coverage for every child.
                    </p>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 relative overflow-hidden bg-white">
                {/* Mobile-only background elements - subtler for better performance */}
                <div className="lg:hidden absolute top-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-rose-400/5 blur-[80px]" />
                <div className="lg:hidden absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-indigo-500/5 blur-[80px]" />

                <div className="w-full max-w-md relative z-10 flex flex-col min-h-full sm:min-h-0 justify-center">
                    <div className="flex flex-col items-center mb-6 sm:mb-8">
                        <div className="relative mb-2 flex flex-col justify-center items-center">
                            {/* Beating heart pulsating red gradient */}
                            <div
                                className="absolute w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-tr from-rose-500 to-red-400 rounded-full blur-2xl animate-pulse opacity-60 top-0"
                                style={{ animationDuration: '1.5s' }}
                            />
                            <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl shadow-rose-100 relative z-10 border border-slate-100 mb-4 sm:mb-5">
                                <img src="/vaxcess-logo.png" alt="VaxCess Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md" />
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-2 flex">
                                <span className="text-blue-700">Vax</span>
                                <span className="text-sky-400">Cess</span>
                            </h1>
                            <div className="h-1 w-12 sm:h-1.5 sm:w-16 bg-gradient-to-r from-blue-700 to-sky-400 rounded-full mb-4 sm:mb-6" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Welcome Back</h2>
                        <p className="text-slate-500 font-medium mt-1 text-center text-sm sm:text-base px-4">Health Worker Authentication Portal</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                <ShieldCheck className="w-5 h-5 shrink-0" />
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="username">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3.5 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 placeholder-slate-400 font-medium shadow-sm"
                                    placeholder="Enter your assigned ID"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="password">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3.5 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 placeholder-slate-400 font-medium shadow-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center mt-4 text-lg"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Authenticate"
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col items-center">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <ShieldCheck className="w-5 h-5" />
                            <span className="text-xs font-bold tracking-wider uppercase">Secured by VaxCess Protocol v1.0</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
