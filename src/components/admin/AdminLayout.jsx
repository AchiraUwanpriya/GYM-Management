// ============================================================
//  AdminLayout.jsx — Responsive layout: collapsible sidebar on mobile
// ============================================================
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ToastContainer from '../Toast';

export default function AdminLayout() {
  const theme = useSelector((s) => s.ui.theme);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="gym-layout" data-theme={theme}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on desktop, slide-in on mobile */}
      <div
        className={`fixed lg:relative z-50 lg:z-auto h-full transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ width: 240 }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="gym-main min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="gym-content">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}