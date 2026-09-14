// ============================================================
//  Dashboard.jsx — Admin Dashboard  (+PAR-Q Health Flags panel)
// ============================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMembers } from '../actions/memberAction';
import { fetchTrainers } from '../actions/trainerAction';
import { fetchSubscriptions } from '../actions/subscriptionAction';
import { fetchPayments } from '../actions/paymentAction';
import { fetchSchedules } from '../actions/schedulesAction';
import { fetchTrainerTimeslots } from '../actions/trainerTimeSlotAction';
import { fetchAllParQ } from '../actions/parqAction';
import { formatDate, formatCurrency, sumBy, getImgUrl } from '../utils';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { getAllComplaints } from '../services/complaintApi';

// ── Gym-themed stat icons ─────────────────────────────────────
function IconMembers() {
  return (
    <svg viewBox="0 0 48 48" fill="none" width="44" height="44">
      <circle cx="18" cy="16" r="7" fill="currentColor" opacity="0.15"/>
      <circle cx="18" cy="16" r="7" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M6 38c0-7 5-12 12-12s12 5 12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="34" cy="18" r="5" fill="currentColor" opacity="0.1"/>
      <circle cx="34" cy="18" r="5" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2"/>
      <path d="M28 38c0-5 2.7-8 6-9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}
function IconTrainers() {
  return (
    <svg viewBox="0 0 48 48" fill="none" width="44" height="44">
      <rect x="8" y="22" width="5" height="10" rx="2.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
      <rect x="5"  y="19" width="4" height="16" rx="2" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2"/>
      <rect x="35" y="22" width="5" height="10" rx="2.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2"/>
      <rect x="39" y="19" width="4" height="16" rx="2" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2"/>
      <rect x="13" y="27" width="22" height="5" rx="2.5" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2"/>
      <circle cx="24" cy="13" r="6" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2"/>
      <path d="M18 38c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconSubscriptions() {
  return (
    <svg viewBox="0 0 48 48" fill="none" width="44" height="44">
      <rect x="6" y="10" width="36" height="28" rx="5" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M6 18h36" stroke="currentColor" strokeWidth="2.5"/>
      <circle cx="15" cy="30" r="4" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="2"/>
      <path d="M13 30l1.5 1.5L17 28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="22" y="27" width="14" height="2.5" rx="1.25" fill="currentColor" opacity="0.4"/>
      <rect x="22" y="32" width="9" height="2" rx="1" fill="currentColor" opacity="0.25"/>
    </svg>
  );
}
function IconRevenue() {
  return (
    <svg viewBox="0 0 48 48" fill="none" width="44" height="44">
      <path d="M24 6v36M32 12H20a6 6 0 000 12h8a6 6 0 010 12H14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M10 34l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      <path d="M38 14l-4-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  );
}

function StatCard({ label, value, sub, accent, icon, onClick }) {
  return (
    <div className="stat-card group" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="absolute top-4 right-4 transition-transform duration-200 group-hover:scale-110" style={{ color: accent }}>{icon}</div>
      <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--gym-muted)' }}>{label}</div>
      <div className="text-4xl font-bold leading-none mb-2" style={{ color: accent, fontFamily: "'Space Mono', monospace" }}>{value}</div>
      <div className="text-xs font-medium" style={{ color: 'var(--gym-muted)' }}>{sub}</div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl opacity-40" style={{ background: accent }} />
    </div>
  );
}

function QAIcon({ type }) {
  const icons = {
    members: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    sub:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
    session: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    rfid:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8L6 7h12l-2-4z"/></svg>,
    workout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/></svg>,
    equip:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  };
  return icons[type] || null;
}

// ── PAR-Q question labels ─────────────────────────────────────
const PARQ_QUESTIONS = [
  { key: 'q1_heart_condition',     short: 'Heart condition (doctor-diagnosed)' },
  { key: 'q2_chest_pain_activity', short: 'Chest pain during activity' },
  { key: 'q3_chest_pain_rest',     short: 'Chest pain at rest (last month)' },
  { key: 'q4_dizziness',           short: 'Dizziness / loss of balance' },
  { key: 'q5_bone_joint',          short: 'Bone or joint problem' },
  { key: 'q6_bp_medication',       short: 'Blood pressure medication' },
  { key: 'q7_other_reason',        short: 'Other reason to avoid exercise' },
];

const isTrue = (v) => String(v) === 'True' || String(v) === 'true' || v === 1 || v === true || v === '1';
const hasRiskFlag = (r) => {
  if (!r) return false;
  const hasYes = isTrue(r.q1_heart_condition) || isTrue(r.q2_chest_pain_activity) ||
                 isTrue(r.q3_chest_pain_rest) || isTrue(r.q4_dizziness) ||
                 isTrue(r.q5_bone_joint) || isTrue(r.q6_blood_pressure_meds) ||
                 isTrue(r.q7_other_reason);
  return hasYes && !isTrue(r.physician_clearance);
};

function ParQDetailModal({ record, onClose }) {
  if (!record) return null;
  const flaggedQs = PARQ_QUESTIONS.filter((q) => record[q.key]);
  return (
    <Modal isOpen onClose={onClose} title={`PAR-Q — ${record.firstName} ${record.lastName}`} maxWidth={500}>
      <div className="modal-body space-y-4">
        {hasRiskFlag(record) ? (
          <div className="p-3 rounded-xl text-sm flex items-start gap-3"
            style={{ background: 'rgba(255,71,71,.08)', border: '1px solid rgba(255,71,71,.25)', color: 'var(--gym-accent2)' }}>
            <span className="text-base mt-0.5">⚠️</span>
            <div>
              <div className="font-semibold mb-1">Health flags detected</div>
              <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>
                This member answered <strong>Yes</strong> to one or more questions.
                {isTrue(record.physician_clearance)
                  ? ' Physician clearance has been provided.'
                  : ' Physician clearance has NOT been confirmed — follow up before intense training.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl text-sm flex items-center gap-3"
            style={{ background: 'rgba(71,255,154,.08)', border: '1px solid rgba(71,255,154,.25)', color: 'var(--gym-success)' }}>
            ✅ No health flags — member cleared for normal activity.
          </div>
        )}

        <div className="space-y-2">
          {PARQ_QUESTIONS.map((q) => (
            <div key={q.key} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'var(--gym-surface2)', border: isTrue(record[q.key]) ? '1px solid rgba(255,71,71,.2)' : '1px solid var(--gym-border)' }}>
              <div className="text-xs" style={{ color: 'var(--gym-text2)' }}>{q.short}</div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                style={{ background: isTrue(record[q.key]) ? 'rgba(255,71,71,.12)' : 'rgba(71,255,154,.1)', color: isTrue(record[q.key]) ? 'var(--gym-accent2)' : 'var(--gym-success)' }}>
                {isTrue(record[q.key]) ? 'YES' : 'NO'}
              </span>
            </div>
          ))}

          {record.q7_other_details && (
            <div className="p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--gym-muted)' }}>Other details:</div>
              <div className="text-sm" style={{ color: 'var(--gym-text)' }}>{record.q7_other_details}</div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
            <div className="text-xs" style={{ color: 'var(--gym-text2)' }}>Physician clearance provided</div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
              style={{ background: record.physician_clearance ? 'rgba(71,255,154,.1)' : 'rgba(255,179,71,.1)', color: record.physician_clearance ? 'var(--gym-success)' : 'var(--gym-warning)' }}>
              {record.physician_clearance ? 'YES' : 'NO'}
            </span>
          </div>
        </div>

        <div className="text-xs text-right" style={{ color: 'var(--gym-muted)' }}>
          Submitted: {record.submitted_date?.substring(0, 10) || '—'} · Updated: {record.updated_date?.substring(0, 10) || '—'}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

export default function Dashboard() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const members       = useSelector((s) => s.members?.data || []);
  const trainers      = useSelector((s) => s.trainers?.data || []);
  const subscriptions = useSelector((s) => s.subscriptions?.data || []);
  const payments      = useSelector((s) => s.payments?.data || []);
  const schedules     = useSelector((s) => s.schedules?.data || []);
  const loading       = useSelector((s) => s.schedules?.loading);
  const trainerTS     = useSelector((s) => s.trainerTimeslots?.data || []);
  const parqAll       = useSelector((s) => s.parq?.all || []);

  const [selectedParQ, setSelectedParQ] = useState(null);
  const [parqFilter,   setParqFilter]   = useState('all'); // 'all' | 'flagged' | 'clear'
  const [parqSearch,   setParqSearch]   = useState('');
  const [complaints,   setComplaints]   = useState([]);

  useEffect(() => {
    getAllComplaints().then(res => {
      const d = res?.data?.ResultSet || res?.data;
      setComplaints(Array.isArray(d) ? d : []);
    }).catch(() => setComplaints([]));
  }, []);

  useEffect(() => {
    dispatch(fetchMembers());
    dispatch(fetchTrainers());
    dispatch(fetchSubscriptions());
    dispatch(fetchPayments());
    dispatch(fetchSchedules());
    dispatch(fetchTrainerTimeslots());
    dispatch(fetchAllParQ());
  }, [dispatch]);

  const totalRevenue    = sumBy((payments || []).filter((p) => (p.payment_status||'').toLowerCase() === 'completed'), 'paymentAmount');
  const activeSubs      = (subscriptions || []).filter((s) => s.is_active).length;
  const pendingSched    = (schedules || []).filter((s) => s.status === 'Pending').length;
  const pendingRequests = (trainerTS || []).filter(t => t.isActive === false || t.isActive === 0 || t.isActive === null);



  const parqWithNames = (parqAll || []).map(r => {
    const m = members.find(m => String(m.userId) === String(r.userId) || String(m.memberId) === String(r.userId)) || {};
    return { ...r, firstName: m.firstName || r.firstName || 'Unknown', lastName: m.lastName || r.lastName || '' };
  });

  const flaggedParQ = parqWithNames.filter(hasRiskFlag);
  
  const filteredParQ = parqWithNames.filter((r) => {
    // Stage 1: Search match
    const searchLow = parqSearch.toLowerCase();
    const matchesSearch = !parqSearch || 
      (r.firstName || '').toLowerCase().includes(searchLow) ||
      (r.lastName || '').toLowerCase().includes(searchLow) ||
      String(r.userId || '').includes(searchLow);
    
    if (!matchesSearch) return false;

    // Stage 2: Category filter
    if (parqFilter === 'flagged') return hasRiskFlag(r);
    if (parqFilter === 'clear')   return !hasRiskFlag(r);
    return true;
  });

  const quickActions = [
    { key: 'members', label: 'Manage Members',   route: '/members',       color: 'var(--gym-warning)' },
    { key: 'sub',     label: 'New Subscription', route: '/subscriptions', color: 'var(--gym-success)' },
    { key: 'session', label: 'Book Session',     route: '/schedules',     color: 'var(--gym-accent3)' },
    { key: 'rfid',    label: 'RFID Attendance',  route: '/rfid',          color: 'var(--gym-accent)' },
    { key: 'workout', label: 'Add Workout',      route: '/workouts',      color: 'var(--gym-success)' },
    { key: 'equip',   label: 'Equipment',        route: '/equipment',     color: 'var(--gym-accent3)' },
  ];

  return (
    <div className="space-y-5">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Members"  value={members.length || '—'} sub="↑ Registered" accent="var(--gym-warning)" icon={<IconMembers />} onClick={() => navigate('/members')} />
        <StatCard label="Active Trainers" value={trainers.length || '—'} sub="Staff" accent="var(--gym-accent3)" icon={<IconTrainers />} onClick={() => navigate('/trainers')} />
        <StatCard label="Active Subs"    value={activeSubs || subscriptions.length || '—'} sub="Active plans" accent="var(--gym-success)" icon={<IconSubscriptions />} onClick={() => navigate('/subscriptions')} />
        <StatCard label="Total Revenue"  value={payments.length ? formatCurrency(totalRevenue) : '—'} sub="All time" accent="var(--gym-accent)" icon={<IconRevenue />} onClick={() => navigate('/payments')} />
      </div>

      {/* ── Main Grid ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Recent Sessions */}
        <div className="gym-card">
          <div className="flex items-center justify-between mb-4">
            <div className="gym-card-title mb-0">Recent Sessions</div>
            {pendingSched > 0 && <span className="badge badge-pending">{pendingSched} pending</span>}
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => (<div key={i} className="flex gap-3 items-center"><div className="skeleton w-2 h-2 rounded-full" /><div className="skeleton h-4 flex-1 rounded" /><div className="skeleton h-4 w-16 rounded" /></div>))}</div>
          ) : schedules.length === 0 ? (
            <div className="py-10 text-center"><div className="text-sm" style={{ color: 'var(--gym-muted)' }}>No schedules found</div></div>
          ) : (
            <div className="space-y-2">
              {schedules.slice(0, 7).map((s) => (
                <div key={s.scheduleId} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: s.status === 'Scheduled' ? 'var(--gym-success)' : s.status === 'Cancelled' ? 'var(--gym-accent2)' : 'var(--gym-warning)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--gym-text)' }}>
                      {s.memberName ? `${s.memberName}` : `Session #${s.scheduleId}`}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--gym-muted)' }}>
                      {s.memberName || `Member #${s.memberId}`}
                      {' · '}
                      {s.trainerName ? `Trainer ${s.trainerName}` : `Trainer #${s.trainerId}`}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(s.scheduleDate)}</span>
                    <Badge variant={s.status === 'Scheduled' ? 'confirmed' : s.status === 'Cancelled' ? 'inactive' : 'pending'}>{s.status || 'Pending'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="gym-card">
          <div className="flex items-center justify-between mb-4">
            <div className="gym-card-title mb-0">Recent Payments</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/payments')}>View All</button>
          </div>
          {payments.length === 0 ? (
            <div className="text-sm text-center py-6" style={{ color: 'var(--gym-muted)' }}>No payments yet.</div>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 5).map((p) => (
                <div key={p.paymentId} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--gym-text)' }}>{p.memberName || 'Member #' + p.subscriptionId}</div>
                    <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{p.planType || '—'} · {p.payment_type || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono" style={{ color: (p.payment_status||'').toLowerCase() === 'completed' ? 'var(--gym-success)' : 'var(--gym-warning)' }}>
                      LKR {parseFloat(p.paymentAmount || 0).toFixed(2)}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{p.payment_date ? p.payment_date.substring(0,10) : '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Complaints */}
        <div className="gym-card">
          <div className="flex items-center justify-between mb-4">
            <div className="gym-card-title mb-0">📋 Recent Complaints</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/complaints')}>View All</button>
          </div>
          {complaints.length === 0 ? (
            <div className="text-sm text-center py-6" style={{ color: 'var(--gym-muted)' }}>No complaints yet.</div>
          ) : (
            <div className="space-y-2">
              {complaints.slice(0, 5).map((c) => (
                <div key={c.complaintId} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'var(--gym-surface2)', border: c.status === 'resolved' ? '1px solid rgba(71,255,154,.15)' : '1px solid var(--gym-border)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--gym-text)' }}>
                      {c.userFullName || `User #${c.userId}`}
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color: 'var(--gym-muted)' }}>
                      {c.type === 'person' ? '👤 Person' : '🌐 Public'} · {c.message?.substring(0, 40)}{c.message?.length > 40 ? '…' : ''}
                    </div>
                  </div>
                  <Badge variant={c.status === 'resolved' ? 'active' : 'pending'}>{c.status || 'pending'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="gym-card">
          <div className="gym-card-title">Quick Actions</div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <button key={a.route} onClick={() => navigate(a.route)}
                className="flex items-center gap-3 p-3 sm:p-4 rounded-xl text-left transition-all duration-150 group"
                style={{ background: 'var(--gym-surface2)', border: `1px solid var(--gym-border2)` }}>
                <span className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: a.color + '18', color: a.color }}><QAIcon type={a.key} /></span>
                <span className="text-xs sm:text-sm font-medium flex-1 leading-tight" style={{ color: 'var(--gym-text2)' }}>{a.label}</span>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--gym-muted)' }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── PAR-Q HEALTH SCREENING PANEL ── */}
      <div className="gym-card" style={{ border: parqAll.length > 0 && flaggedParQ.length > 0 ? '1px solid rgba(255,71,71,.25)' : '1px solid var(--gym-border)' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: flaggedParQ.length > 0 ? 'rgba(255,71,71,.12)' : 'rgba(71,255,154,.1)', color: flaggedParQ.length > 0 ? 'var(--gym-accent2)' : 'var(--gym-success)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div>
              <div className="gym-card-title mb-0">⚕️ PAR-Q Health Screening</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>
                {parqAll.length} submitted · <span style={{ color: flaggedParQ.length > 0 ? 'var(--gym-accent2)' : 'var(--gym-success)' }}>{flaggedParQ.length} flagged</span>
              </div>
            </div>
          </div>

          {/* filter tabs & search */}
          <div className="flex items-center gap-3 flex-wrap">
            <input 
              className="gym-input w-44 text-xs" 
              placeholder="Search member/ID..." 
              value={parqSearch} 
              onChange={(e) => setParqSearch(e.target.value)} 
            />
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
              {[['all', `All (${parqAll.length})`], ['flagged', `⚠ Flagged (${flaggedParQ.length})`], ['clear', `✓ Clear (${parqAll.length - flaggedParQ.length})`]].map(([key, lbl]) => (
                <button key={key} onClick={() => setParqFilter(key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: parqFilter === key ? 'var(--gym-surface)' : 'transparent',
                    color: parqFilter === key ? (key === 'flagged' ? 'var(--gym-accent2)' : key === 'clear' ? 'var(--gym-success)' : 'var(--gym-text)') : 'var(--gym-muted)',
                    border: 'none',
                    boxShadow: parqFilter === key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                  }}>{lbl}</button>
              ))}
            </div>
          </div>
        </div>

        {parqAll.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>
            No PAR-Q submissions yet. Members can complete this from their dashboard.
          </div>
        ) : filteredParQ.length === 0 ? (
          <div className="py-6 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>
            No {parqFilter === 'flagged' ? 'flagged' : 'clear'} records.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredParQ.slice(0, 10).map((r) => (
              <div key={r.parqId}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: 'var(--gym-surface2)', border: hasRiskFlag(r) ? '1px solid rgba(255,71,71,.15)' : '1px solid var(--gym-border)' }}
                onClick={() => setSelectedParQ(r)}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: hasRiskFlag(r) ? 'rgba(255,71,71,.12)' : 'rgba(71,255,154,.1)', color: hasRiskFlag(r) ? 'var(--gym-accent2)' : 'var(--gym-success)', border: `1.5px solid ${hasRiskFlag(r) ? 'rgba(255,71,71,.2)' : 'rgba(71,255,154,.2)'}`, fontFamily: "'Space Mono', monospace" }}>
                  {(r.firstName || 'U').charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--gym-text)' }}>{r.firstName} {r.lastName}</div>
                  <div className="text-xs flex items-center gap-2 flex-wrap" style={{ color: 'var(--gym-muted)' }}>
                    <span>{r.roleName || 'Member'}</span>
                    {hasRiskFlag(r) && (
                      <>
                        <span>·</span>
                        {PARQ_QUESTIONS.filter((q) => isTrue(r[q.key])).map((q) => (
                          <span key={q.key} className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(255,71,71,.1)', color: 'var(--gym-accent2)' }}>{q.short}</span>
                        )).slice(0, 2)}
                        {PARQ_QUESTIONS.filter((q) => isTrue(r[q.key])).length > 2 && (
                          <span className="text-xs" style={{ color: 'var(--gym-accent2)' }}>+{PARQ_QUESTIONS.filter((q) => isTrue(r[q.key])).length - 2} more</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isTrue(r.physician_clearance) && (
                    <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(71,255,154,.1)', color: 'var(--gym-success)' }}>MD ✓</span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-lg font-bold"
                    style={{ background: hasRiskFlag(r) ? 'rgba(255,71,71,.12)' : 'rgba(71,255,154,.1)', color: hasRiskFlag(r) ? 'var(--gym-accent2)' : 'var(--gym-success)' }}>
                    {hasRiskFlag(r) ? '⚠ FLAG' : '✓ CLEAR'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>→</span>
                </div>
              </div>
            ))}

            {filteredParQ.length > 10 && (
              <div className="text-center text-xs pt-2" style={{ color: 'var(--gym-muted)' }}>
                Showing 10 of {filteredParQ.length} records
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Members Grid ── */}
      {members.length > 0 && (
        <div className="gym-card">
          <div className="flex items-center justify-between mb-4">
            <div className="gym-card-title mb-0">Members</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/members')}>View All →</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {members.slice(0, 8).map((m) => {
              const parqRec = parqAll.find((p) => String(p.userId) === String(m.userId));
              return (
                <div key={m.memberId} onClick={() => navigate('/members')}
                  className="p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-150"
                  style={{ background: 'var(--gym-surface2)', border: (Number(parqRec?.physician_clearance) === 0) ? '1px solid rgba(255,71,71,.2)' : '1px solid var(--gym-border)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden mb-3"
                    style={{ background: 'rgba(71,255,154,0.15)', color: 'var(--gym-success)', border: '1.5px solid rgba(71,255,154,0.3)', fontFamily: "'Space Mono', monospace" }}>
                    {m.profile_image ? (
                      <img src={getImgUrl(m.profile_image)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-base">{(m.firstName || 'M').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--gym-text)' }}>{m.firstName} {m.lastName}</div>
                  <div className="text-xs truncate mt-0.5" style={{ color: 'var(--gym-muted)' }}>{m.email || '—'}</div>
                  {parqRec && (
                    <div className="mt-2">
                      <span className="text-xs px-1.5 py-0.5 rounded-lg"
                        style={{ background: (Number(parqRec.physician_clearance) === 0) ? 'rgba(255,71,71,.1)' : 'rgba(71,255,154,.1)', color: (Number(parqRec.physician_clearance) === 0) ? 'var(--gym-accent2)' : 'var(--gym-success)' }}>
                        {(Number(parqRec.physician_clearance) === 0) ? '⚠ PAR-Q Flag' : '✓ PAR-Q Clear'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Trainers Grid ── */}
      {trainers.length > 0 && (
        <div className="gym-card">
          <div className="flex items-center justify-between mb-4">
            <div className="gym-card-title mb-0">Trainers</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/trainers')}>View All →</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {trainers.slice(0, 4).map((t) => (
              <div key={t.trainer_Id} onClick={() => navigate('/trainers')}
                className="p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-150"
                style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden mb-3"
                  style={{ background: 'rgba(71,200,255,0.15)', color: 'var(--gym-accent3)', border: '1.5px solid rgba(71,200,255,0.3)', fontFamily: "'Space Mono', monospace" }}>
                  {t.profile_image ? (
                    <img src={getImgUrl(t.profile_image)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-base">{(t.username || t.firstName || 'T').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--gym-text)' }}>{t.username || `${t.firstName || ''} ${t.lastName || ''}`.trim()}</div>
                <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--gym-accent3)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  {t.experience_years ? `${t.experience_years} yrs exp` : 'Trainer'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PENDING TRAINER REQUESTS */}
      {pendingRequests.length > 0 && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl">
          <h3 className="text-lg font-bold text-yellow-600 mb-3 flex items-center gap-2">
            ⚠️ Pending Trainer Time Slot Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.slice(0, 5).map(req => (
              <div key={req.trainerTimeslot_Id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-yellow-500/20">
                <div>
                  <div className="font-semibold" style={{ color: 'var(--gym-text)' }}>{req.trainerName}</div>
                  <div className="text-sm opacity-70">
                    {req.schedule_type === 'custom' ? `${req.custom_starttime} - ${req.custom_endtime}` : `${req.starttime} - ${req.endtime}`} | {req.selected_days || req.day_of_week}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/timeslots')}>Review Request</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAR-Q Detail Modal */}
      {selectedParQ && <ParQDetailModal record={selectedParQ} onClose={() => setSelectedParQ(null)} />}
    </div>
  );
}