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
        if (stored) {
            try { return JSON.parse(atob(stored.split('.')[1])).role; } catch (e) { return null; }
        }
        return null;
    });

    const login = (newToken: string) => {
        setToken(newToken);
        localStorage.setItem('vaxcess_admin_token', newToken);
        try {
            setRole(JSON.parse(atob(newToken.split('.')[1])).role);
        } catch (e) {
            setRole(null);
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
