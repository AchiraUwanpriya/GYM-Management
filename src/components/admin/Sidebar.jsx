// ============================================================
//  Sidebar.jsx — Responsive navigation with profile image popup
// ============================================================
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../actions/authAction';
import { ROLES } from '../../../index';
import { getImgUrl } from '../../utils';

const NAV_ADMIN = [
  { section: 'Overview', items: [
    { to: '/dashboard', label: 'Dashboard',   icon: <GridIcon /> },
    { to: '/reports',   label: 'Reports',     icon: <ChartIcon /> },
  ]},
  { section: 'Management', items: [
    { to: '/users',      label: 'Staff / Users', icon: <UserIcon /> },
    { to: '/members',    label: 'Members',       icon: <MemberIcon /> },
    { to: '/trainers',   label: 'Trainers',      icon: <TrainerIcon /> },
    { to: '/health',     label: 'Health Records',icon: <AttendIcon /> },
    { to: '/attendance', label: 'Attendance',    icon: <AttendIcon /> },
    { to: '/complaints', label: 'Complaints',    icon: <ComplaintIcon /> },
  ]},
  { section: 'Sessions', items: [
    { to: '/timeslots', label: 'Trainer Availability Times', icon: <ClockIcon /> },
    { to: '/schedules', label: 'Schedules',  icon: <CalIcon /> },
    { to: '/workouts',  label: 'Workouts',   icon: <DumbIcon /> },
  ]},
  { section: 'Billing', items: [
    { to: '/plans',         label: 'Plans',         icon: <LayersIcon /> },
    { to: '/subscriptions', label: 'Subscriptions', icon: <CardIcon /> },
    { to: '/payments',      label: 'Payments',      icon: <DollarIcon /> },
  ]},
  { section: 'System', items: [
    { to: '/rfid',          label: 'RFID Attendance', icon: <RfidIcon /> },
    { to: '/equipment',     label: 'Equipment',       icon: <GearIcon /> },
    { to: '/devices',       label: 'Devices',         icon: <DeviceIcon /> },
    { to: '/notifications', label: 'Notifications',   icon: <BellIcon /> },
    { to: '/assignments',   label: 'Trainer Availability', icon: <LinkIcon /> },
    { to: '/settings',       label: 'Account Settings', icon: <SettingsIcon /> },
  ]},
];

const NAV_TRAINER = [
  { section: 'Overview', items: [
    { to: '/dashboard', label: 'Dashboard', icon: <GridIcon /> },
  ]},
  { section: 'My Work', items: [
    { to: '/timeslots',  label: 'Trainer Availability Times', icon: <ClockIcon /> },
    { to: '/assignments', label: 'Trainer Availability',    icon: <LinkIcon /> },
    { to: '/schedules',  label: 'Sessions',   icon: <CalIcon /> },
    { to: '/workouts',   label: 'Workouts',   icon: <DumbIcon /> },
    { to: '/attendance', label: 'Attendance', icon: <AttendIcon /> },
    { to: '/complaints', label: 'Complaints', icon: <ComplaintIcon /> },
    { to: '/settings',    label: 'Account Settings', icon: <SettingsIcon /> },
  ]},
  { section: 'Equipment', items: [
    { to: '/equipment', label: 'Equipment Live', icon: <GearIcon /> },
  ]},
];

const NAV_MEMBER = [
  { section: 'Overview', items: [
    { to: '/dashboard', label: 'Dashboard', icon: <GridIcon /> },
  ]},
  { section: 'Membership', items: [
    { to: '/plans',      label: 'Plans',         icon: <LayersIcon /> },
    { to: '/payments',   label: 'Payments',      icon: <DollarIcon /> },
  ]},
  { section: 'Support', items: [
    { to: '/trainers',   label: 'Our Trainers',  icon: <TrainerIcon /> },
    { to: '/schedules',  label: 'My Sessions',   icon: <CalIcon /> },
    { to: '/dashboard?request=session', label: 'Request Session', icon: <LinkIcon /> },
    { to: '/workouts',   label: 'Workouts',      icon: <DumbIcon /> },
    { to: '/equipment',  label: 'Live Floor',    icon: <GearIcon /> },
    { to: '/attendance', label: 'My Attendance', icon: <AttendIcon /> },
    { to: '/complaints', label: 'Complaints',    icon: <ComplaintIcon /> },
    { to: '/trainer-availability', label: 'Trainer Availability', icon: <LinkIcon /> },
    { to: '/settings',    label: 'Account Settings', icon: <SettingsIcon /> },
  ]},
];

