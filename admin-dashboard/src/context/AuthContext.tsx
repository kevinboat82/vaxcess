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
