import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Registry from './pages/Registry';
import ChildDetail from './pages/ChildDetail';
import UpcomingTracker from './pages/UpcomingTracker';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registry"
            element={
              <ProtectedRoute>
                <Registry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registry/child/:id"
            element={
              <ProtectedRoute>
                <ChildDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upcoming"
            element={
              <ProtectedRoute>
                <UpcomingTracker />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
