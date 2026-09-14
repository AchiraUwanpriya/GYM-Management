// ============================================================
//  Reports.jsx — Admin reports with PDF export
//  Endpoints: /Report/*
// ============================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMembers } from '../actions/memberAction';
import { fetchTrainers } from '../actions/trainerAction';
import { fetchPayments } from '../actions/paymentAction';
import { fetchSubscriptions } from '../actions/subscriptionAction';
import { fetchSchedules } from '../actions/schedulesAction';
import { showToast } from '../actions/uiAction';
import { fetchTimeslots } from '../actions/timeslotsAction';
import { fetchTrainerTimeSlots } from '../actions/trainerTimeSlotAction';
import { fetchExercises } from '../actions/exercisesAction';
import { fetchAttendance } from '../actions/attendanceAction';
import { fetchAssignments } from '../actions/trainerAssignmnetAction';
import { fetchWorkouts } from '../actions/nonEquipmentExerciseAction';
import { fetchRfidTags } from '../actions/rfidTagsAction';
import { fetchPlans } from '../actions/planAction';
import { fetchUsers } from '../actions/usersAction';
import { formatCurrency, formatDate, sumBy } from '../utils';
import Badge from '../components/Badge';

// ── StatCard: simple metric tile ──────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--gym-muted)' }}>{label}</div>
      <div className="text-3xl font-bold leading-none mb-1" style={{ color: color || 'var(--gym-accent)', fontFamily: "'Space Mono', monospace" }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>{sub}</div>}
    </div>
  );
}

// ── FilterBar: shared toolbar card used across all tabs ────────
function FilterBar({ left, right }) {
  return (
    <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-4 items-center">{left}</div>
      <div className="flex gap-2 items-center">{right}</div>
    </div>
  );
}

