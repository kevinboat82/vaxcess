import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
    token: string | null;
    isAuthenticated: boolean;
    role: string | null;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('vaxcess_admin_token'));
    const [role, setRole] = useState<string | null>(() => {
        const stored = localStorage.getItem('vaxcess_admin_token');
        if (stored && stored.includes('.')) {
            try {
                const payload = stored.split('.')[1];
                if (payload) {
                    return JSON.parse(atob(payload)).role;
                }
            } catch (e) {
                console.warn('Failed to parse existing token:', e);
                return null;
            }
        }
        return null;
    });

    const login = (newToken: string) => {
        setToken(newToken);
        localStorage.setItem('vaxcess_admin_token', newToken);
        if (newToken && newToken.includes('.')) {
            try {
                const payload = newToken.split('.')[1];
                if (payload) {
                    setRole(JSON.parse(atob(payload)).role);
                }
            } catch (e) {
                console.error('Failed to parse login token:', e);
                setRole(null);
            }
        }
    };

    const logout = () => {
        setToken(null);
        setRole(null);
        localStorage.removeItem('vaxcess_admin_token');
    };

    // Auto-logout after 30 minutes of inactivity
    React.useEffect(() => {
        if (!token) return;

        let timeoutId: number;
        const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

        const resetTimer = () => {
            if (timeoutId) window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                console.log('Logging out due to inactivity');
                logout();
            }, INACTIVITY_LIMIT);
        };

        // Events to listen for activity
        const activityEvents = [
            'mousedown', 'mousemove', 'keypress', 
            'scroll', 'touchstart', 'click'
        ];

        // Initialize timer
        resetTimer();

        // Add event listeners
        activityEvents.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            if (timeoutId) window.clearTimeout(timeoutId);
            activityEvents.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [token]);

    return (
        <AuthContext.Provider value={{ token, isAuthenticated: !!token, role, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
