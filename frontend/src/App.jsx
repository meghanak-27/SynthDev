import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutGrid, Terminal, ShieldAlert, Cpu, Layers } from 'lucide-react';

import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CreateProgram from './pages/CreateProgram';
import FixBug from './pages/FixBug';
import CreateProject from './pages/CreateProject';
import WorkOnProject from './pages/WorkOnProject';
import { api } from './utils/api';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = api.isAuthenticated();

  const handleLogout = () => {
    api.logout();
    navigate('/auth');
  };

  if (!isAuthenticated || location.pathname === '/auth') return null;

  return (
    <header className="app-header">
      <div className="logo-section" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
        <Cpu size={22} className="cyan" style={{ animation: 'spin 12s linear infinite' }} />
        <span>DevOps Agent Platform</span>
      </div>
      
      <div className="nav-links">
        <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: 'none' }}>
          <LayoutGrid size={16} />
          <span>Dashboard</span>
        </Link>
        <button onClick={handleLogout} className="btn-secondary" style={{ color: 'var(--neon-rose)', borderColor: 'rgba(244,63,94,0.2)' }}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = api.isAuthenticated();
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
};

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-program" 
              element={
                <ProtectedRoute>
                  <CreateProgram />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fix-bug" 
              element={
                <ProtectedRoute>
                  <FixBug />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-project" 
              element={
                <ProtectedRoute>
                  <CreateProject />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/work-on-project/:projectId" 
              element={
                <ProtectedRoute>
                  <WorkOnProject />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
