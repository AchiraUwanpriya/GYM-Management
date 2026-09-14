// ============================================================
//  Topbar.jsx — Responsive with hamburger, route title, theme toggle
// ============================================================
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { setTheme } from '../../actions/uiAction';

const ROUTE_TITLES = {
  '/dashboard':    'Dashboard',
  '/reports':      'Reports & Analytics',
  '/users':        'System Users',
  '/members':      'Members',
  '/trainers':     'Trainers',
  '/assignments':  'Trainer Availability Times',
  '/timeslots':    'Time Slots',
  '/schedules':    'Schedules',
  '/workouts':     'Workout Sessions',
  '/plans':        'Membership Plans',
  '/subscriptions':'Subscriptions',
  '/payments':     'Payments',
  '/rfid':         'RFID Attendance',
  '/equipment':    'Equipment & Live Tracking',
};

export default function Topbar({ onMenuClick }) {
  const user     = useSelector((s) => s.auth.user);
  const theme    = useSelector((s) => s.ui.theme);
  const dispatch = useDispatch();
  const { pathname } = useLocation();

  const title = ROUTE_TITLES[pathname] || 'DTS Gym';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const roleColor =
    user?.roleId === 1 ? 'var(--gym-accent)' :
    user?.roleId === 2 ? 'var(--gym-accent3)' : 'var(--gym-success)';

  const toggleTheme = () => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'));

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 py-3 flex-shrink-0"
      style={{ background: 'var(--gym-surface)', borderBottom: '1px solid var(--gym-border)', minHeight: 60 }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border2)', color: 'var(--gym-text)', cursor: 'pointer' }}
          aria-label="Open navigation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="min-w-0">
          <div className="text-lg sm:text-xl tracking-widest leading-none truncate"
            style={{ fontFamily: "'Bebas Neue', cursive", color: 'var(--gym-text)' }}>
            {title}
          </div>
          <div className="text-xs mt-0.5 hidden sm:block" style={{ color: 'var(--gym-muted)' }}>{today}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <button onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border2)', color: 'var(--gym-muted)', cursor: 'pointer' }}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: roleColor + '20', color: roleColor, border: `1.5px solid ${roleColor}40`, fontFamily: "'Space Mono', monospace" }}>
            {(user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium" style={{ color: 'var(--gym-text)' }}>{user?.username || 'User'}</div>
            <div className="text-xs" style={{ color: roleColor }}>{user?.roleName || 'User'}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>;
}
function MoonIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>;
}