// Gym-themed avatar images per role (inline SVG placeholders)
const ROLE_AVATARS = {
  admin:   'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=80&h=80&fit=crop&crop=face',
  trainer: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=80&h=80&fit=crop&crop=face',
  member:  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=80&h=80&fit=crop&crop=face',
};

export default function Sidebar({ onClose }) {
  const user     = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);

  useEffect(() => {
    if (!showProfilePopup) return;
    const handleOutsideClick = (e) => {
      const popup = document.getElementById('profile-popup');
      const toggle = document.getElementById('profile-toggle-btn');
      if (popup && !popup.contains(e.target) && toggle && !toggle.contains(e.target)) {
        setShowProfilePopup(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showProfilePopup]);

  const role = user?.roleName;
  const navGroups =
    role === ROLES.ADMIN   ? NAV_ADMIN :
    role === ROLES.TRAINER ? NAV_TRAINER : NAV_MEMBER;

  const roleLabel =
    role === ROLES.ADMIN   ? 'Administrator' :
    role === ROLES.TRAINER ? 'Trainer' : 'Member';

  const roleKey =
    role === ROLES.ADMIN   ? 'admin' :
    role === ROLES.TRAINER ? 'trainer' : 'member';

  const roleColor =
    role === ROLES.ADMIN   ? 'var(--gym-accent)' :
    role === ROLES.TRAINER ? 'var(--gym-accent3)' : 'var(--gym-success)';

  const handleLogout = () => { dispatch(logoutUser()); navigate('/login'); };

  const handleNavClick = () => {
    // Close mobile sidebar on navigation
    if (window.innerWidth < 1024 && onClose) onClose();
  };

  return (
    <aside className="sidebar" style={{ width: 240, minHeight: '100vh' }}>
      {/* Header: Logo + close button (mobile) */}
      <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid var(--gym-border)' }}>
        <div className="flex items-center gap-3">
          <div style={{ color: 'var(--gym-accent)' }}>
            <svg viewBox="0 0 32 32" fill="none" width="26" height="26">
              <rect x="3"  y="11" width="5" height="10" rx="2" fill="currentColor" opacity="0.9"/>
              <rect x="1"  y="9"  width="3" height="14" rx="1.5" fill="currentColor"/>
              <rect x="24" y="11" width="5" height="10" rx="2" fill="currentColor" opacity="0.9"/>
              <rect x="28" y="9"  width="3" height="14" rx="1.5" fill="currentColor"/>
              <rect x="8"  y="14" width="16" height="4"  rx="2" fill="currentColor" opacity="0.7"/>
            </svg>
          </div>
          <div>
            <div style={{ color: 'var(--gym-accent)', fontFamily: "'Bebas Neue', cursive" }} className="text-lg tracking-widest leading-none">DTS GYM</div>
            <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>Management Portal</div>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          className="lg:hidden p-1.5 rounded-lg"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--gym-muted)', cursor: 'pointer' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Role status badge */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--gym-border)' }}>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: roleColor, boxShadow: `0 0 8px ${roleColor}`, animation: 'pulseDot 2s ease-in-out infinite' }} />
        <span className="text-xs font-medium" style={{ color: roleColor }}>{roleLabel} Active</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group) => (
          <div key={group.section} className="mb-2">
            <div className="nav-section">{group.section}</div>
            {group.items.map((item) => {
              const isItemActive = (() => {
                const [itemPath, itemQuery] = item.to.split('?');
                if (itemQuery) {
                  return location.pathname === itemPath && location.search.includes(itemQuery);
                }
                if (item.to === '/dashboard') {
                  return location.pathname === '/dashboard' && !location.search;
                }
                return location.pathname === item.to;
              })();

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={handleNavClick}
                  className={isItemActive ? 'nav-item nav-item-active flex' : 'nav-item flex'}
                >
                  <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">{item.icon}</span>
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer with profile image popup */}
      <div className="p-3" style={{ borderTop: '1px solid var(--gym-border)', position: 'relative' }}>
        {/* Profile popup */}
        {showProfilePopup && (
          <div
            id="profile-popup"
            className="absolute bottom-full left-3 mb-2 p-4 rounded-2xl z-50"
            style={{ background: 'var(--gym-surface)', border: '1px solid var(--gym-border2)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', minWidth: 200 }}
          >
            {/* Gym / Profile image */}
            <div 
              className="w-full h-24 rounded-xl overflow-hidden mb-3 cursor-pointer transition-transform duration-200 hover:scale-105" 
              style={{ border: '1px solid var(--gym-border)' }}
              onClick={() => {
                if (user?.profile_image) {
                  setZoomImage(getImgUrl(user.profile_image));
                } else {
                  const initials = (user?.username || 'U').charAt(0).toUpperCase();
                  setZoomImage({ initials, color: roleColor, name: user?.username || 'User' });
                }
              }}
            >
              {user?.profile_image ? (
                <img
                  src={getImgUrl(user.profile_image)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.85 }}
                />
              ) : (
                <img
                  src={ROLE_AVATARS[roleKey]}
                  alt="Gym"
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.85 }}
                />
              )}
            </div>
            <div className="text-sm font-bold" style={{ color: 'var(--gym-text)' }}>{user?.username}</div>
            <div className="text-xs mb-3" style={{ color: roleColor }}>{roleLabel}</div>
            <div className="space-y-1.5 text-xs" style={{ color: 'var(--gym-muted)' }}>
              {user?.email && <div className="flex items-center gap-2"><span>✉</span><span className="truncate">{user.email}</span></div>}
              {user?.phone && <div className="flex items-center gap-2"><span>📞</span><span>{user.phone}</span></div>}
            </div>
            <button
              onClick={() => { setShowProfilePopup(false); handleLogout(); }}
              className="mt-3 w-full btn btn-danger btn-sm justify-center"
            >
              Sign Out
            </button>
          </div>
        )}

        <button
          id="profile-toggle-btn"
          className="flex items-center gap-3 p-3 rounded-xl w-full text-left"
          style={{ background: 'var(--gym-surface2)', border: 'none', cursor: 'pointer' }}
          onClick={() => setShowProfilePopup((v) => !v)}
        >
          {/* Avatar with gym image overlay */}
          <div 
            className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer transition-transform duration-200 hover:scale-110" 
            style={{ border: `2px solid ${roleColor}` }}
            onClick={(e) => {
              e.stopPropagation();
              if (user?.profile_image) {
                setZoomImage(getImgUrl(user.profile_image));
              } else {
                const initials = (user?.username || 'U').charAt(0).toUpperCase();
                setZoomImage({ initials, color: roleColor, name: user?.username || 'User' });
              }
            }}
          >
            {user?.profile_image ? (
              <img
                src={getImgUrl(user.profile_image)}
                alt={user?.username || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <img
                  src={ROLE_AVATARS[roleKey]}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.7 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                  style={{ background: roleColor + '33', color: roleColor, fontFamily: "'Space Mono', monospace" }}>
                  {(user?.username || 'U').charAt(0).toUpperCase()}
                </div>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--gym-text)' }}>{user?.username || 'User'}</div>
            <div className="text-xs" style={{ color: roleColor }}>{roleLabel}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            title="Sign out"
            className="flex-shrink-0 p-1.5 rounded-lg transition-colors duration-150"
            style={{ background: 'none', border: 'none', color: 'var(--gym-muted)', cursor: 'pointer' }}
          >
            <LogoutIcon />
          </button>
        </button>
      </div>

      {/* ── Image/Avatar Zoom Lightbox ── */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setZoomImage(null)}
          style={{ 
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out' 
          }}
        >
          <div 
            className="relative max-w-full max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center p-2 bg-neutral-900/50"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              cursor: 'default',
              animation: 'slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {typeof zoomImage === 'string' ? (
              <img 
                src={zoomImage} 
                alt="Profile Zoom" 
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl select-none" 
                onError={() => setZoomImage({ initials: '?', color: roleColor, name: user?.username || 'User' })}
              />
            ) : (
              <div 
                className="w-64 h-64 rounded-2xl flex flex-col items-center justify-center select-none"
                style={{ background: zoomImage.color + '22', border: `2px solid ${zoomImage.color}` }}
              >
                <span className="text-7xl font-bold mb-4" style={{ color: zoomImage.color, fontFamily: "'Space Mono', monospace" }}>
                  {zoomImage.initials}
                </span>
                <span className="text-sm font-semibold opacity-85 px-3 py-1 rounded-full" style={{ background: zoomImage.color + '15', color: zoomImage.color }}>
                  {zoomImage.name || 'User'}
                </span>
              </div>
            )}
            <button 
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-colors duration-150"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function GridIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function ChartIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function UserIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function UsersIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function MemberIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/></svg>; }
function TrainerIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>; }
function LinkIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>; }
function ClockIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>; }
function CalIcon()       { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function DumbIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/></svg>; }
function LayersIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>; }
function CardIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>; }
function DollarIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>; }
function RfidIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8L6 7h12l-2-4z"/></svg>; }
function GearIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function DeviceIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>; }
function LogoutIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function AttendIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>; }
function BellIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>; }
function ComplaintIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="15" r="0.5" fill="currentColor"/></svg>; }
function SettingsIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