// ── StatusPills: reusable status filter pills ──────────────────
function StatusPills({ filters, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--gym-muted)' }}>Status:</span>
      {filters.map(({ value, label, color, count }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            style={{
              border: `1.5px solid ${isActive ? color : 'var(--gym-border)'}`,
              color: isActive ? color : 'var(--gym-muted)',
              background: isActive ? `${color}18` : 'transparent',
              borderRadius: 9999, padding: '3px 12px', fontSize: 12,
              fontWeight: isActive ? 700 : 500, cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            {label}
            {count !== undefined && (
              <span style={{
                background: isActive ? color : 'var(--gym-border)',
                color: isActive ? '#fff' : 'var(--gym-muted)',
                borderRadius: 9999, padding: '0 6px', fontSize: 10, fontWeight: 700,
              }}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const TABS = [
  { id: 'overview',      label: '📊 Overview' },
  { id: 'members',       label: '👥 Members' },
  { id: 'payments',      label: '💰 Payments' },
  { id: 'subscriptions', label: '📋 Subscriptions' },
  { id: 'trainers',      label: '🏋️ Trainers' },
  { id: 'schedules',     label: '📅 Schedules' },
  { id: 'timeslots',     label: '🕐 Time Slots' },
  { id: 'trainertimeslots', label: '🧑‍🏫 Trainer Time Slots' },
  { id: 'attendance',    label: '✅ Attendance' },
  { id: 'assignments',   label: '🔗 Assignments' },
  { id: 'workouts',      label: '💪 Workouts' },
  { id: 'rfid',          label: '📡 RFID Tags' },
  { id: 'plans',         label: '📦 Plans' },
  { id: 'users',         label: '👤 System Users' },
];

const USER_STATUS_FILTERS = [
  { value: 'all',       label: 'All',       color: 'var(--gym-muted)' },
  { value: 'active',    label: 'Active',    color: 'var(--gym-success)' },
  { value: 'pending',   label: 'Pending',   color: 'var(--gym-warning)' },
  { value: 'inactive',  label: 'Inactive',  color: 'var(--gym-muted)' },
  { value: 'suspended', label: 'Suspended', color: 'var(--gym-accent2)' },
  { value: 'rejected',  label: 'Rejected',  color: 'var(--gym-accent2)' },
  { value: 'deleted',   label: 'Deleted',   color: '#ef4444' },
];

const MEMBER_STATUS_FILTERS = [
  { value: 'all',       label: 'All',       color: 'var(--gym-muted)' },
  { value: 'approved',  label: 'Approved',  color: 'var(--gym-success)' },
  { value: 'pending',   label: 'Pending',   color: 'var(--gym-warning)' },
  { value: 'inactive',  label: 'Inactive',  color: 'var(--gym-muted)' },
  { value: 'rejected',  label: 'Rejected',  color: '#ef4444' },
];

const PAYMENT_STATUS_FILTERS = [
  { value: 'all',       label: 'All',       color: 'var(--gym-muted)' },
  { value: 'completed', label: 'Completed', color: 'var(--gym-success)' },
  { value: 'pending',   label: 'Pending',   color: 'var(--gym-warning)' },
  { value: 'failed',    label: 'Failed',    color: '#ef4444' },
];

const SCHEDULE_STATUS_FILTERS = [
  { value: 'all',       label: 'All',       color: 'var(--gym-muted)' },
  { value: 'Scheduled', label: 'Scheduled', color: 'var(--gym-success)' },
  { value: 'Pending',   label: 'Pending',   color: 'var(--gym-warning)' },
  { value: 'Cancelled', label: 'Cancelled', color: '#ef4444' },
];

const SUB_STATUS_FILTERS = [
  { value: 'all',      label: 'All',      color: 'var(--gym-muted)' },
  { value: 'active',   label: 'Active',   color: 'var(--gym-success)' },
  { value: 'inactive', label: 'Inactive', color: 'var(--gym-muted)' },
];

const PLAN_STATUS_FILTERS = [
  { value: 'all',      label: 'All',      color: 'var(--gym-muted)' },
  { value: 'active',   label: 'Active',   color: 'var(--gym-success)' },
  { value: 'inactive', label: 'Inactive', color: 'var(--gym-muted)' },
];

const RFID_STATUS_FILTERS = [
  { value: 'all',      label: 'All',      color: 'var(--gym-muted)' },
  { value: 'active',   label: 'Active',   color: 'var(--gym-success)' },
  { value: 'deleted',  label: 'Deleted',  color: '#ef4444' },
];

const ASSIGN_STATUS_FILTERS = [
  { value: 'all',      label: 'All',      color: 'var(--gym-muted)' },
  { value: 'active',   label: 'Active',   color: 'var(--gym-success)' },
  { value: 'inactive', label: 'Inactive', color: 'var(--gym-muted)' },
];

const WORKOUT_STATUS_FILTERS = [
  { value: 'all',       label: 'All',       color: 'var(--gym-muted)' },
  { value: 'completed', label: 'Completed', color: 'var(--gym-success)' },
  { value: 'pending',   label: 'Pending',   color: 'var(--gym-warning)' },
];

const ATTENDANCE_STATUS_FILTERS = [
  { value: 'all',    label: 'All',    color: 'var(--gym-muted)' },
  { value: 'inside', label: 'Inside', color: 'var(--gym-success)' },
  { value: 'left',   label: 'Left',   color: 'var(--gym-muted)' },
];

// FIX: Trainers had no status filter at all — every trainer showed
// regardless of active/pending/inactive. Mirrors the status domain used on
// the real Trainers admin page (active / pending / inactive).
const TRAINER_STATUS_FILTERS = [
  { value: 'all',      label: 'All',      color: 'var(--gym-muted)' },
  { value: 'active',   label: 'Active',   color: 'var(--gym-success)' },
  { value: 'pending',  label: 'Pending',  color: 'var(--gym-warning)' },
  { value: 'inactive', label: 'Inactive', color: 'var(--gym-muted)' },
];

const TRAINER_TS_STATUS_FILTERS = [
  { value: 'all',      label: 'All',      color: 'var(--gym-muted)' },
  { value: 'active',   label: 'Active',   color: 'var(--gym-success)' },
  { value: 'approved', label: 'Approved', color: 'var(--gym-success)' },
  { value: 'pending',  label: 'Pending',  color: 'var(--gym-warning)' },
  { value: 'rejected', label: 'Rejected', color: 'var(--gym-accent2)' },
  { value: 'deleted',  label: 'Deleted',  color: '#ef4444' },
];

export default function Reports() {
  const dispatch = useDispatch();
  const members       = useSelector((s) => s.members.data);
  const trainers      = useSelector((s) => s.trainers.data);
  const payments      = useSelector((s) => s.payments.data);
  const subscriptions = useSelector((s) => s.subscriptions.data);
  const schedules     = useSelector((s) => s.schedules.data);
  const timeslots     = useSelector((s) => s.timeslots?.data || []);
  const trainerTimeslots = useSelector((s) => s.trainerTimeslots?.data || []);
  const exercises     = useSelector((s) => s.exercises?.data || []);
  const attendance    = useSelector((s) => s.allAttendance?.data || s.attendance?.data || []);
  const assignments   = useSelector((s) => s.assignments?.data || []);
  const workouts      = useSelector((s) => s.workouts?.data || []);
  const rfidTags      = useSelector((s) => s.rfidTags?.data || []);
  const plans         = useSelector((s) => s.plans?.data || []);
  const users         = useSelector((s) => s.users.data);
  const adminId       = useSelector((s) => s.ui.currentUserId);

  const [activeTab,           setActiveTab]           = useState('overview');
  const [dateFrom,            setDateFrom]            = useState('');
  const [dateTo,              setDateTo]              = useState('');

  // Per-tab search
  const [memSearch,           setMemSearch]           = useState('');
  const [paySearch,           setPaySearch]           = useState('');
  const [subSearch,           setSubSearch]           = useState('');
  const [trainerSearch,       setTrainerSearch]       = useState('');
  const [schedSearch,         setSchedSearch]         = useState('');
  const [attendSearch,        setAttendSearch]        = useState('');
  const [assignSearch,        setAssignSearch]        = useState('');
  const [workoutSearch,       setWorkoutSearch]       = useState('');
  const [rfidSearch,          setRfidSearch]          = useState('');
  const [planSearch,          setPlanSearch]          = useState('');
  const [trainerTsSearch,     setTrainerTsSearch]     = useState('');

  // Per-tab status filters
  const [memStatusFilter,     setMemStatusFilter]     = useState('all');
  const [payStatusFilter,     setPayStatusFilter]     = useState('all');
  const [subStatusFilter,     setSubStatusFilter]     = useState('all');
  const [schedStatusFilter,   setSchedStatusFilter]   = useState('all');
  const [assignStatusFilter,  setAssignStatusFilter]  = useState('all');
  const [workoutStatusFilter, setWorkoutStatusFilter] = useState('all');
  const [rfidStatusFilter,    setRfidStatusFilter]    = useState('all');
  const [planStatusFilter,    setPlanStatusFilter]    = useState('all');
  const [attendStatusFilter,  setAttendStatusFilter]  = useState('all');
  const [userStatusFilter,    setUserStatusFilter]    = useState('all');
  const [trainerStatusFilter, setTrainerStatusFilter] = useState('all');
  const [trainerTsStatusFilter, setTrainerTsStatusFilter] = useState('all');

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    dispatch(fetchMembers());
    dispatch(fetchTrainers());
    dispatch(fetchPayments());
    dispatch(fetchSubscriptions());
    dispatch(fetchSchedules());
    dispatch(fetchTimeslots());
    dispatch(fetchTrainerTimeSlots());
    dispatch(fetchExercises());
    dispatch(fetchAttendance());
    dispatch(fetchAssignments());
    dispatch(fetchWorkouts());
    dispatch(fetchRfidTags());
    dispatch(fetchPlans());
    dispatch(fetchUsers());
  }, [dispatch]);

  // Enrich members and trainers with linked User row (email, phone, profile image, names)
  const enrichedMembers = (members || []).map((m) => {
    const u = (users || []).find((x) => String(x.userId) === String(m.userId));
    return {
      ...m,
      firstName: m.firstName || u?.firstName || '',
      lastName:  m.lastName  || u?.lastName  || '',
      email:     m.email     || u?.email    || '',
      phone:     m.phone     || u?.phone    || '',
      profile_image: m.profile_image || u?.profile_image || '',
    };
  });

  const enrichedTrainers = (trainers || []).map((t) => {
    const u = (users || []).find((x) => String(x.userId) === String(t.userId));
    return {
      ...t,
      username: t.username || u?.username || `${t.firstName || u?.firstName || ''} ${t.lastName || u?.lastName || ''}`.trim(),
      email:    t.email    || u?.email || '',
      phone:    t.phone    || u?.phone || '',
      profile_image: t.profile_image || u?.profile_image || '',
      // FIX: TrainerModel has no created/joined date of its own — the only
      // record of when a trainer joined lives on their linked User row.
      // Needed so the Trainers report can honor the date-range filter like
      // every other tab.
      joinDate: t.joinDate || u?.created_date || '',
    };
  });

  // Helper maps and resolvers
  const memberMap = new Map((enrichedMembers || []).map(m => [String(m.memberId), m]));
  const trainerMap = new Map((enrichedTrainers || []).map(t => [String(t.trainerId), t]));
  const planMap = new Map((plans || []).map(p => [String(p.planId || p.id), p]));
  const timeslotMap = new Map((timeslots || []).map(ts => [String(ts.timeslot_Id || ts.timeslotId || ts.id), ts]));
  const exerciseMap = new Map((exercises || []).map(ex => [String(ex.exerciseId || ex.exercise_Id || ex.id), ex]));
  // FIX: [NonEquipmentExercise] (the real "Workouts" table) has no member
  // or trainer column at all — only scheduleId. Member and "assigned by
  // trainer" must be resolved by hopping Workout -> Schedule -> Member/Trainer.
  const scheduleMap = new Map((schedules || []).map(s => [String(s.scheduleId || s.id), s]));
  // FIX: [Payment] has no memberId/planId columns of its own — only
  // subscriptionId. Member and plan must be resolved by hopping through
  // Subscription (subscriptionId -> memberId / planId). Without this map,
  // every payment row showed "—" for both Member and Plan.
  const subscriptionMap = new Map((subscriptions || []).map(s => [String(s.subscriptionId || s.id), s]));
  const rfidMap = new Map((rfidTags || []).map(t => [String(t.rfId_Id || t.rfidId), t]));

  const getMemberNameById = (id) => {
    if (!id) return '—';
    const m = memberMap.get(String(id));
    if (m) return `${m.firstName || ''} ${m.lastName || ''}`.trim() || `#${id}`;
    return `#${id}`;
  };
  const getTrainerNameById = (id) => {
    if (!id) return '—';
    const t = trainerMap.get(String(id));
    if (t) return t.username || `${t.firstName || ''} ${t.lastName || ''}`.trim() || `#${id}`;
    return `#${id}`;
  };
  const getPlanNameById = (id) => {
    if (!id) return '—';
    const p = planMap.get(String(id));
    if (p) return p.planName || p.plan_name || p.name || `Plan #${id}`;
    return `Plan #${id}`;
  };
  const getTimeslotRangeById = (id) => {
    const ts = timeslotMap.get(String(id));
    if (!ts) return '—';
    return `${ts.starttime || ts.startTime || '—'} – ${ts.endtime || ts.endTime || '—'}`;
  };
  const getExerciseNameById = (id) => {
    if (!id) return `#${id}`;
    const e = exerciseMap.get(String(id));
    if (e) return e.exerciseName || e.ExerciseName || `#${id}`;
    return `#${id}`;
  };
  const getRfidNumberById = (id) => {
    if (!id) return null;
    const tag = rfidMap.get(String(id));
    return tag ? (tag.rfid_number || tag.rfidNumber) : null;
  };

  // FIX: Payment rows only carry subscriptionId — member/plan must be
  // resolved by hopping Payment -> Subscription -> Member/Plan. These two
  // helpers centralize that hop so every payment table/PDF stays correct
  // even if a payment row happens to include a direct memberId later.
  const getMemberNameForPayment = (p) => {
    if (p.memberName) return p.memberName;
    const directId = p.memberId || p.member_Id || p.p_member_id;
    if (directId) return getMemberNameById(directId);
    const sub = subscriptionMap.get(String(p.subscriptionId || p.p_subscription_id));
    if (sub) return getMemberNameById(sub.memberId || sub.p_member_id);
    return '—';
  };
  const getPlanNameForPayment = (p) => {
    if (p.planName) return p.planName;
    if (p.planType) return p.planType;
    const directPlanId = p.planId || p.plan_id;
    if (directPlanId) return getPlanNameById(directPlanId);
    const sub = subscriptionMap.get(String(p.subscriptionId || p.p_subscription_id));
    if (sub) return getPlanNameById(sub.planId || sub.plan_id);
    return '—';
  };

  // FIX: Workout rows only carry scheduleId — member and the trainer who
  // assigned the workout must be resolved by hopping through Schedule.
  const getMemberNameForWorkout = (w) => {
    if (w.memberName) return w.memberName;
    const sched = scheduleMap.get(String(w.scheduleId || w.p_schedule_id || w.schedule_id));
    if (sched) return getMemberNameById(sched.memberId || sched.p_member_id);
    return '—';
  };
  const getAssignedByForWorkout = (w) => {
    if (w.trainerName) return w.trainerName;
    const sched = scheduleMap.get(String(w.scheduleId || w.p_schedule_id || w.schedule_id));
    if (sched) return getTrainerNameById(sched.trainerId || sched.p_trainer_id);
    return '—';
  };

  const pickFirst = (obj, keys) => {
    if (!obj) return undefined;
    for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    return undefined;
  };

  // FIX: RfidTagModel carries memberId AND trainerId (a tag can be issued to
  // either), but the report never resolved either one to a name — every
  // row just showed the raw RFID number with no indication of who it
  // belongs to. Resolve whichever side is populated.
  const getRfidOwner = (t) => {
    if (t.memberId) return { type: 'Member', label: getMemberNameById(t.memberId) };
    if (t.trainerId) return { type: 'Trainer', label: getTrainerNameById(t.trainerId) };
    return { type: null, label: 'Unassigned' };
  };

  // FIX: AttendanceModel returns the field as camelCase `checkOutTime` (and
  // some callers only ever populate `checkOut`) but every place in this
  // report that decided "Inside" vs "Left" tested the snake_case
  // `check_out_time`, which is never actually set on the object. That
  // condition was therefore always false, so the report showed every
  // single member as "Inside" no matter their real status. Centralize the
  // real check here and use it everywhere instead of the raw field.
  const getAttendanceCheckOut = (a) => a.check_out_time || a.checkOutTime || a.checkOut || '';
  const isAttendanceInside = (a) => !getAttendanceCheckOut(a);

  const totalRevenue = sumBy(payments.filter((p) => (p.payment_status||'').toLowerCase()==='completed'), 'paymentAmount');
  const activeSubs   = subscriptions.filter((s) => s.is_active).length;
  const pendingSch   = schedules.filter((s) => s.status === 'Pending').length;
  const completedSch = schedules.filter((s) => s.status === 'Scheduled').length;
  const avgPayment   = payments.length ? totalRevenue / payments.filter((p)=>(p.payment_status||'').toLowerCase()==='completed').length || 0 : 0;

  // Monthly revenue
  const monthlyRevenue = (() => {
    const map = {};
    payments.forEach((p) => {
      if (!p.payment_date || (p.payment_status||'').toLowerCase() !== 'completed') return;
      const key = p.payment_date.substring(0, 7);
      map[key] = (map[key] || 0) + parseFloat(p.paymentAmount || 0);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  })();
  const maxMonth = Math.max(...monthlyRevenue.map((m) => m[1]), 1);

  // Plan distribution
  const planDist = (() => {
    const map = {};
    subscriptions.forEach((s) => { const k = s.planType || `Plan #${s.planId}`; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  })();
  const maxPlan = Math.max(...planDist.map((p) => p[1]), 1);

  // ── FILTERED DATA ──────────────────────────────────────────

  const filteredMembers = (enrichedMembers || members || []).filter((m) => {
    if (memSearch && !(m.firstName + ' ' + m.lastName).toLowerCase().includes(memSearch.toLowerCase()) && !(m.email || '').toLowerCase().includes(memSearch.toLowerCase())) return false;
    if (memStatusFilter !== 'all' && (m.status || 'inactive').toLowerCase() !== memStatusFilter) return false;
    if (dateFrom && m.joinDate && m.joinDate.substring(0, 10) < dateFrom) return false;
    if (dateTo && m.joinDate && m.joinDate.substring(0, 10) > dateTo) return false;
    return true;
  });

  const filteredPayments = payments.filter((p) => {
    if (paySearch) {
      const memberName = getMemberNameForPayment(p).toLowerCase();
      const planName = getPlanNameForPayment(p).toLowerCase();
      const q = paySearch.toLowerCase();
      if (!memberName.includes(q) && !planName.includes(q) && !String(p.paymentId).includes(paySearch)) return false;
    }
    if (payStatusFilter !== 'all' && (p.payment_status || '').toLowerCase() !== payStatusFilter) return false;
    if (dateFrom && p.payment_date && p.payment_date < dateFrom) return false;
    if (dateTo   && p.payment_date && p.payment_date.substring(0,10) > dateTo) return false;
    return true;
  });

  const filteredSubscriptions = subscriptions.filter((s) => {
    if (subSearch) {
      const q = subSearch.toLowerCase();
      const memberName = (s.memberName || getMemberNameById(s.memberId || s.p_member_id) || '').toLowerCase();
      const planName = (s.planType || getPlanNameById(s.planId || s.plan_id) || '').toLowerCase();
      if (!memberName.includes(q) && !planName.includes(q)) return false;
    }
    if (subStatusFilter !== 'all') {
      const isActive = s.is_active;
      if (subStatusFilter === 'active' && !isActive) return false;
      if (subStatusFilter === 'inactive' && isActive) return false;
    }
    if (dateFrom && s.startDate && s.startDate.substring(0,10) < dateFrom) return false;
    if (dateTo   && s.startDate && s.startDate.substring(0,10) > dateTo)   return false;
    return true;
  });

  const filteredTrainers = (enrichedTrainers || trainers || []).filter((t) => {
    if (trainerSearch && !(t.username || '').toLowerCase().includes(trainerSearch.toLowerCase()) && !(t.email || '').toLowerCase().includes(trainerSearch.toLowerCase())) return false;
    // FIX: no status filter existed — every trainer (active, pending,
    // inactive) always showed together.
    if (trainerStatusFilter !== 'all' && (t.status || 'pending').toLowerCase() !== trainerStatusFilter) return false;
    if (dateFrom && t.joinDate && t.joinDate.substring(0, 10) < dateFrom) return false;
    if (dateTo   && t.joinDate && t.joinDate.substring(0, 10) > dateTo)   return false;
    return true;
  });

  const filteredSchedules = schedules.filter((s) => {
    if (schedSearch && !(s.memberName || '').toLowerCase().includes(schedSearch.toLowerCase()) && !(s.trainerName || '').toLowerCase().includes(schedSearch.toLowerCase())) return false;
    if (schedStatusFilter !== 'all' && s.status !== schedStatusFilter) return false;
    if (dateFrom && s.scheduleDate && s.scheduleDate.substring(0,10) < dateFrom) return false;
    if (dateTo   && s.scheduleDate && s.scheduleDate.substring(0,10) > dateTo)   return false;
    return true;
  });

  const filteredAttendance = attendance.filter((a) => {
    if (attendSearch && !(a.memberName || '').toLowerCase().includes(attendSearch.toLowerCase())) return false;
    if (attendStatusFilter !== 'all') {
      const isInside = isAttendanceInside(a);
      if (attendStatusFilter === 'inside' && !isInside) return false;
      if (attendStatusFilter === 'left'   && isInside)  return false;
    }
    const checkIn = a.check_in_time || a.checkInTime || a.checkIn || '';
    if (dateFrom && checkIn && checkIn.substring(0,10) < dateFrom) return false;
    if (dateTo   && checkIn && checkIn.substring(0,10) > dateTo)   return false;
    return true;
  });

  const filteredAssignments = assignments.filter((a) => {
    if (assignSearch && !(a.memberName || '').toLowerCase().includes(assignSearch.toLowerCase()) && !(a.trainerName || '').toLowerCase().includes(assignSearch.toLowerCase())) return false;
    if (assignStatusFilter !== 'all') {
      const isActive = a.is_active !== false;
      if (assignStatusFilter === 'active'   && !isActive) return false;
      if (assignStatusFilter === 'inactive' && isActive)  return false;
    }
    if (dateFrom && a.assignment_date && a.assignment_date.substring(0,10) < dateFrom) return false;
    if (dateTo   && a.assignment_date && a.assignment_date.substring(0,10) > dateTo)   return false;
    return true;
  });

  const filteredWorkouts = workouts.filter((w) => {
    if (workoutSearch) {
      const q = workoutSearch.toLowerCase();
      const exerciseName = (w.exerciseName || getExerciseNameById(w.exercise_Id || w.exerciseId) || '').toLowerCase();
      const memberName = getMemberNameForWorkout(w).toLowerCase();
      if (!exerciseName.includes(q) && !memberName.includes(q)) return false;
    }
    if (workoutStatusFilter !== 'all' && (w.sub_status || 'pending').toLowerCase() !== workoutStatusFilter) return false;
    // FIX: workouts never respected the global date range at all.
    // NonEquipmentExerciseModel exposes the session's scheduleDate
    // directly; fall back to created_date if that's ever blank.
    const workoutDate = w.scheduleDate || w.created_date || '';
    if (dateFrom && workoutDate && workoutDate.substring(0,10) < dateFrom) return false;
    if (dateTo   && workoutDate && workoutDate.substring(0,10) > dateTo)   return false;
    return true;
  });

  const filteredTrainerTimeslots = trainerTimeslots.filter((tts) => {
    if (trainerTsSearch) {
      const q = trainerTsSearch.toLowerCase();
      const trainerName = getTrainerNameById(tts.trainer_Id || tts.trainerId).toLowerCase();
      if (!trainerName.includes(q)) return false;
    }
    if (trainerTsStatusFilter !== 'all') {
      const ttsIsActive = String(tts.isActive) === '1' || String(tts.isActive).toLowerCase() === 'true';
      const ttsIsDeleted = !!tts.deleted_at;
      if (trainerTsStatusFilter === 'active') {
        const isApprovedOrActive = (tts.status || '').toLowerCase() === 'approved' || (tts.status || '').toLowerCase() === 'active';
        if (!ttsIsActive || ttsIsDeleted || !isApprovedOrActive) return false;
      } else if (trainerTsStatusFilter === 'deleted') {
        if (!ttsIsDeleted) return false;
      } else {
        if (ttsIsDeleted) return false;
        if ((tts.status || 'pending').toLowerCase() !== trainerTsStatusFilter) return false;
      }
    }
    // FIX: date range never applied here. Custom (one-off) slots carry a
    // real start_date; recurring weekly slots don't have one, so we fall
    // back to created_date rather than excluding a slot we can't evaluate.
    const refDate = tts.start_date || tts.created_date || '';
    if (dateFrom && refDate && refDate.substring(0,10) < dateFrom) return false;
    if (dateTo   && refDate && refDate.substring(0,10) > dateTo)   return false;
    return true;
  });

  const filteredRfid = rfidTags.filter((t) => {
    if (rfidSearch && !(t.rfid_number || '').toLowerCase().includes(rfidSearch.toLowerCase())) return false;
    if (rfidStatusFilter !== 'all') {
      // isActive comes from backend as a string ("1"/"0" or "True"/"False")
      const isActive = String(t.isActive) === '1' || String(t.isActive).toLowerCase() === 'true';
      if (rfidStatusFilter === 'active'  && !isActive) return false;
      if (rfidStatusFilter === 'deleted' && isActive)  return false;
    }
    if (dateFrom && t.issueDate && t.issueDate.substring(0,10) < dateFrom) return false;
    if (dateTo   && t.issueDate && t.issueDate.substring(0,10) > dateTo)   return false;
    return true;
  });

  const filteredPlans = plans.filter((p) => {
    if (planSearch && !(p.planName || p.plan_name || '').toLowerCase().includes(planSearch.toLowerCase()) && !(p.planType || p.plan_type || '').toLowerCase().includes(planSearch.toLowerCase())) return false;
    if (planStatusFilter !== 'all') {
      const status = (p.status || 'active').toLowerCase();
      if (planStatusFilter === 'active'   && status !== 'active')   return false;
      if (planStatusFilter === 'inactive' && status === 'active')   return false;
    }
    // FIX: date range never applied to plans.
    if (dateFrom && p.created_date && p.created_date.substring(0,10) < dateFrom) return false;
    if (dateTo   && p.created_date && p.created_date.substring(0,10) > dateTo)   return false;
    return true;
  });

  const filteredUsers = users.filter((u) => {
    if (userStatusFilter !== 'all' && (u.status || 'active').toLowerCase() !== userStatusFilter) return false;
    if (dateFrom && u.created_date && u.created_date.substring(0, 10) < dateFrom) return false;
    if (dateTo   && u.created_date && u.created_date.substring(0, 10) > dateTo)   return false;
    return true;
  });

  // ── HELPERS ────────────────────────────────────────────────

  const getStatusVariant = (status) => {
    const n = String(status || '').toLowerCase();
    if (n === 'active' || n === 'approved' || n === 'assigned') return 'active';
    if (n === 'pending') return 'pending';
    if (n === 'rejected' || n === 'suspended' || n === 'deleted') return 'rejected';
    return 'inactive';
  };

  const CountTag = ({ shown, total }) => (
    <span className="text-sm" style={{ color: 'var(--gym-muted)' }}>
      {shown === total ? `${total} records` : `${shown} of ${total}`}
    </span>
  );

  // ── EXPORTS ────────────────────────────────────────────────

  const buildAndPrintHtml = (html, toastMsg) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) win.onload = () => { win.focus(); win.print(); };
    URL.revokeObjectURL(url);
    dispatch(showToast(toastMsg, 'success'));
  };

  // Shared print stylesheet — identical visual language as mem.pdf
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; padding: 36px 40px; }
    /* ── Header ── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2.5px solid #7c3aed; padding-bottom: 18px; }
    .logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .logo-icon { width: 34px; height: 34px; background: linear-gradient(135deg,#7c3aed,#a855f7); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .logo-text { font-size: 20px; font-weight: 700; color: #7c3aed; letter-spacing: -0.3px; }
    .report-subtitle { font-size: 12.5px; color: #555; margin-top: 2px; }
    .report-subtitle strong { color: #1a1a2e; font-weight: 600; }
    .meta { font-size: 11px; color: #666; text-align: right; line-height: 2; }
    .meta span { display: block; }
    /* ── Summary pills ── */
    .summary { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 22px; }
    .pill { background: #f5f3ff; border: 1px solid #ede9fe; border-radius: 10px; padding: 10px 20px; min-width: 110px; }
    .pill strong { display: block; font-size: 22px; font-weight: 700; color: #7c3aed; line-height: 1.2; }
    .pill span { font-size: 11px; color: #6b7280; margin-top: 2px; display: block; }
    .pill-green  { background: #f0fdf4; border-color: #bbf7d0; }
    .pill-green strong { color: #16a34a; }
    .pill-amber  { background: #fffbeb; border-color: #fde68a; }
    .pill-amber strong { color: #d97706; }
    .pill-blue   { background: #eff6ff; border-color: #bfdbfe; }
    .pill-blue strong  { color: #2563eb; }
    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    thead tr { background: #7c3aed; color: #fff; }
    th { padding: 9px 13px; text-align: left; font-size: 10.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; white-space: nowrap; }
    td { padding: 8.5px 13px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; color: #374151; font-size: 11.5px; }
    tr:nth-child(even) td { background: #fafafa; }
    tr:last-child td { border-bottom: none; }
    td.id-cell { font-size: 11px; color: #6b7280; font-weight: 500; white-space: nowrap; }
    td.name-cell { font-weight: 600; color: #111827; }
    td.mono { font-family: 'Courier New', monospace; font-size: 11px; }
    td.muted { color: #9ca3af; }
    td.accent { color: #7c3aed; font-weight: 600; }
    td.green  { color: #16a34a; font-weight: 600; }
    td.red    { color: #dc2626; }
    /* ── Badges ── */
    .badge { display: inline-block; padding: 2.5px 9px; border-radius: 99px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
    .b-active, .b-approved, .b-scheduled, .b-completed, .b-inside, .b-assigned
                        { background: #dcfce7; color: #15803d; }
    .b-pending          { background: #fef9c3; color: #a16207; }
    .b-inactive, .b-left{ background: #f3f4f6; color: #6b7280; }
    .b-rejected, .b-failed, .b-cancelled
                        { background: #fee2e2; color: #b91c1c; }
    .b-suspended        { background: #fce7f3; color: #9d174d; }
    .b-deleted          { background: #fce7f3; color: #9d174d; }
    /* ── Footer ── */
    .footer { margin-top: 30px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 18px 22px; }
      @page { margin: 12mm; }
    }
  `;

  // Shared helpers
  const pdfDate = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateRange = () => (dateFrom || dateTo) ? ` &nbsp;·&nbsp; ${dateFrom || 'Start'} → ${dateTo || 'End'}` : '';
  const capFirst  = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  const pdfHeader = (reportTitle, filterLabel, count, extraPills = '') => `
    <div class="header">
      <div>
        <div class="logo-row">
          <div class="logo-icon">🏋️</div>
          <span class="logo-text">DTS GYM</span>
        </div>
        <div class="report-subtitle">${reportTitle} &nbsp;—&nbsp; <strong>${filterLabel}</strong></div>
      </div>
      <div class="meta">
        <span>Generated: ${pdfDate()}</span>
        <span>Filter: ${filterLabel}${dateRange()}</span>
        <span>Total Records: <strong>${count}</strong></span>
      </div>
    </div>
    <div class="summary">
      <div class="pill"><strong>${count}</strong><span>${filterLabel} Records</span></div>
      ${extraPills}
    </div>`;

  const pdfFooter = () => `
    <div class="footer">
      <span>DTS GYM Management System</span>
      <span>Confidential</span>
      <span>${pdfDate()}</span>
    </div>`;

  const pdfWrap = (title, body) =>
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title><style>${CSS}</style></head><body>${body}${pdfFooter()}</body></html>`;

  const badgeClass = (status) => {
    const s = String(status || '').toLowerCase().replace(/\s/g, '');
    return `b-${s}`;
  };

  // ── MEMBERS PDF ──
  const downloadMembersPdf = () => {
    if (filteredMembers.length === 0) { dispatch(showToast('No members to export.', 'error')); return; }
    const label = memStatusFilter === 'all' ? 'All' : capFirst(memStatusFilter);
    const approved = filteredMembers.filter((m) => (m.status||'').toLowerCase() === 'approved').length;
    const pending  = filteredMembers.filter((m) => (m.status||'').toLowerCase() === 'pending').length;
    const rows = filteredMembers.map((m) => `<tr>
      <td class="id-cell">#${m.memberId}</td>
      <td class="name-cell">${m.firstName||''} ${m.lastName||''}</td>
      <td>${m.email||'—'}</td>
      <td class="mono">${m.phone||'—'}</td>
      <td>${m.blood_group||'—'}</td>
      <td class="muted">${m.joinDate?m.joinDate.substring(0,10):'—'}</td>
      <td><span class="badge ${badgeClass(m.status)}">${m.status||'inactive'}</span></td>
    </tr>`).join('');
    buildAndPrintHtml(pdfWrap(`DTS GYM — ${label} Members`, `
      ${pdfHeader('Members Report', label, filteredMembers.length,
        `<div class="pill pill-green"><strong>${approved}</strong><span>Approved</span></div>
         <div class="pill pill-amber"><strong>${pending}</strong><span>Pending</span></div>`)}
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Blood</th><th>Joined</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredMembers.length} members`);
  };

  // ── PAYMENTS PDF ──
  const downloadPaymentsPdf = () => {
    if (filteredPayments.length === 0) { dispatch(showToast('No payments to export.', 'error')); return; }
    const label    = payStatusFilter === 'all' ? 'All' : capFirst(payStatusFilter);
    const completed = filteredPayments.filter((p) => (p.payment_status||'').toLowerCase() === 'completed');
    const revenue   = sumBy(completed, 'paymentAmount');
    const rows = filteredPayments.map((p) => {
      const memberName = getMemberNameForPayment(p);
      const planName = getPlanNameForPayment(p);
      return `<tr>
      <td class="id-cell">#${p.paymentId}</td>
      <td class="name-cell">${memberName}</td>
      <td class="muted">${planName}</td>
      <td class="accent mono">LKR ${parseFloat(p.paymentAmount||0).toLocaleString()}</td>
      <td>${(p.payment_type||'').toLowerCase()==='card'?'💳 Card':'💵 Cash'}</td>
      <td><span class="badge ${badgeClass(p.payment_status)}">${p.payment_status||'—'}</span></td>
      <td class="muted">${p.payment_date?p.payment_date.substring(0,10):'—'}</td>
    </tr>`;
    }).join('');
    buildAndPrintHtml(pdfWrap(`DTS GYM — ${label} Payments`, `
      ${pdfHeader('Payments Report', label, filteredPayments.length,
        `<div class="pill pill-green"><strong>LKR ${revenue.toLocaleString()}</strong><span>Completed Revenue</span></div>
         <div class="pill pill-blue"><strong>${completed.length}</strong><span>Completed</span></div>`)}
      <table>
        <thead><tr><th>ID</th><th>Member</th><th>Plan</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredPayments.length} payments`);
  };

  // ── SUBSCRIPTIONS PDF ──
  const downloadSubscriptionsPdf = () => {
    if (filteredSubscriptions.length === 0) { dispatch(showToast('No subscriptions to export.', 'error')); return; }
    const label  = subStatusFilter === 'all' ? 'All' : capFirst(subStatusFilter);
    const active = filteredSubscriptions.filter((s) => s.is_active).length;
    const rows = filteredSubscriptions.map((s) => {
      const memberName = s.memberName || getMemberNameById(s.memberId || s.p_member_id) || `#${s.subscriptionId}`;
      const planName = s.planType || getPlanNameById(s.planId || s.plan_id) || '—';
      return `<tr>
      <td class="id-cell">#${s.subscriptionId}</td>
      <td class="name-cell">${memberName}</td>
      <td class="accent">${planName}</td>
      <td class="muted">${s.startDate?s.startDate.substring(0,10):'—'}</td>
      <td class="${s.end_date && new Date(s.end_date)<new Date()?'red':'muted'}">${s.end_date?s.end_date.substring(0,10):'—'}</td>
      <td><span class="badge ${s.is_active?'b-active':'b-inactive'}">${s.is_active?'Active':'Inactive'}</span></td>
    </tr>`;
    }).join('');
    buildAndPrintHtml(pdfWrap(`DTS GYM — ${label} Subscriptions`, `
      ${pdfHeader('Subscriptions Report', label, filteredSubscriptions.length,
        `<div class="pill pill-green"><strong>${active}</strong><span>Active</span></div>
         <div class="pill"><strong>${filteredSubscriptions.length - active}</strong><span>Inactive</span></div>`)}
      <table>
        <thead><tr><th>ID</th><th>Member</th><th>Plan</th><th>Start Date</th><th>End Date</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredSubscriptions.length} subscriptions`);
  };

  // ── TRAINERS PDF ──
  const downloadTrainersPdf = () => {
    if (filteredTrainers.length === 0) { dispatch(showToast('No trainers to export.', 'error')); return; }
    const label  = trainerStatusFilter === 'all' ? 'All' : capFirst(trainerStatusFilter);
    const active = filteredTrainers.filter((t) => (t.status||'pending').toLowerCase() === 'active').length;
    const rows = filteredTrainers.map((t) => `<tr>
      <td class="id-cell">#${t.trainerId}</td>
      <td class="name-cell">${t.username||'—'}</td>
      <td>${t.email||'—'}</td>
      <td class="mono">${t.phone||'—'}</td>
      <td>${t.experience_years||0} yrs</td>
      <td class="muted">${t.specialization||'—'}</td>
      <td class="muted">${t.joinDate?t.joinDate.substring(0,10):'—'}</td>
      <td><span class="badge ${badgeClass(t.status||'pending')}">${t.status||'pending'}</span></td>
    </tr>`).join('');
    buildAndPrintHtml(pdfWrap(`DTS GYM — ${label} Trainers`, `
      ${pdfHeader('Trainers Report', label, filteredTrainers.length,
        `<div class="pill pill-green"><strong>${active}</strong><span>Active</span></div>`)}
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Experience</th><th>Specialization</th><th>Joined</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredTrainers.length} trainers`);
  };

  // ── SCHEDULES PDF ──
  const downloadSchedulesPdf = () => {
    if (filteredSchedules.length === 0) { dispatch(showToast('No schedules to export.', 'error')); return; }
    const label     = schedStatusFilter === 'all' ? 'All' : schedStatusFilter;
    const scheduled = filteredSchedules.filter((s) => s.status === 'Scheduled').length;
    const pending   = filteredSchedules.filter((s) => s.status === 'Pending').length;
    const rows = filteredSchedules.map((s) => {
      const memberName = s.memberName || getMemberNameById(s.memberId || s.p_member_id) || `#${s.scheduleId}`;
      const trainerName = s.trainerName || getTrainerNameById(s.trainerId || s.p_trainer_id) || `#${s.trainerId}`;
      const timeRange = s.starttime && s.endtime ? `${s.starttime} – ${s.endtime}` : (s.timeslotId ? getTimeslotRangeById(s.timeslotId) : '—');
      return `<tr>
      <td class="id-cell">#${s.scheduleId}</td>
      <td class="name-cell">${memberName}</td>
      <td style="color:#7c3aed;font-weight:500">${trainerName}</td>
      <td class="muted">${s.scheduleDate?s.scheduleDate.substring(0,10):'—'}</td>
      <td class="mono">${timeRange}</td>
      <td><span class="badge ${badgeClass(s.status)}">${s.status||'Pending'}</span></td>
    </tr>`;
    }).join('');
    buildAndPrintHtml(pdfWrap(`DTS GYM — ${label} Schedules`, `
      ${pdfHeader('Schedules Report', label, filteredSchedules.length,
        `<div class="pill pill-green"><strong>${scheduled}</strong><span>Scheduled</span></div>
         <div class="pill pill-amber"><strong>${pending}</strong><span>Pending</span></div>`)}
      <table>
        <thead><tr><th>ID</th><th>Member</th><th>Trainer</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredSchedules.length} schedules`);
  };

  // ── TIMESLOTS PDF ──
  const downloadTimeslotsPdf = () => {
    if (timeslots.length === 0) { dispatch(showToast('No timeslots to export.', 'error')); return; }
    const rows = timeslots.map((t) => `<tr>
      <td class="id-cell">#${t.timeslot_Id}</td>
      <td class="accent mono">${t.starttime||'—'}</td>
      <td style="color:#0891b2;font-family:'Courier New',monospace">${t.endtime||'—'}</td>
    </tr>`).join('');
    buildAndPrintHtml(pdfWrap('DTS GYM — Time Slots', `
      ${pdfHeader('Time Slots Report', 'All', timeslots.length)}
      <table>
        <thead><tr><th>ID</th><th>Start Time</th><th>End Time</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${timeslots.length} timeslots`);
  };

  // FIX: TrainerTimeSlot rows carry either a recurring day_of_week /
  // selected_days schedule, or a custom_starttime/custom_endtime override.
  // This helper picks whichever is populated so the report always shows a
  // real schedule instead of blank cells.
  const describeTrainerTimeslotSchedule = (tts) => {
    if (tts.schedule_type && tts.schedule_type.toLowerCase() === 'custom' && tts.start_date) {
      return `${formatDate(tts.start_date)} – ${formatDate(tts.end_date) || 'Ongoing'}`;
    }
    if (tts.selected_days) return tts.selected_days;
    return tts.day_of_week || '—';
  };
  const getTrainerTimeslotRange = (tts) => {
    if (tts.custom_starttime && tts.custom_endtime) return `${tts.custom_starttime} – ${tts.custom_endtime}`;
    return getTimeslotRangeById(tts.timeslot_Id || tts.timeslotId);
  };

  // ── TRAINER TIME SLOTS PDF ──
  const downloadTrainerTimeslotsPdf = () => {
    if (filteredTrainerTimeslots.length === 0) { dispatch(showToast('No trainer time slots to export.', 'error')); return; }
    const rows = filteredTrainerTimeslots.map((tts) => `<tr>
      <td class="id-cell">#${tts.trainerTimeslot_Id}</td>
      <td class="name-cell">${getTrainerNameById(tts.trainer_Id || tts.trainerId)}</td>
      <td class="muted">${describeTrainerTimeslotSchedule(tts)}</td>
      <td class="accent mono">${getTrainerTimeslotRange(tts)}</td>
      <td><span class="badge ${(tts.status||'').toLowerCase()==='active' || tts.isActive ?'b-active':'b-inactive'}">${tts.status || (tts.isActive?'Active':'Inactive')}</span></td>
    </tr>`).join('');
    buildAndPrintHtml(pdfWrap('DTS GYM — Trainer Time Slots', `
      ${pdfHeader('Trainer Time Slots Report', 'All', filteredTrainerTimeslots.length)}
      <table>
        <thead><tr><th>ID</th><th>Trainer</th><th>Schedule</th><th>Time</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredTrainerTimeslots.length} trainer time slots`);
  };
  const downloadAttendancePdf = () => {
    if (filteredAttendance.length === 0) { dispatch(showToast('No attendance records to export.', 'error')); return; }
    const label  = attendStatusFilter === 'all' ? 'All' : capFirst(attendStatusFilter);
    const inside = filteredAttendance.filter((a) => isAttendanceInside(a)).length;
    const rows = filteredAttendance.map((a) => {
      const memberName = a.memberName || getMemberNameById(a.memberId) || `#${a.attendanceId}`;
      // RF ID may be stored under different keys
      const rfid = a.rfId_Id || a.rfid_number || a.rfid || '—';
      const checkIn = a.check_in_time || a.checkInTime || a.checkIn || '';
      const checkOut = getAttendanceCheckOut(a);
      return `<tr>
      <td class="id-cell">#${a.attendanceId}</td>
      <td class="name-cell">${memberName}</td>
      <td class="mono muted">${rfid}</td>
      <td class="mono green">${checkIn ? (checkIn.substring ? checkIn.substring(0,19) : checkIn) : '—'}</td>
      <td class="mono ${checkOut?'':'muted'}">${checkOut ? (checkOut.substring ? checkOut.substring(0,19) : checkOut) : 'Still inside'}</td>
      <td><span class="badge ${checkOut?'b-left':'b-inside'}">${checkOut?'Left':'Inside'}</span></td>
    </tr>`;
    }).join('');
    buildAndPrintHtml(pdfWrap(`DTS GYM — ${label} Attendance`, `
      ${pdfHeader('Attendance Report', label, filteredAttendance.length,
        `<div class="pill pill-green"><strong>${inside}</strong><span>Still Inside</span></div>
         <div class="pill"><strong>${filteredAttendance.length - inside}</strong><span>Checked Out</span></div>`)}
      <table>
        <thead><tr><th>ID</th><th>Member</th><th>RFID</th><th>Check In</th><th>Check Out</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredAttendance.length} records`);
  };

  // ── ASSIGNMENTS PDF ──
  const downloadAssignmentsPdf = () => {
    if (filteredAssignments.length === 0) { dispatch(showToast('No assignments to export.', 'error')); return; }
    const label  = assignStatusFilter === 'all' ? 'All' : capFirst(assignStatusFilter);
    const active = filteredAssignments.filter((a) => a.is_active !== false).length;
    const rows = filteredAssignments.map((a) => {
      const memberName = a.memberName || getMemberNameById(a.memberId || a.p_member_id) || `#${a.assignmentId}`;
      const trainerName = a.trainerName || getTrainerNameById(a.trainerId || a.trainer_Id || a.p_trainer_id) || `#${a.trainerId}`;
      return `<tr>
      <td class="id-cell">#${a.assignmentId}</td>
      <td class="name-cell">${memberName}</td>
      <td style="color:#7c3aed;font-weight:500">${trainerName}</td>
      <td class="muted">${a.assignment_date?a.assignment_date.substring(0,10):'—'}</td>
      <td><span class="badge ${a.is_active!==false?'b-active':'b-inactive'}">${a.is_active!==false?'Active':'Inactive'}</span></td>
    </tr>`;
    }).join('');
    buildAndPrintHtml(pdfWrap(`DTS GYM — ${label} Assignments`, `
      ${pdfHeader('Trainer Assignments Report', label, filteredAssignments.length,
        `<div class="pill pill-green"><strong>${active}</strong><span>Active</span></div>
         <div class="pill"><strong>${filteredAssignments.length - active}</strong><span>Inactive</span></div>`)}
      <table>
        <thead><tr><th>ID</th><th>Member</th><th>Trainer</th><th>Assigned Date</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredAssignments.length} assignments`);
  };

  // ── WORKOUTS PDF ──
  const downloadWorkoutsPdf = () => {
    if (filteredWorkouts.length === 0) { dispatch(showToast('No workout records to export.', 'error')); return; }
    const label     = workoutStatusFilter === 'all' ? 'All' : capFirst(workoutStatusFilter);
    const completed = filteredWorkouts.filter((w) => (w.sub_status||'').toLowerCase() === 'completed').length;
    const rows = filteredWorkouts.map((w) => {
      const id = w.use_Id || w.wse_id || w.id;
      const scheduleId = w.scheduleId || w.p_schedule_id || w.schedule_id;
      const exerciseId = w.exercise_Id || w.p_exercise_id || w.exerciseId;
      const exerciseName = w.exerciseName || w.ExerciseName || getExerciseNameById(exerciseId) || `#${exerciseId}`;
      const memberName = getMemberNameForWorkout(w);
      const assignedBy = getAssignedByForWorkout(w);
      return `<tr>
      <td class="id-cell">#${id}</td>
      <td class="name-cell">${memberName}</td>
      <td style="color:#7c3aed;font-weight:500">${assignedBy}</td>
      <td class="name-cell">${exerciseName}</td>
      <td>${w.sets||'—'}</td>
      <td>${w.reps||'—'}</td>
      <td><span class="badge ${(w.sub_status||'').toLowerCase()==='completed'?'b-completed':'b-pending'}">${w.sub_status||'pending'}</span></td>
    </tr>`;
    }).join('');
    buildAndPrintHtml(pdfWrap(`DTS GYM — ${label} Workouts`, `
      ${pdfHeader('Workout Records Report', label, filteredWorkouts.length,
        `<div class="pill pill-green"><strong>${completed}</strong><span>Completed</span></div>
         <div class="pill pill-amber"><strong>${filteredWorkouts.length - completed}</strong><span>Pending</span></div>`)}
      <table>
        <thead><tr><th>ID</th><th>Member</th><th>Assigned By</th><th>Exercise</th><th>Sets</th><th>Reps</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredWorkouts.length} workout records`);
  };

  // ── RFID TAGS PDF ──
  const downloadRfidPdf = () => {
    if (filteredRfid.length === 0) { dispatch(showToast('No RFID tags to export.', 'error')); return; }
    const label  = rfidStatusFilter === 'all' ? 'All' : capFirst(rfidStatusFilter);
    const active = filteredRfid.filter((t) => t.isActive).length;
    const rows = filteredRfid.map((t) => {
      const owner = getRfidOwner(t);
      return `<tr>
      <td class="id-cell">#${t.rfId_Id}</td>
      <td class="accent mono">${t.rfid_number||'—'}</td>
      <td class="name-cell">${owner.label}</td>
      <td class="muted">${owner.type || '—'}</td>
      <td class="muted">${t.issueDate?t.issueDate.substring(0,10):'—'}</td>
      <td><span class="badge ${t.isActive?'b-active':'b-inactive'}">${t.isActive?'Active':'Inactive'}</span></td>
    </tr>`;
    }).join('');
    buildAndPrintHtml(pdfWrap(`DTS GYM — ${label} RFID Tags`, `
      ${pdfHeader('RFID Tags Report', label, filteredRfid.length,
        `<div class="pill pill-green"><strong>${active}</strong><span>Active</span></div>
         <div class="pill"><strong>${filteredRfid.length - active}</strong><span>Inactive</span></div>`)}
      <table>
        <thead><tr><th>ID</th><th>RFID Number</th><th>Assigned To</th><th>Type</th><th>Issue Date</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredRfid.length} RFID tags`);
  };

  // ── PLANS PDF ──
  const downloadPlansPdf = () => {
    if (filteredPlans.length === 0) { dispatch(showToast('No plans to export.', 'error')); return; }
    const label  = planStatusFilter === 'all' ? 'All' : capFirst(planStatusFilter);
    const active = filteredPlans.filter((p) => (p.status || 'active').toLowerCase() === 'active').length;
    const rows = filteredPlans.map((p) => {
      const name = p.planName || p.plan_name || p.name || `Plan #${p.planId || p.id}`;
      // FIX: backend field is duration_days (a day count, e.g. 30/90/365),
      // not durationMonths/duration_months — those never existed on
      // PlanModel, so duration always rendered as "— mo".
      const duration = p.duration_days || p.durationDays || '—';
      const isActive = (p.status || 'active').toLowerCase() === 'active';
      return `<tr>
      <td class="id-cell">#${p.planId || p.id}</td>
      <td class="name-cell">${name}</td>
      <td style="color:#7c3aed;font-weight:500">${p.planType||p.plan_type||'—'}</td>
      <td>${duration} days</td>
      <td class="green mono">LKR ${p.price||'—'}</td>
      <td><span class="badge ${isActive?'b-active':'b-inactive'}">${p.status || (isActive?'Active':'Inactive')}</span></td>
    </tr>`;
    }).join('');
    buildAndPrintHtml(pdfWrap(`DTS GYM — ${label} Plans`, `
      ${pdfHeader('Membership Plans Report', label, filteredPlans.length,
        `<div class="pill pill-green"><strong>${active}</strong><span>Active Plans</span></div>`)}
      <table>
        <thead><tr><th>ID</th><th>Plan Name</th><th>Type</th><th>Duration</th><th>Price</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredPlans.length} plans`);
  };

  // ── USERS PDF ──
  const downloadUsersPdf = () => {
    if (filteredUsers.length === 0) { dispatch(showToast('No users to export.', 'error')); return; }
    const label  = userStatusFilter === 'all' ? 'All' : capFirst(userStatusFilter);
    const active = filteredUsers.filter((u) => (u.status||'active').toLowerCase() === 'active').length;
    const rows = filteredUsers.map((u) => `<tr>
      <td class="id-cell">#${u.userId}</td>
      <td class="name-cell">${u.firstName||''} ${u.lastName||''}</td>
      <td>${u.email||'—'}</td>
      <td style="color:#7c3aed;font-weight:500">${u.roleName||u.roleId||'—'}</td>
      <td><span class="badge ${badgeClass(u.status||'active')}">${u.status||'active'}</span></td>
      <td class="muted">${u.created_date?u.created_date.substring(0,10):'—'}</td>
    </tr>`).join('');
    buildAndPrintHtml(pdfWrap(`DTS GYM — ${label} Users`, `
      ${pdfHeader('System Users Report', label, filteredUsers.length,
        `<div class="pill pill-green"><strong>${active}</strong><span>Active</span></div>`)}
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `), `PDF ready — ${filteredUsers.length} users`);
  };

  const ExportBtn = ({ onClick, disabled, label = '📄 Export PDF' }) => (
    <button className="btn btn-secondary" onClick={onClick} disabled={disabled || exporting}>
      {(disabled || exporting) ? 'Exporting…' : label}
    </button>
  );

  const TableHeader = ({ title, shown, total }) => (
    <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--gym-border)' }}>
      <div>
        <span className="font-semibold text-sm" style={{ color: 'var(--gym-text)' }}>{title}</span>
        <span className="ml-2 text-xs" style={{ color: 'var(--gym-muted)' }}>— showing {shown} of {total} total</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-sub">Analytics and PDF exports for DTS GYM</div>
        </div>
        <div className="flex gap-2 items-center">
          <input className="gym-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: 140 }} />
          <span style={{ color: 'var(--gym-muted)' }}>→</span>
          <input className="gym-input" type="date" value={dateTo}   onChange={(e) => setDateTo(e.target.value)}   style={{ width: 140 }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b" style={{ borderColor: 'var(--gym-border)' }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors"
            style={{
              color: activeTab === id ? 'var(--gym-accent)' : 'var(--gym-muted)',
              borderBottom: activeTab === id ? '2px solid var(--gym-accent)' : '2px solid transparent',
              background: 'transparent', marginBottom: -1,
            }}
          >{label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Revenue"    value={formatCurrency(totalRevenue)}  color="var(--gym-accent)" />
            <StatCard label="Members"          value={members.length}                color="var(--gym-success)" />
            <StatCard label="Active Subs"      value={activeSubs}                    color="var(--gym-accent3)" />
            <StatCard label="Avg Payment"      value={formatCurrency(avgPayment)}    color="var(--gym-warning)" />
            <StatCard label="Trainers"         value={trainers.length}               color="var(--gym-accent3)" />
            <StatCard label="Total Schedules"  value={schedules.length}              color="var(--gym-muted)" />
            <StatCard label="Pending Sessions" value={pendingSch}                    color="var(--gym-warning)" />
            <StatCard label="Completed"        value={completedSch}                  color="var(--gym-success)" />
          </div>
          <div className="card p-5">
            <div className="text-sm font-semibold mb-4" style={{ color: 'var(--gym-accent)', letterSpacing: '0.08em' }}>📈 MONTHLY REVENUE (LAST 6 MONTHS)</div>
            {monthlyRevenue.length === 0
              ? <div className="text-center py-8 text-sm" style={{ color: 'var(--gym-muted)' }}>No payment data yet.</div>
              : (
                <div className="flex items-end gap-3 h-32">
                  {monthlyRevenue.map(([month, amount]) => {
                    const pct = Math.round((amount / maxMonth) * 100);
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-xs font-mono" style={{ color: 'var(--gym-accent)' }}>{formatCurrency(amount).replace('LKR ','')}</div>
                        <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max(pct, 4)}%`, background: 'var(--gym-accent)', minHeight: 6 }} />
                        <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{month.substring(5)}</div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
          <div className="card p-5">
            <div className="text-sm font-semibold mb-4" style={{ color: 'var(--gym-accent3)', letterSpacing: '0.08em' }}>📊 PLAN DISTRIBUTION</div>
            <div className="space-y-3">
              {planDist.map(([name, count]) => (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--gym-text)' }}>{name}</span>
                    <span style={{ color: 'var(--gym-muted)' }}>{count} subs</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--gym-border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round((count / maxPlan) * 100)}%`, background: 'var(--gym-accent3)' }} />
                  </div>
                </div>
              ))}
              {planDist.length === 0 && <div className="text-sm text-center py-4" style={{ color: 'var(--gym-muted)' }}>No subscription data yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── MEMBERS ── */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <input className="gym-input w-60" placeholder="🔍 Search name or email…" value={memSearch} onChange={(e) => setMemSearch(e.target.value)} />
              <StatusPills filters={MEMBER_STATUS_FILTERS} active={memStatusFilter} onChange={setMemStatusFilter} />
            </>}
            right={<>
              <CountTag shown={filteredMembers.length} total={members.length} />
              <ExportBtn onClick={downloadMembersPdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader title={memStatusFilter === 'all' ? 'All Members' : `${memStatusFilter.charAt(0).toUpperCase()+memStatusFilter.slice(1)} Members`} shown={filteredMembers.length} total={members.length} />
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--gym-surface2)' }}>
                <tr>{['#', 'Name', 'Email', 'Phone', 'Blood', 'Joined', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredMembers.map((m, i) => (
                  <tr key={m.memberId} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05' }}>
                    <td className="px-4 py-3"><span className="id-chip">#{m.memberId}</span></td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--gym-text)' }}>{m.firstName} {m.lastName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{m.email || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{m.phone || '—'}</td>
                    <td className="px-4 py-3 text-xs">{m.blood_group || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{m.joinDate ? m.joinDate.substring(0, 10) : '—'}</td>
                    <td className="px-4 py-3"><Badge variant={getStatusVariant(m.status)}>{m.status || 'inactive'}</Badge></td>
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No members found matching your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <input className="gym-input w-60" placeholder="🔍 Search member or ID…" value={paySearch} onChange={(e) => setPaySearch(e.target.value)} />
              <StatusPills filters={PAYMENT_STATUS_FILTERS} active={payStatusFilter} onChange={setPayStatusFilter} />
            </>}
            right={<>
              <CountTag shown={filteredPayments.length} total={payments.length} />
              <span className="text-sm font-mono font-bold" style={{ color: 'var(--gym-accent)' }}>
                {formatCurrency(sumBy(filteredPayments.filter((p) => (p.payment_status||'').toLowerCase()==='completed'), 'paymentAmount'))}
              </span>
              <ExportBtn onClick={downloadPaymentsPdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader title="Payments" shown={filteredPayments.length} total={payments.length} />
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--gym-surface2)' }}>
                <tr>{['#', 'Member', 'Plan', 'Amount', 'Type', 'Status', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredPayments.map((p, i) => (
                  <tr key={p.paymentId} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05' }}>
                    <td className="px-4 py-3"><span className="id-chip">#{p.paymentId}</span></td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--gym-text)' }}>{getMemberNameForPayment(p)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{getPlanNameForPayment(p)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-xs" style={{ color: 'var(--gym-accent)' }}>{formatCurrency(p.paymentAmount)}</td>
                    <td className="px-4 py-3 text-xs">{(p.payment_type || '').toLowerCase() === 'card' ? '💳 Card' : '💵 Cash'}</td>
                    <td className="px-4 py-3"><Badge variant={(p.payment_status||'').toLowerCase() === 'completed' ? 'active' : (p.payment_status||'').toLowerCase() === 'pending' ? 'pending' : 'inactive'}>{p.payment_status}</Badge></td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{p.payment_date ? p.payment_date.substring(0,10) : '—'}</td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No payments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTIONS ── */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <input className="gym-input w-60" placeholder="🔍 Search member or plan…" value={subSearch} onChange={(e) => setSubSearch(e.target.value)} />
              <StatusPills filters={SUB_STATUS_FILTERS} active={subStatusFilter} onChange={setSubStatusFilter} />
            </>}
            right={<>
              <CountTag shown={filteredSubscriptions.length} total={subscriptions.length} />
              <ExportBtn onClick={downloadSubscriptionsPdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader title="Subscriptions" shown={filteredSubscriptions.length} total={subscriptions.length} />
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--gym-surface2)' }}>
                <tr>{['#', 'Member', 'Plan', 'Start', 'End', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((s, i) => (
                  <tr key={s.subscriptionId} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05' }}>
                    <td className="px-4 py-3"><span className="id-chip">#{s.subscriptionId}</span></td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--gym-text)' }}>{s.memberName || getMemberNameById(s.memberId || s.p_member_id) || `#${s.memberId}`}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-accent)' }}>{s.planType || getPlanNameById(s.planId || s.plan_id) || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(s.startDate)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: s.end_date && new Date(s.end_date) < new Date() ? 'var(--gym-accent2)' : 'var(--gym-muted)' }}>{formatDate(s.end_date)}</td>
                    <td className="px-4 py-3"><Badge variant={s.is_active ? 'active' : 'inactive'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  </tr>
                ))}
                {filteredSubscriptions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No subscriptions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TRAINERS ── */}
      {activeTab === 'trainers' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <input className="gym-input w-60" placeholder="🔍 Search trainer or email…" value={trainerSearch} onChange={(e) => setTrainerSearch(e.target.value)} />
              <StatusPills filters={TRAINER_STATUS_FILTERS} active={trainerStatusFilter} onChange={setTrainerStatusFilter} />
            </>}
            right={<>
              <CountTag shown={filteredTrainers.length} total={trainers.length} />
              <ExportBtn onClick={downloadTrainersPdf} />
            </>}
          />
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTrainers.map((t) => (
              <div key={t.trainerId} className="card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: 'rgba(71,200,255,.15)', color: 'var(--gym-accent3)', fontFamily: "'Space Mono', monospace" }}>
                    {(t.username || 'T').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold" style={{ color: 'var(--gym-text)' }}>{t.username}</div>
                    <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{t.email}</div>
                  </div>
                  <Badge variant={getStatusVariant(t.status || 'pending')}>{t.status || 'pending'}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[['Experience', `${t.experience_years || 0} years`], ['Joined', t.joinDate ? formatDate(t.joinDate) : '—'], ['Specialization', t.specialization || t.qualifications]].map(([k, v]) => (
                    <div key={k} className="p-2 rounded-lg text-xs" style={{ background: 'var(--gym-surface2)' }}>
                      <div style={{ color: 'var(--gym-muted)' }}>{k}</div>
                      <div style={{ color: 'var(--gym-text)', fontWeight: 500 }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>
                {t.bio && <div className="text-xs p-2 rounded-lg" style={{ background: 'var(--gym-surface2)', color: 'var(--gym-muted)' }}>{t.bio}</div>}
              </div>
            ))}
            {filteredTrainers.length === 0 && <div className="col-span-3 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No trainers found matching your filters.</div>}
          </div>
        </div>
      )}

      {/* ── SCHEDULES ── */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <input className="gym-input w-60" placeholder="🔍 Search member or trainer…" value={schedSearch} onChange={(e) => setSchedSearch(e.target.value)} />
              <StatusPills filters={SCHEDULE_STATUS_FILTERS} active={schedStatusFilter} onChange={setSchedStatusFilter} />
            </>}
            right={<>
              <CountTag shown={filteredSchedules.length} total={schedules.length} />
              <ExportBtn onClick={downloadSchedulesPdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader title="Schedules" shown={filteredSchedules.length} total={schedules.length} />
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--gym-surface2)' }}>
                <tr>{['#', 'Member', 'Trainer', 'Date', 'Time', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredSchedules.map((s, i) => (
                  <tr key={s.scheduleId} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05' }}>
                    <td className="px-4 py-3"><span className="id-chip">#{s.scheduleId}</span></td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--gym-text)' }}>{s.memberName || getMemberNameById(s.memberId || s.p_member_id) || `#${s.memberId}`}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-accent3)' }}>{s.trainerName || getTrainerNameById(s.trainerId || s.p_trainer_id) || `#${s.trainerId}`}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(s.scheduleDate)}</td>
                    <td className="px-4 py-3 text-xs font-mono">{s.starttime && s.endtime ? `${s.starttime} – ${s.endtime}` : (s.timeslotId ? getTimeslotRangeById(s.timeslotId) : '—')}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === 'Scheduled' ? 'active' : s.status === 'Cancelled' ? 'inactive' : 'pending'}>{s.status || 'Pending'}</Badge>
                    </td>
                  </tr>
                ))}
                {filteredSchedules.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No schedules found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TIMESLOTS ── */}
      {activeTab === 'timeslots' && (
        <div className="space-y-4">
          <FilterBar
            left={<span className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>All Configured Time Slots</span>}
            right={<>
              <CountTag shown={timeslots.length} total={timeslots.length} />
              <ExportBtn onClick={downloadTimeslotsPdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader title="Time Slots" shown={timeslots.length} total={timeslots.length} />
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--gym-surface2)' }}>
                <tr>{['#', 'Start Time', 'End Time'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {timeslots.map((t, i) => (
                  <tr key={t.timeslot_Id} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05' }}>
                    <td className="px-4 py-3"><span className="id-chip">#{t.timeslot_Id}</span></td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--gym-accent)' }}>{t.starttime}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--gym-accent3)' }}>{t.endtime}</td>
                  </tr>
                ))}
                {timeslots.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No timeslots found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TRAINER TIME SLOTS ── */}
      {/* FIX: this is the genuinely trainer-specific report — which
          trainer works which slot/day — as opposed to the generic
          gym-wide Time Slots tab above. It reads dbo.TrainerTimeSlot,
          not dbo.TimeSlot. */}
      {activeTab === 'trainertimeslots' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <input className="gym-input w-60" placeholder="🔍 Search trainer…" value={trainerTsSearch} onChange={(e) => setTrainerTsSearch(e.target.value)} />
              <StatusPills filters={TRAINER_TS_STATUS_FILTERS} active={trainerTsStatusFilter} onChange={setTrainerTsStatusFilter} />
            </>}
            right={<>
              <CountTag shown={filteredTrainerTimeslots.length} total={trainerTimeslots.length} />
              <ExportBtn onClick={downloadTrainerTimeslotsPdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader title="Trainer Time Slots" shown={filteredTrainerTimeslots.length} total={trainerTimeslots.length} />
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--gym-surface2)' }}>
                <tr>{['#', 'Trainer', 'Schedule', 'Time', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredTrainerTimeslots.map((tts, i) => (
                  <tr key={tts.trainerTimeslot_Id} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05' }}>
                    <td className="px-4 py-3"><span className="id-chip">#{tts.trainerTimeslot_Id}</span></td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--gym-text)' }}>{getTrainerNameById(tts.trainer_Id || tts.trainerId)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{describeTrainerTimeslotSchedule(tts)}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--gym-accent)' }}>{getTrainerTimeslotRange(tts)}</td>
                    <td className="px-4 py-3"><Badge variant={tts.deleted_at ? 'rejected' : getStatusVariant(tts.status)}>{tts.deleted_at ? 'Deleted' : (tts.status || 'Pending')}</Badge></td>
                  </tr>
                ))}
                {filteredTrainerTimeslots.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No trainer time slots found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE ── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <input className="gym-input w-60" placeholder="🔍 Search member…" value={attendSearch} onChange={(e) => setAttendSearch(e.target.value)} />
              <StatusPills filters={ATTENDANCE_STATUS_FILTERS} active={attendStatusFilter} onChange={setAttendStatusFilter} />
            </>}
            right={<>
              <CountTag shown={filteredAttendance.length} total={attendance.length} />
              <ExportBtn onClick={downloadAttendancePdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader title="Attendance" shown={filteredAttendance.length} total={attendance.length} />
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--gym-surface2)' }}>
                <tr>{['#', 'Member', 'RFID', 'Check In', 'Check Out', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredAttendance.map((a, i) => {
                  const checkOut = getAttendanceCheckOut(a);
                  return (
                  <tr key={a.attendanceId} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05' }}>
                    <td className="px-4 py-3"><span className="id-chip">#{a.attendanceId}</span></td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--gym-text)' }}>{a.memberName || getMemberNameById(a.memberId) || `#${a.memberId}`}</td>
                    <td className="px-4 py-3 text-xs font-mono">{a.rfid_number || getRfidNumberById(a.rfidId || a.rfId_Id) || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--gym-success)' }}>{(a.check_in_time || a.checkInTime || a.checkIn) ? (a.check_in_time || a.checkInTime || a.checkIn).substring(0,19) : '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: checkOut ? 'var(--gym-accent2)' : 'var(--gym-muted)' }}>{checkOut ? checkOut.substring(0,19) : 'Still inside'}</td>
                    {/* FIX: was testing a.check_out_time, a field that's
                        never populated on the object (backend returns
                        checkOutTime) — so this always rendered "Inside"
                        for every record no matter the real status. */}
                    <td className="px-4 py-3"><Badge variant={checkOut ? 'inactive' : 'active'}>{checkOut ? 'Left' : 'Inside'}</Badge></td>
                  </tr>
                  );
                })}
                {filteredAttendance.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No attendance records.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ASSIGNMENTS ── */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <input className="gym-input w-60" placeholder="🔍 Search member or trainer…" value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} />
              <StatusPills filters={ASSIGN_STATUS_FILTERS} active={assignStatusFilter} onChange={setAssignStatusFilter} />
            </>}
            right={<>
              <CountTag shown={filteredAssignments.length} total={assignments.length} />
              <ExportBtn onClick={downloadAssignmentsPdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader title="Trainer Assignments" shown={filteredAssignments.length} total={assignments.length} />
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--gym-surface2)' }}>
                <tr>{['#', 'Member', 'Trainer', 'Date', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredAssignments.map((a, i) => (
                  <tr key={a.assignmentId} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05' }}>
                    <td className="px-4 py-3"><span className="id-chip">#{a.assignmentId}</span></td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--gym-text)' }}>{a.memberName || getMemberNameById(a.memberId || a.p_member_id) || `#${a.memberId}`}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--gym-accent3)' }}>{a.trainerName || getTrainerNameById(a.trainerId || a.trainer_Id || a.p_trainer_id) || `#${a.trainerId || a.trainer_Id}`}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(a.assignment_date)}</td>
                    <td className="px-4 py-3"><Badge variant={a.is_active !== false ? 'active' : 'inactive'}>{a.is_active !== false ? 'Active' : 'Inactive'}</Badge></td>
                  </tr>
                ))}
                {filteredAssignments.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No assignments found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── WORKOUTS ── */}
      {activeTab === 'workouts' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <input className="gym-input w-60" placeholder="🔍 Search exercise name…" value={workoutSearch} onChange={(e) => setWorkoutSearch(e.target.value)} />
              <StatusPills filters={WORKOUT_STATUS_FILTERS} active={workoutStatusFilter} onChange={setWorkoutStatusFilter} />
            </>}
            right={<>
              <CountTag shown={filteredWorkouts.length} total={workouts.length} />
              <ExportBtn onClick={downloadWorkoutsPdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader title="Workout Records" shown={filteredWorkouts.length} total={workouts.length} />
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--gym-surface2)' }}>
                <tr>{['#', 'Member', 'Assigned By', 'Exercise', 'Sets', 'Reps', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredWorkouts.map((w, i) => (
                  <tr key={w.use_Id || w.wse_id} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05' }}>
                    <td className="px-4 py-3"><span className="id-chip">#{w.use_Id || w.wse_id}</span></td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--gym-text)' }}>{getMemberNameForWorkout(w)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-accent3)' }}>{getAssignedByForWorkout(w)}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--gym-text)' }}>{w.exerciseName || getExerciseNameById(w.exercise_Id || w.p_exercise_id || w.exerciseId) || `#${w.exercise_Id || w.exerciseId}`}</td>
                    <td className="px-4 py-3 text-xs">{w.sets || '—'}</td>
                    <td className="px-4 py-3 text-xs">{w.reps || '—'}</td>
                    <td className="px-4 py-3"><Badge variant={w.sub_status === 'completed' ? 'active' : 'pending'}>{w.sub_status || 'pending'}</Badge></td>
                  </tr>
                ))}
                {filteredWorkouts.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No workout records.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RFID TAGS ── */}
      {activeTab === 'rfid' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <input className="gym-input w-60" placeholder="🔍 Search RFID number…" value={rfidSearch} onChange={(e) => setRfidSearch(e.target.value)} />
              <StatusPills filters={RFID_STATUS_FILTERS} active={rfidStatusFilter} onChange={setRfidStatusFilter} />
            </>}
            right={<>
              <CountTag shown={filteredRfid.length} total={rfidTags.length} />
              <ExportBtn onClick={downloadRfidPdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader title="RFID Tags" shown={filteredRfid.length} total={rfidTags.length} />
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--gym-surface2)' }}>
                <tr>{['#', 'RFID No.', 'Assigned To', 'Type', 'Issue Date', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredRfid.map((t, i) => {
                  const owner = getRfidOwner(t);
                  return (
                  <tr key={t.rfId_Id} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05' }}>
                    <td className="px-4 py-3"><span className="id-chip">#{t.rfId_Id}</span></td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--gym-accent)' }}>{t.rfid_number || '—'}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: owner.type ? 'var(--gym-text)' : 'var(--gym-muted)' }}>{owner.type === 'Trainer' ? '🧑‍🏫 ' : owner.type === 'Member' ? '👤 ' : ''}{owner.label}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-accent3)' }}>{owner.type || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(t.issueDate)}</td>
                    <td className="px-4 py-3"><Badge variant={(String(t.isActive) === '1' || String(t.isActive).toLowerCase() === 'true') ? 'active' : 'rejected'}>{(String(t.isActive) === '1' || String(t.isActive).toLowerCase() === 'true') ? 'Active' : 'Deleted'}</Badge></td>
                  </tr>
                  );
                })}
                {filteredRfid.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No RFID tags found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PLANS ── */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <input className="gym-input w-60" placeholder="🔍 Search plan name or type…" value={planSearch} onChange={(e) => setPlanSearch(e.target.value)} />
              <StatusPills filters={PLAN_STATUS_FILTERS} active={planStatusFilter} onChange={setPlanStatusFilter} />
            </>}
            right={<>
              <CountTag shown={filteredPlans.length} total={plans.length} />
              <ExportBtn onClick={downloadPlansPdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader title="Membership Plans" shown={filteredPlans.length} total={plans.length} />
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--gym-surface2)' }}>
                <tr>{['#', 'Plan Name', 'Type', 'Duration', 'Price', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredPlans.map((p, i) => (
                  <tr key={p.planId} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05' }}>
                    <td className="px-4 py-3"><span className="id-chip">#{p.planId}</span></td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--gym-text)' }}>{p.planName || getPlanNameById(p.planId || p.id) || p.plan_name || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-accent3)' }}>{p.planType || p.plan_type || '—'}</td>
                    {/* FIX: PlanModel exposes duration_days, not
                        durationMonths/duration_months — those fields
                        never existed, so this column always showed "— mo". */}
                    <td className="px-4 py-3 text-xs">{p.duration_days || p.durationDays || '—'} days</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--gym-success)' }}>LKR {p.price || '—'}</td>
                    <td className="px-4 py-3"><Badge variant={(p.status || 'active').toLowerCase() === 'active' ? 'active' : 'inactive'}>{p.status || 'active'}</Badge></td>
                  </tr>
                ))}
                {filteredPlans.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No plans found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SYSTEM USERS ── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <FilterBar
            left={<>
              <StatusPills
                filters={USER_STATUS_FILTERS.map((f) => ({
                  ...f,
                  count: f.value === 'all' ? users.length : users.filter((u) => (u.status || 'active').toLowerCase() === f.value).length,
                }))}
                active={userStatusFilter}
                onChange={setUserStatusFilter}
              />
            </>}
            right={<>
              <CountTag shown={filteredUsers.length} total={users.length} />
              <ExportBtn onClick={downloadUsersPdf} />
            </>}
          />
          <div className="card overflow-hidden">
            <TableHeader
              title={userStatusFilter === 'all' ? 'All System Users' : `${userStatusFilter.charAt(0).toUpperCase() + userStatusFilter.slice(1)} Users`}
              shown={filteredUsers.length}
              total={users.length}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--gym-surface2)' }}>
                    {['ID', 'Name', 'Email', 'Role', 'Status', 'Joined'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--gym-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => {
                    const st = (u.status || 'active').toLowerCase();
                    const variant =
                      st === 'active'    ? 'active'    :
                      st === 'approved'  ? 'approved'  :
                      st === 'pending'   ? 'pending'   :
                      st === 'rejected'  ? 'rejected'  :
                      st === 'suspended' ? 'suspended' :
                      st === 'deleted'   ? 'deleted'   : 'info';
                    return (
                      <tr key={u.userId} style={{ borderTop: '1px solid var(--gym-border)', background: i % 2 === 0 ? 'transparent' : 'var(--gym-surface2)05', opacity: st === 'deleted' ? 0.65 : 1 }}>
                        <td className="px-4 py-3"><span className="id-chip">#{u.userId}</span></td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--gym-text)' }}>
                          {u.firstName || ''} {u.lastName || ''}
                          {st === 'deleted' && <span className="ml-2 text-xs" style={{ color: 'var(--gym-muted)' }}>(deleted)</span>}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{u.email || '—'}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-accent3)' }}>{u.roleName || u.roleId || '—'}</td>
                        <td className="px-4 py-3"><Badge variant={variant}>{u.status || 'active'}</Badge></td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(u.created_date) || '—'}</td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>
                        No {userStatusFilter === 'all' ? '' : userStatusFilter + ' '}users found for the selected dates.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 text-xs flex gap-4 flex-wrap" style={{ borderTop: '1px solid var(--gym-border)', color: 'var(--gym-muted)' }}>
              {['active','pending','inactive','rejected','suspended','deleted'].map((s) => {
                const count = users.filter((u) => (u.status||'active').toLowerCase() === s).length;
                return count > 0 ? <span key={s}><strong>{count}</strong> {s}</span> : null;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}