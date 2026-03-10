import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        localStorage.removeItem('vaxcess_admin_token');
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-rose-500" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-2">Something went wrong</h1>
                        <p className="text-slate-500 mb-8 text-sm font-medium">
                            The application encountered an unexpected error. This might be due to an invalid session or temporary connection issue.
                        </p>

                        {import.meta.env.DEV && (
                            <div className="bg-slate-900 text-rose-400 p-4 rounded-xl text-xs font-mono text-left mb-8 overflow-auto max-h-32">
                                {this.state.error?.message}
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reload Application
                            </button>
                            <button
                                onClick={this.handleReset}
                                className="w-full bg-white text-slate-600 border border-slate-200 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-colors text-sm"
                            >
                                Force Sign Out & Reset
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
