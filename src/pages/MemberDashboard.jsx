// ============================================================
//  MemberDashboard.jsx
//  Changes in this version:
//    • Duplicate BMI card REMOVED (WellnessHub already shows it)
//    • AI chat now supports Claude / Gemini / ChatGPT toggle
//    • All existing features preserved
//    • RFID attendance now uses physical rfid_number instead of PK
// ============================================================
import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  fetchSchedulesByMember, addSchedule,
} from '../actions/schedulesAction';
import { fetchSubscriptions } from '../actions/subscriptionAction';
import { fetchPaymentsByMember, downloadReceipt } from '../actions/paymentAction';
import { fetchMemberAttendance } from '../actions/attendanceAction';
import { fetchTrainers } from '../actions/trainerAction';
import { fetchUsers } from '../actions/usersAction';
import { fetchAssignments } from '../actions/trainerAssignmnetAction';
import { fetchTimeslots } from '../actions/timeslotsAction';
import { fetchTrainerTimeslots } from '../actions/trainerTimeSlotAction';
import { showToast } from '../actions/uiAction';
import { fetchPlans } from '../actions/planAction';
import { fetchWorkoutsByMember } from '../actions/nonEquipmentExerciseAction';
import { fetchMyParQ, saveParQ } from '../actions/parqAction';
import { formatDate, formatCurrency, sumBy, getImgUrl, getProfileImg } from '../utils';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import WellnessHub from '../components/member/WellnessHub';
import TrainerRequestPanel from '../components/member/TrainerRequestPanel';
import CashPaymentRequestCard from '../components/member/CashPaymentRequestCard';
import {
  createCashPaymentRequest, createTrainerRequest, confirmCashPaymentOtp,
  getCashPaymentRequests, getTrainerRequests, subscribeWorkflowStore,
} from '../utils/workflowStore';
import * as api from '../services/api';

const VITE_ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || '';
const VITE_GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || '';
const VITE_OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY || '';

// ── Small helpers ────────────────────────────────────────────
function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}
function CalIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function CardPayIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>; }
function RfidIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="2" y="5" width="14" height="14" rx="2"/><path d="M18 8a4 4 0 010 8"/><path d="M21 5a7 7 0 010 14"/></svg>; }
function HeartIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>; }

function MiniStat({ label, value, sub, color, icon }) {
  return (
    <div className="stat-card" style={{ cursor: 'default' }}>
      <div className="absolute top-3 right-3" style={{ color, opacity: 0.7 }}>{icon}</div>
      <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--gym-muted)' }}>{label}</div>
      <div className="text-2xl sm:text-3xl font-bold leading-none mb-1" style={{ color, fontFamily: "'Space Mono', monospace" }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{sub}</div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl opacity-30" style={{ background: color }} />
    </div>
  );
}

// ── AI configuration ─────────────────────────────────────────
const AI_SYSTEM = `You are a certified gym nutrition and fitness advisor for DTS Gym.
ONLY answer questions about diet, nutrition, meal plans, workouts, exercise, fitness, gym,
weight loss, muscle gain, supplements, and sports health.
If the user asks about anything else, politely say you can only help with gym and health topics.
Keep answers practical, concise, and motivating.`;

const AI_PROVIDERS = [
  { id: 'claude',  label: 'Claude',  color: '#d97706', envKey: 'VITE_ANTHROPIC_KEY' },
  { id: 'gemini',  label: 'Gemini',  color: '#2563eb', envKey: 'VITE_GEMINI_KEY'    },
  { id: 'chatgpt', label: 'ChatGPT', color: '#16a34a', envKey: 'VITE_OPENAI_KEY'    },
];

async function callAI(provider, messages, systemPrompt) {
  const claudeKey  = VITE_ANTHROPIC_KEY || '';
  const geminiKey  = VITE_GEMINI_KEY    || '';
  const openaiKey  = VITE_OPENAI_KEY    || '';

  // ── Claude ───────────────────────────────────────────────
  if (provider === 'claude') {
    if (!claudeKey) return '⚠️ Claude API key missing. Add VITE_ANTHROPIC_KEY to your .env file.';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: systemPrompt,
        messages,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      return `Claude error: ${e?.error?.message || res.status}`;
    }
    const data = await res.json();
    return data.content?.[0]?.text || 'No response.';
  }

  // ── Gemini ───────────────────────────────────────────────
  if (provider === 'gemini') {
    if (!geminiKey) return '⚠️ Gemini API key missing. Add VITE_GEMINI_KEY to your .env file.';
    // Gemini uses a different message format — inject system as first user message
    const geminiContents = [
      { role: 'user',  parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I will only answer gym and health questions.' }] },
      ...messages.map((m) => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    ];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiContents }),
      },
    );
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      return `Gemini error: ${e?.error?.message || res.status}`;
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';
  }

  // ── ChatGPT (OpenAI) ─────────────────────────────────────
  if (provider === 'chatgpt') {
    if (!openaiKey) return '⚠️ ChatGPT API key missing. Add VITE_OPENAI_KEY to your .env file.';
    const oaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 600, messages: oaiMessages }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      return `ChatGPT error: ${e?.error?.message || res.status}`;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response from ChatGPT.';
  }

  return 'Unknown AI provider.';
}

// ── PAR-Q questions ──────────────────────────────────────────
const PARQ_QUESTIONS = [
  { key: 'p_q1', label: 'Has a doctor ever said that you have a heart condition AND that you should only do physical activity recommended by a doctor?' },
  { key: 'p_q2', label: 'Do you feel pain in your chest when you do physical activity?' },
  { key: 'p_q3', label: 'In the past month, have you had chest pain when you were NOT doing physical activity?' },
  { key: 'p_q4', label: 'Do you lose your balance because of dizziness or do you ever lose consciousness?' },
  { key: 'p_q5', label: 'Do you have a bone or joint problem (e.g. back, knee or hip) that could be made worse by a change in your physical activity?' },
  { key: 'p_q6', label: 'Is your doctor currently prescribing drugs (e.g. water pills) for your blood pressure or heart condition?' },
  { key: 'p_q7', label: 'Do you know of any other reason why you should not do physical activity?' },
];

function ParQCard({ parq, onOpen }) {
  const isTrue = (v) => String(v) === 'True' || String(v) === 'true' || v === 1 || v === true || v === '1';
  const hasYes = isTrue(parq?.q1_heart_condition) || isTrue(parq?.q2_chest_pain_activity) ||
                 isTrue(parq?.q3_chest_pain_rest) || isTrue(parq?.q4_dizziness) ||
                 isTrue(parq?.q5_bone_joint) || isTrue(parq?.q6_blood_pressure_meds) ||
                 isTrue(parq?.q6_bp_medication) || isTrue(parq?.q7_other_reason);
  const hasFlag  = hasYes && !isTrue(parq?.physician_clearance);
  const submitted = !!parq;
  return (
    <div className="gym-card" style={{ border: hasFlag ? '1px solid rgba(255,71,71,.25)' : submitted ? '1px solid rgba(71,255,154,.2)' : '1px solid var(--gym-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: hasFlag ? 'rgba(255,71,71,.1)' : submitted ? 'rgba(71,255,154,.1)' : 'rgba(71,200,255,.1)', color: hasFlag ? 'var(--gym-accent2)' : submitted ? 'var(--gym-success)' : 'var(--gym-accent3)' }}>
            <HeartIcon />
          </div>
          <div>
            <div className="gym-card-title mb-0">⚕️ Health Questionnaire (PAR-Q)</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>
              {submitted
                ? hasFlag
                  ? '⚠️ Health flags noted — please consult your trainer'
                  : '✅ Completed — no flags detected'
                : 'Optional but recommended before starting your program'}
            </div>
          </div>
        </div>
        <button onClick={onOpen} className="btn btn-secondary btn-sm flex-shrink-0">
          {submitted ? '✏️ Update' : '+ Complete'}
        </button>
      </div>
      {submitted && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PARQ_QUESTIONS.map((q, i) => (
            <div key={q.key} className="flex items-center gap-1.5 p-2 rounded-lg"
              style={{ background: parq[q.key.replace('p_', '')] ? 'rgba(255,71,71,.08)' : 'var(--gym-surface2)' }}>
              <span className="text-xs" style={{ color: parq[q.key.replace('p_', '')] ? 'var(--gym-accent2)' : 'var(--gym-muted)' }}>
                {parq[q.key.replace('p_', '')] ? '⚠' : '✓'}
              </span>
              <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>Q{i + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function MemberDashboard() {
  const dispatch         = useDispatch();
  const navigate         = useNavigate();
  const location         = useLocation();

  const closeReqSchedModal = () => {
    setShowReqSched(false);
    const params = new URLSearchParams(window.location.search);
    if (params.get('request') === 'session') {
      navigate('/dashboard', { replace: true });
    }
  };
  const user             = useSelector((s) => s.auth.user);
  const schedules        = useSelector((s) => s.schedules?.data || []);
  const subscriptions    = useSelector((s) => s.subscriptions?.data || []);
  const attendance       = useSelector((s) => s.attendance?.data || []);
  const trainers         = useSelector((s) => s.trainers?.data || []);
  const users             = useSelector((s) => s.users?.data || []);
  const assignments      = useSelector((s) => s.assignments?.data || []);
  const payments         = useSelector((s) => s.payments?.data || []);
  const timeslots        = useSelector((s) => s.timeslots?.data || []);
  const trainerTimeslots = useSelector((s) => s.trainerTimeslots?.data || []);
  const myParQ           = useSelector((s) => s.parq?.mine || null);
  const myWorkouts       = useSelector((s) => s.workouts?.data || []);

  // ── Modal flags ───────────────────────────────────────────
  const [showProfile,  setShowProfile]  = useState(false);
  const [showPayment,  setShowPayment]  = useState(false);
  const [showReqSched, setShowReqSched] = useState(false);
  const [showAllPay,   setShowAllPay]   = useState(false);
  const [showParQ,     setShowParQ]     = useState(false);
  const [paymentMode,  setPaymentMode]  = useState('card');

  // ── Workflow state ────────────────────────────────────────
  const [trainerRequests, setTrainerRequests] = useState([]);
  const [cashRequests,    setCashRequests]    = useState([]);

  // ── Profile edit ──────────────────────────────────────────
  const [editMode,   setEditMode]   = useState(false);
  const [editForm,   setEditForm]   = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState('');

  // ── Payment ───────────────────────────────────────────────
  const [payForm, setPayForm] = useState({
    subscriptionId: '', amount: '', customerEmail: '',
    cardNumber: '', cardHolder: '', bankName: '',
    expMonth: '', expYear: '', cvc: '',
  });
  const [payLoading, setPayLoading] = useState(false);
  const [payMsg,     setPayMsg]     = useState('');
  const [payError,   setPayError]   = useState('');

  // ── RFID ──────────────────────────────────────────────────
  const [memberId,       setMemberId]       = useState(null);
  const [memberIdLoading, setMemberIdLoading] = useState(true);
  const [memberRfidId,   setMemberRfidId]   = useState(null);
  // The physical rfid_number for the assigned tag. GYM_ATTENDANCE_PROC's
  // check-in/check-out actions look tags up by rfid_number, not by the
  // rfId_Id PK (a real scanner only knows the physical code), so this is
  // resolved separately and used for the actual API calls below —
  // assignedRfidId (the PK) stays as-is for display only.
  const [assignedRfidNumber, setAssignedRfidNumber] = useState(null);
  const [rfidLoading, setRfidLoading] = useState(false);
  const [rfidMsg,     setRfidMsg]     = useState('');
  const [rfidError,   setRfidError]   = useState('');

  // ── BMI state (used only for passing to WellnessHub as initial values) ──
  const [bmiH, setBmiH] = useState('');
  const [bmiW, setBmiW] = useState('');

  // ── AI chat ───────────────────────────────────────────────
  const [showAI,      setShowAI]      = useState(false);
  const [aiProvider,  setAiProvider]  = useState('claude');   // 'claude' | 'gemini' | 'chatgpt'
  const [aiInput,     setAiInput]     = useState('');
  const [aiMsgs,      setAiMsgs]      = useState([]);
  const [aiLoading,   setAiLoading]   = useState(false);
  const aiEndRef = useRef(null);

  // ── Schedule request ──────────────────────────────────────
  const [schedForm,   setSchedForm]   = useState({ p_trainer_id: '', p_timeslot_id: '', p_schedule_date: '' });
  const [schedSaving, setSchedSaving] = useState(false);

  // ── PAR-Q form ────────────────────────────────────────────
  const initParQ = () => ({
    p_q1: false, p_q2: false, p_q3: false, p_q4: false,
    p_q5: false, p_q6: false, p_q7: false,
    p_q7_details: '', p_physician_clearance: false,
  });
  const [parqForm,   setParqForm]   = useState(initParQ());
  const [parqSaving, setParqSaving] = useState(false);

  // ── Data fetch ────────────────────────────────────────────
  useEffect(() => {
    if (user?.userId) {
      dispatch(fetchSubscriptions());
      dispatch(fetchTrainers());
      dispatch(fetchUsers());
      dispatch(fetchAssignments());
      dispatch(fetchTimeslots());
      dispatch(fetchTrainerTimeslots());
      dispatch(fetchMyParQ(user.userId)); // PAR-Q uses userId
      dispatch(fetchPlans());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (memberId) {
      dispatch(fetchSchedulesByMember(memberId));
      dispatch(fetchPaymentsByMember(memberId));
      dispatch(fetchMemberAttendance(memberId));
      dispatch(fetchWorkoutsByMember(memberId));
    }
  }, [dispatch, memberId]);

  useEffect(() => {
    if (!user?.userId) return;
    let cancelled = false;

    const loadMemberRfid = async () => {
      try {
        const res = await api.getMemberByUserId(user.userId);
        const payload = res?.data?.ResultSet ?? res?.data;
        const member = Array.isArray(payload) ? payload[0] : payload;
        if (!cancelled && member) {
          setMemberId(member.memberId);
          setMemberRfidId(member?.rfId_Id ?? member?.rfidId ?? null);
        }
      } catch {
        if (!cancelled) {
          setMemberId(null);
          setMemberRfidId(null);
        }
      } finally {
        if (!cancelled) setMemberIdLoading(false);
      }
    };

    loadMemberRfid();
    return () => { cancelled = true; };
  }, [user?.userId]);

  // Handle URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('request') === 'session') {
      setShowReqSched(true);
    } else {
      setShowReqSched(false);
    }
    if (params.get('pay') === 'now') {
      openPayment();
      // Clean up URL param after opening modal
      navigate('/dashboard', { replace: true });
    }
  }, [location.search]);

  // ── Workflow store sync ───────────────────────────────────
  useEffect(() => {
    if (!user?.userId) return undefined;
    const sync = () => {
      setTrainerRequests(getTrainerRequests().filter((r) => String(r.memberId) === String(user.userId)));
      setCashRequests(getCashPaymentRequests().filter((r) => String(r.memberId) === String(user.userId)));
    };
    sync();
    return subscribeWorkflowStore(sync);
  }, [user?.userId]);

  // ── Pre-fill PAR-Q from existing record ──────────────────
  useEffect(() => {
    if (myParQ) {
      const isTrue = (v) => String(v) === 'True' || String(v) === 'true' || v === 1 || v === true || v === '1';
      setParqForm({
        p_q1: isTrue(myParQ.q1_heart_condition),
        p_q2: isTrue(myParQ.q2_chest_pain_activity),
        p_q3: isTrue(myParQ.q3_chest_pain_rest),
        p_q4: isTrue(myParQ.q4_dizziness),
        p_q5: isTrue(myParQ.q5_bone_joint),
        p_q6: isTrue(myParQ.q6_blood_pressure_meds || myParQ.q6_bp_medication),
        p_q7: isTrue(myParQ.q7_other_reason),
        p_q7_details:        myParQ.q7_other_details || '',
        p_physician_clearance: isTrue(myParQ.physician_clearance),
      });
    }
  }, [myParQ]);

  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMsgs]);

  // ── Derived data ──────────────────────────────────────────
  const plans             = useSelector((s) => s.plans?.data || []);
  const mySubscriptions   = memberIdLoading
    ? []
    : subscriptions
        .filter((s) => String(s.memberId) === String(memberId || user?.userId))
        .sort((a, b) => new Date(b.startDate || b.created_date || 0) - new Date(a.startDate || a.created_date || 0));
  const activeSub         = mySubscriptions.find((s) => s.is_active || s.isActive || String(s.status || '').toLowerCase() === 'active');
  const currentSub        = activeSub || mySubscriptions[0] || null;
  const subscriptionStatus = (() => {
    const rawStatus = (currentSub?.status || '').trim().toLowerCase();
    if (rawStatus) return rawStatus;
    if (currentSub?.is_active || currentSub?.isActive) return 'active';
    if (currentSub) return 'inactive';
    return '';
  })();
  const hasPendingSubscriptionPayment = Boolean(
    currentSub && ['inactive', 'pending', 'pending_payment', 'unpaid'].includes(subscriptionStatus)
  );
  const assignedRfidId    = memberRfidId || currentSub?.rfid_Id || null;

  // Resolve the PK above down to the physical rfid_number, which is what
  // check-in/check-out actually need to send. See note by
  // assignedRfidNumber's useState for why.
  useEffect(() => {
    if (!assignedRfidId) { setAssignedRfidNumber(null); return undefined; }
    let cancelled = false;
    api.getRfidTagById(assignedRfidId)
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data?.ResultSet ?? res?.data;
        const tag = Array.isArray(payload) ? payload[0] : payload;
        setAssignedRfidNumber(tag?.rfid_number || null);
      })
      .catch(() => { if (!cancelled) setAssignedRfidNumber(null); });
    return () => { cancelled = true; };
  }, [assignedRfidId]);

  const myPayments        = payments.filter(p => !((p.payment_type || '').toLowerCase() === 'card' && (p.payment_status || '').toLowerCase() === 'pending'));
  const pendingSessions   = schedules.filter((s) => s.status === 'Pending');
  const scheduledSessions = schedules.filter((s) => s.status === 'Scheduled');
  const recentAttendance  = (attendance || []).slice(0, 6);
  const myAssignments     = assignments.filter((a) => String(a.memberId) === String(user?.userId));
  const myTrainers        = trainers.filter((t) =>
    myAssignments.some((a) => String(a.trainerId) === String(t.trainerId) || String(a.trainer_Id) === String(t.trainerId))
  );

  const getTrainerLabel = (t) => {
    const tUserId = t.userId ?? t.UserId ?? t.user_Id ?? t.User_Id;
    const u = users.find((x) =>
      String(x.userId ?? x.UserId ?? x.user_Id ?? x.User_Id) === String(tUserId)
    );
    const uName  = u?.username ?? u?.Username ?? u?.UserName;
    const uFirst = u?.firstName ?? u?.FirstName ?? u?.first_name;
    const uLast  = u?.lastName ?? u?.LastName ?? u?.last_name;
    const tName   = t.username ?? t.Username ?? t.UserName;
    const tTrName = t.trainerName ?? t.TrainerName ?? t.trainer_name;
    const tFirst  = t.firstName ?? t.FirstName ?? t.first_name;
    const tLast   = t.lastName ?? t.LastName ?? t.last_name;
    const composedName = `${tFirst || uFirst || ''} ${tLast || uLast || ''}`.trim();
    return tName || uName || tTrName || composedName || `Trainer #${t.trainerId}`;
  };

  const resolvePlanName = (sub) => {
    if (!sub) return 'Unknown';
    if (sub.planType) return sub.planType;
    const plan = plans.find((p) => String(p.planId) === String(sub.planId));
    return plan?.planType || `Plan #${sub.planId}`;
  };
  const resolvePlanPrice = (sub) => {
    if (!sub) return null;
    if (sub.price) return sub.price;
    const plan = plans.find((p) => String(p.planId) === String(sub.planId));
    return plan?.price || null;
  };
  const memberDisplayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || user?.email || 'Member';
  const paymentActionLabel = hasPendingSubscriptionPayment ? 'Pay Now' : currentSub ? 'View Payment' : 'Pay Now';

  const statusVariant = (s) => s === 'Scheduled' ? 'confirmed' : s === 'Cancelled' ? 'inactive' : 'pending';
  const displayedPayments = showAllPay ? myPayments : myPayments.slice(0, 5);
  const upcomingWorkouts = myWorkouts
    .slice()
    .sort((a, b) => new Date(b.scheduleDate || 0) - new Date(a.scheduleDate || 0));

  // ── Handlers ──────────────────────────────────────────────
  const openProfile = () => {
    setEditMode(false); setEditError('');
    setEditForm({
      p_user_id:     user.userId,
      p_admin_id:    user.userId,
      p_username:    user.username || '',
      p_email:       user.email    || '',
      p_phone:       user.phone    || '',
      p_blood_group: '',
      p_height:      '',
      p_weight:      '',
      p_fitness_goal:'',
      p_password_hash: '',
    });
    setShowProfile(true);
  };

  const handleSaveProfile = async () => {
    if (editForm.p_phone && editForm.p_phone.length !== 10) {
      setEditError('Phone must be exactly 10 digits.'); return;
    }
    if (!memberId) {
      setEditError('Could not resolve your member record yet — please try again in a moment.');
      return;
    }
    setEditSaving(true); setEditError('');
    try {
      const res = await api.editUser(editForm, user.userId);
      if (res.data?.StatusCode === 200) {
        const memberRes = await api.editMember({
          p_member_id:    memberId,
          p_blood_group:  editForm.p_blood_group,
          p_height:       editForm.p_height,
          p_weight:       editForm.p_weight,
          p_fitness_goal: editForm.p_fitness_goal,
          p_admin_id:     user.userId,
        }, user.userId);

        if (memberRes.data?.StatusCode !== 200) {
          setEditError(memberRes.data?.Result || 'Profile details saved, but health/fitness fields failed to update.');
          setEditSaving(false);
          return;
        }

        if (editForm.p_height) setBmiH(editForm.p_height);
        if (editForm.p_weight) setBmiW(editForm.p_weight);
        setEditMode(false);
      } else { setEditError(res.data?.Result || 'Update failed.'); }
    } catch { setEditError('Could not connect.'); }
    setEditSaving(false);
  };

  const openPayment = () => {
    setPaymentMode('card');
    setPayForm({
      subscriptionId: currentSub?.subscriptionId || '',
      amount:         resolvePlanPrice(currentSub) || currentSub?.price || '',
      customerEmail:  user?.email               || '',
      cardNumber: '', cardHolder: '', bankName: '',
      expMonth: '', expYear: '', cvc: '',
    });
    setPayMsg(''); setPayError(''); setShowPayment(true);
  };

  const handlePaymentAction = () => {
    if (hasPendingSubscriptionPayment || !currentSub) openPayment();
    else navigate('/payments');
  };

  const handleCardPayment = async () => {
    if (!payForm.subscriptionId || !payForm.amount || payForm.cardNumber.replace(/\s/g,'').length !== 16) {
      setPayError('Please fill all required fields (card number must be 16 digits).'); return;
    }
    setPayLoading(true); setPayError(''); setPayMsg('');
    try {
      const res = await api.initiateCardPayment({
        subscriptionId: payForm.subscriptionId,
        amount:         payForm.amount,
        customerEmail:  payForm.customerEmail,
      });
      if (res.data?.StatusCode === 200 || res.data?.StatusCode === 201) {
        const intentId = res.data.ResultSet?.paymentIntentId;
        if (intentId) {
          await api.confirmCardPayment(intentId);
        }
        dispatch(fetchPaymentsByMember(user.userId));
        setPayMsg('Payment successful! Check your email for confirmation.');
        setTimeout(() => setShowPayment(false), 3000);
      } else { setPayError(res.data?.Result || 'Payment initiation failed.'); }
    } catch { setPayError('Could not connect to payment server.'); }
    setPayLoading(false);
  };

  const handleCashPaymentRequest = () => {
    if (!payForm.subscriptionId || !payForm.amount) {
      setPayError('Select a subscription and amount before sending a cash payment request.');
      return;
    }
    const existing = cashRequests.find(
      (r) => String(r.subscriptionId) === String(payForm.subscriptionId) &&
             ['pending', 'otp_generated'].includes(r.status)
    );
    if (existing) {
      setPayError('You already have a cash payment request waiting for admin confirmation.');
      return;
    }
    createCashPaymentRequest({
      memberId:       user.userId,
      memberName:     user.username || user.email || `Member #${user.userId}`,
      memberEmail:    user.email   || '',
      memberPhone:    user.phone   || '',
      subscriptionId: payForm.subscriptionId,
      amount:         payForm.amount,
      planLabel:      currentSub?.planType || resolvePlanName(currentSub) || `Subscription #${payForm.subscriptionId}`,
    });
    setPayError('');
    setPayMsg('Cash payment request sent. Meet the admin counter to continue with OTP verification.');
    dispatch(showToast('Cash payment request sent to admin!', 'success'));
    setTimeout(() => setShowPayment(false), 1200);
  };

  const handleMemberCashOtpConfirm = (request, otp) => {
    const result = confirmCashPaymentOtp(request.id, otp, 'member');
    if (result.ok) dispatch(showToast('Cash payment OTP confirmed!', 'success'));
    else           dispatch(showToast(result.message, 'error'));
  };

  const handleMemberAttendance = async (mode) => {
    if (!assignedRfidId) {
      setRfidError('No RFID assigned to your account. Please contact admin.');
      setRfidMsg('');
      return;
    }
    if (!assignedRfidNumber) {
      setRfidError('Could not resolve your RFID tag details. Please contact admin.');
      setRfidMsg('');
      return;
    }

    setRfidLoading(true); setRfidMsg(''); setRfidError('');
    try {
      const res = mode === 'in'
        ? await api.checkIn(assignedRfidNumber)
        : await api.checkOut(assignedRfidNumber);

      if (res?.data?.StatusCode === 200) {
        setRfidMsg(mode === 'in' ? 'Check-in recorded successfully.' : 'Check-out recorded successfully.');
        dispatch(fetchMemberAttendance(user.userId));
      } else {
        setRfidError(res?.data?.Result || 'Attendance action failed.');
      }
    } catch {
      setRfidError('Could not connect to the attendance server.');
    }
    setRfidLoading(false);
  };

  const handleSaveParQ = async () => {
    setParqSaving(true);
    const ok = await dispatch(saveParQ(user.userId, parqForm, !!myParQ));
    setParqSaving(false);
    if (ok) setShowParQ(false);
  };

  // ── AI message sender (multi-provider) ───────────────────
  const sendAIMessage = async () => {
    const txt = aiInput.trim();
    if (!txt || aiLoading) return;
    const newMsgs = [...aiMsgs, { role: 'user', content: txt }];
    setAiMsgs(newMsgs); setAiInput(''); setAiLoading(true);
    try {
      const reply = await callAI(aiProvider, newMsgs, AI_SYSTEM);
      setAiMsgs((m) => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setAiMsgs((m) => [...m, { role: 'assistant', content: 'Connection error. Check your network and API key.' }]);
    }
    setAiLoading(false);
  };

  const handleRequestSchedule = async () => {
    if (!schedForm.p_trainer_id || !schedForm.p_timeslot_id || !schedForm.p_schedule_date) return;
    setSchedSaving(true);
    const ok = await dispatch(addSchedule({
      ...schedForm,
      p_member_id: memberId || user.userId,
      p_rfid_id:   assignedRfidId || '',
      p_status:    'Pending',
    }, user.userId));
    setSchedSaving(false);
    if (ok) { closeReqSchedModal(); setSchedForm({ p_trainer_id: '', p_timeslot_id: '', p_schedule_date: '' }); }
  };

  const handleTrainerRequest = (trainer) => {
    const existing = trainerRequests.find((r) => String(r.trainerId) === String(trainer.trainerId));
    if (existing?.status === 'pending') {
      dispatch(showToast('That trainer request is already waiting for approval.', 'error')); return;
    }
    if (myAssignments.some((a) => String(a.trainerId || a.trainer_Id) === String(trainer.trainerId))) {
      dispatch(showToast('This trainer is already assigned to you.', 'success')); return;
    }
    createTrainerRequest({
      memberId:    user.userId,
      memberName:  user.username || user.email || `Member #${user.userId}`,
      memberEmail: user.email   || '',
      memberPhone: user.phone   || '',
      trainerId:        trainer.trainerId,
      trainerUserId:    trainer.userId || trainer.trainerId,
      trainerName:      trainer.username,
      trainerEmail:     trainer.email || '',
      trainerProfileSnapshot: {
        gender:         trainer.gender         || '',
        experience:     trainer.experience_years || '',
        qualifications: trainer.qualifications || trainer.bio || '',
      },
    });
    dispatch(showToast(`Trainer request sent to ${trainer.username}.`, 'success'));
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-3xl sm:text-4xl tracking-widest leading-none" style={{ fontFamily: "'Bebas Neue', cursive", color: 'var(--gym-text)' }}>
            Welcome, <span style={{ color: 'var(--gym-success)' }}>{user?.username}</span>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>Member Portal — DTS GYM · {user?.email}</div>
        </div>
        <button onClick={openProfile}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-150 hover:-translate-y-0.5"
          style={{ background: 'var(--gym-surface)', border: '1px solid var(--gym-border)', color: 'var(--gym-text)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold overflow-hidden"
            style={{ background: 'rgba(71,255,154,0.2)', color: 'var(--gym-success)', border: '1.5px solid rgba(71,255,154,0.4)', fontFamily: "'Space Mono', monospace" }}>
            {getProfileImg(user) ? (
              <img src={getImgUrl(getProfileImg(user))} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              (user?.username || user?.email || 'M').charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-semibold">{user?.username}</div>
            <div className="text-xs" style={{ color: 'var(--gym-success)' }}>Member · Edit Profile</div>
          </div>
          <span style={{ color: 'var(--gym-muted)' }}>→</span>
        </button>
      </div>

      {/* ── Stat Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MiniStat label="Subscription" value={currentSub ? subscriptionStatus || 'assigned' : 'None'} sub={currentSub ? `Plan ${resolvePlanName(currentSub)}` : 'No active plan'} color={subscriptionStatus === 'active' ? 'var(--gym-success)' : 'var(--gym-warning)'} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>} />
        <MiniStat label="My Sessions" value={schedules.length} sub={`${scheduledSessions.length} confirmed · ${pendingSessions.length} pending`} color="var(--gym-accent3)" icon={<CalIcon />} />
        <MiniStat label="Attendance" value={recentAttendance.length} sub="Check-ins recorded" color="var(--gym-success)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>} />
        <MiniStat label="My Trainers" value={myTrainers.length} sub="Assigned to you" color="var(--gym-accent)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>} />
      </div>

      {/* ── PAR-Q Health Card ────────────────────────────── */}
      <ParQCard parq={myParQ} onOpen={() => setShowParQ(true)} />

      {/* ── RFID Scanner ─────────────────────────────────── */}
      <div className="gym-card" style={{ border: '1px solid rgba(71,200,255,0.2)', background: 'rgba(71,200,255,0.03)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(71,200,255,0.15)', color: 'var(--gym-accent3)' }}><RfidIcon /></div>
          <div>
            <div className="gym-card-title mb-0" style={{ color: 'var(--gym-accent3)' }}>My Attendance</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>Use your assigned RFID for check-in/check-out.</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'var(--gym-surface2)' }}>
            <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>Assigned RFID ID</span>
            <span className="font-mono text-sm" style={{ color: assignedRfidId ? 'var(--gym-accent3)' : 'var(--gym-warning)' }}>
              {assignedRfidId || 'Not Assigned'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleMemberAttendance('in')}
              disabled={rfidLoading || !assignedRfidId}
              className="btn btn-success flex-1 justify-center"
            >
              {rfidLoading ? '…' : <><RfidIcon /><span className="ml-1">CHECK IN</span></>}
            </button>
            <button
              onClick={() => handleMemberAttendance('out')}
              disabled={rfidLoading || !assignedRfidId}
              className="btn btn-secondary flex-1 justify-center"
            >
              {rfidLoading ? '…' : <><RfidIcon /><span className="ml-1">CHECK OUT</span></>}
            </button>
          </div>
        </div>
        {rfidMsg   && <div className="mt-2 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(71,255,154,.08)', border: '1px solid rgba(71,255,154,.25)', color: 'var(--gym-success)' }}>{rfidMsg}</div>}
        {rfidError && <div className="mt-2 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,71,71,.08)', border: '1px solid rgba(255,71,71,.22)', color: 'var(--gym-accent2)' }}>⚠ {rfidError}</div>}
      </div>

      {/* ── Main Grid ────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* My Sessions */}
        <div className="gym-card">
          <div className="flex items-center justify-between mb-4">
            <div className="gym-card-title mb-0">My Sessions</div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowReqSched(true)}>+ Request</button>
          </div>
          {schedules.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No sessions booked yet</div>
          ) : (
            <div className="space-y-2">
              {schedules.slice(0, 5).map((s) => (
                <div key={s.scheduleId} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.status === 'Scheduled' ? 'var(--gym-success)' : s.status === 'Cancelled' ? 'var(--gym-accent2)' : 'var(--gym-warning)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--gym-text)' }}>Session #{s.scheduleId}</div>
                    <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(s.scheduleDate)}</div>
                  </div>
                  <Badge variant={statusVariant(s.status)}>{s.status || 'Pending'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions + Subscription */}
        <div className="space-y-4">
          <div className="gym-card">
            <div className="gym-card-title">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <CalIcon />,     label: 'Book Session',  action: () => setShowReqSched(true),  color: 'var(--gym-accent3)' },
                { icon: <CardPayIcon />, label: paymentActionLabel, action: handlePaymentAction,       color: 'var(--gym-warning)' },
                { icon: <HeartIcon />,   label: 'PAR-Q Health',  action: () => setShowParQ(true),      color: (Number(myParQ?.physician_clearance) === 0) ? 'var(--gym-accent2)' : 'var(--gym-success)' },
                { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/></svg>, label: 'My Workouts', route: '/workouts', color: 'var(--gym-success)' },
                { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>, label: 'Equipment Tracker', route: '/equipment', color: 'var(--gym-accent)' },
              ].map(({ icon, label, route, color, action }) => (
                <button key={label} onClick={() => action ? action() : navigate(route)}
                  className="flex items-center gap-2 p-3 rounded-xl w-full text-left transition-all duration-150"
                  style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '18', color }}>{icon}</span>
                  <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--gym-text2)' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="gym-card">
            <div className="gym-card-title">My Subscription</div>
            {currentSub ? (() => {
              const isPending = subscriptionStatus === 'pending';
              const isActive = subscriptionStatus === 'active';
              const cardBg = isPending ? 'rgba(255,179,71,.08)' : isActive ? 'rgba(71,255,154,.06)' : 'rgba(150,150,150,.06)';
              const cardBorder = isPending ? '1px solid rgba(255,179,71,.25)' : isActive ? '1px solid rgba(71,255,154,.15)' : '1px solid var(--gym-border)';
              const accentColor = isPending ? 'var(--gym-warning)' : isActive ? 'var(--gym-success)' : 'var(--gym-muted)';
              return (
                <div className="p-4 rounded-xl" style={{ background: cardBg, border: cardBorder }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs tracking-widest uppercase" style={{ color: 'var(--gym-muted)' }}>{subscriptionStatus || 'subscription'}</div>
                    <Badge variant={isActive ? 'active' : isPending ? 'pending' : 'inactive'}>{subscriptionStatus ? subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1) : 'Unknown'}</Badge>
                  </div>
                  <div className="text-xl font-bold mb-1" style={{ color: accentColor, fontFamily: "'Bebas Neue', cursive" }}>{resolvePlanName(currentSub)}</div>
                  <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(currentSub.startDate)} → {formatDate(currentSub.end_date)}</div>
                  {isPending && (
                    <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,179,71,.1)', border: '1px solid rgba(255,179,71,.2)', color: 'var(--gym-warning)' }}>
                      ⏳ Payment pending — please complete payment to activate your subscription.
                    </div>
                  )}
                  <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${isPending ? 'rgba(255,179,71,0.15)' : isActive ? 'rgba(71,255,154,0.15)' : 'var(--gym-border)'}` }}>
                    <span className="text-sm font-bold" style={{ color: accentColor }}>{formatCurrency(resolvePlanPrice(currentSub) || 0)}</span>
                    {hasPendingSubscriptionPayment ? (
                      <button onClick={openPayment} className="btn btn-sm" style={{ background: 'rgba(255,179,71,0.15)', color: 'var(--gym-warning)', border: '1px solid rgba(255,179,71,0.35)', fontWeight: 700 }}>💳 Pay Now</button>
                    ) : (
                      <button onClick={handlePaymentAction} className="btn btn-sm" style={{ background: 'rgba(71,255,154,0.12)', color: 'var(--gym-success)', border: '1px solid rgba(71,255,154,0.25)' }}>💳 {paymentActionLabel}</button>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,179,71,.06)', border: '1px solid rgba(255,179,71,.15)' }}>
                <div className="text-sm mb-1" style={{ color: 'var(--gym-muted)' }}>No active subscription</div>
                <div className="text-xs" style={{ color: 'var(--gym-warning)' }}>Contact admin to subscribe</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trainer Request Panel removed from here (now in Sidebar -> Our Trainers) */}

      <div className="gym-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="gym-card-title mb-0">My Workouts</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>{myWorkouts.length} assigned exercises</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/schedules')}>View All</button>
        </div>
        {myWorkouts.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No workouts assigned yet.</div>
        ) : (
          <div className="space-y-2">
            {upcomingWorkouts.slice(0, 6).map((w) => (
              <div key={w.use_Id || w.wse_id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(71,255,154,0.12)', color: 'var(--gym-success)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--gym-text)' }}>{w.exerciseName || `Exercise #${w.exercise_Id}`}</div>
                  <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>
                    Session #{w.scheduleId} - {formatDate(w.scheduleDate)} - {w.sets || '-'} sets x {w.reps || '-'} reps
                  </div>
                </div>
                <Badge variant={w.sub_status === 'completed' ? 'active' : 'pending'}>{w.sub_status === 'completed' ? 'Done' : 'To Do'}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Wellness Hub (BMI + Calorie + Water — no duplicate) ── */}
      <WellnessHub initialHeight={bmiH} initialWeight={bmiW} />

      {/* ── Cash Payment Request Card ─────────────────────── */}
      <CashPaymentRequestCard requests={cashRequests} onConfirmOtp={handleMemberCashOtpConfirm} />

      {/* ── Payments ──────────────────────────────────────── */}
      <div className="gym-card">
        <div className="flex items-center justify-between mb-4">
          <div><div className="gym-card-title mb-0">💳 My Payments</div><div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>Your payment history</div></div>
          <button onClick={handlePaymentAction} className="btn btn-primary btn-sm"><CardPayIcon /> {paymentActionLabel}</button>
        </div>
        {myPayments.length === 0 ? (
          <div className="py-8 text-center"><div className="text-sm" style={{ color: 'var(--gym-muted)' }}>No payment records yet</div></div>
        ) : (
          <>
            <div className="space-y-2">
                {displayedPayments.map((p) => (
                  <div key={p.paymentId} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(71,200,255,0.15)', color: 'var(--gym-accent3)' }}><CardPayIcon /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--gym-text)' }}>{p.memberName || memberDisplayName}</div>
                      <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{p.planType || resolvePlanName(currentSub) || `Payment #${p.paymentId}`}</div>
                      <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(p.payment_date)}</div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <div className="text-sm font-bold" style={{ color: 'var(--gym-success)' }}>{formatCurrency(p.paymentAmount)}</div>
                      <Badge variant={p.payment_status === 'completed' ? 'active' : p.payment_status === 'pending' ? 'pending' : 'inactive'}>{p.payment_status || 'pending'}</Badge>
                      <button className="btn btn-secondary btn-sm" onClick={() => dispatch(downloadReceipt(p.paymentId))}>Receipt</button>
                    </div>
                  </div>
                ))}
            </div>
            {myPayments.length > 5 && (
              <button onClick={() => setShowAllPay((v) => !v)} className="btn btn-secondary w-full justify-center mt-3 btn-sm">
                {showAllPay ? 'Show less' : `Show all ${myPayments.length} payments`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Help & Contact ────────────────────────────────── */}
      <div className="gym-card">
        <div className="gym-card-title">🆘 Help &amp; Contact</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {myTrainers.length > 0 ? myTrainers.map((t) => (
            <div key={t.trainerId} className="p-4 rounded-xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
              <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--gym-accent3)' }}>Your Trainer</div>
              <div className="font-semibold text-sm" style={{ color: 'var(--gym-text)' }}>{getTrainerLabel(t)}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>{t.email || 'Contact via front desk'}</div>
            </div>
          )) : (
            <div className="p-4 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
              <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>No trainer assigned yet.</div>
            </div>
          )}
          <div className="p-4 rounded-xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
            <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--gym-warning)' }}>Gym Admin</div>
            <div className="font-semibold text-sm" style={{ color: 'var(--gym-text)' }}>DTS Gym Management</div>
            <div className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>admin@dtsgym.lk</div>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(71,200,255,.06)', border: '1px solid rgba(71,200,255,.15)', color: 'var(--gym-muted)' }}>
          💡 For urgent issues visit the front desk or call during gym hours (6AM–10PM).
        </div>
      </div>

      {/* ── Attendance ────────────────────────────────────── */}
      <div className="gym-card">
        <div className="flex items-center justify-between mb-4">
          <div className="gym-card-title mb-0">📋 My Attendance</div>
          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--gym-surface2)', color: 'var(--gym-muted)' }}>{(attendance || []).length} records</span>
        </div>
        {(attendance || []).length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No attendance records yet. Use RFID to check in.</div>
        ) : (
          <div className="space-y-2">
            {(attendance || []).slice(0, 10).map((a) => (
              <div key={a.attendanceId} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.checkOutTime ? 'var(--gym-muted)' : 'var(--gym-success)' }} />
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--gym-text)' }}>{a.checkOutTime ? 'Checked Out' : '🟢 Currently Inside'}</div>
                  <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(a.checkInTime)}</div>
                </div>
                <div className="text-xs font-mono text-right" style={{ color: 'var(--gym-muted)' }}>
                  {a.checkInTime ? a.checkInTime.substring(11,16) : ''}{a.checkOutTime ? ` → ${a.checkOutTime.substring(11,16)}` : ''}
                </div>
                <Badge variant={a.checkOutTime ? 'inactive' : 'active'}>{a.checkOutTime ? 'Left' : 'Inside'}</Badge>
              </div>
            ))}
            {(attendance || []).length > 10 && (
              <div className="text-center text-xs pt-1" style={{ color: 'var(--gym-muted)' }}>Showing last 10 of {(attendance || []).length} check-ins</div>
            )}
          </div>
        )}
      </div>

      {/* ── Activities ────────────────────────────────────── */}
      <div className="gym-card">
        <div className="flex items-center justify-between mb-4">
          <div className="gym-card-title mb-0">🏃 My Activities</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/schedules')}>View All →</button>
        </div>
        {schedules.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No activities recorded yet.</div>
        ) : (
          <div className="space-y-2">
            {schedules.slice(0, 8).map((s) => (
              <div key={s.scheduleId} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: s.status === 'Scheduled' ? 'rgba(71,255,154,0.15)' : 'rgba(255,179,71,0.15)', color: s.status === 'Scheduled' ? 'var(--gym-success)' : 'var(--gym-warning)' }}>
                  <CalIcon />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--gym-text)' }}>Session #{s.scheduleId}{s.trainerName ? ` · ${s.trainerName}` : ''}</div>
                  <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(s.scheduleDate)}{s.starttime ? ` · ${s.starttime}–${s.endtime}` : ''}</div>
                </div>
                <Badge variant={s.status === 'Scheduled' ? 'confirmed' : s.status === 'Cancelled' ? 'inactive' : 'pending'}>{s.status || 'Pending'}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AI Floating Button ────────────────────────────── */}
      <button onClick={() => setShowAI((v) => !v)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-2xl transition-all duration-200 hover:scale-110 z-50"
        style={{ background: 'linear-gradient(135deg,#b47fff,#47c8ff)', boxShadow: '0 8px 32px rgba(180,127,255,.4)' }}
        title="AI Fitness Advisor">🤖</button>

      {/* ── AI Chat Panel (Multi-Provider) ───────────────── */}
      {showAI && (
        <div className="fixed bottom-24 right-6 w-80 rounded-2xl overflow-hidden shadow-2xl z-50"
          style={{ background: 'var(--gym-surface)', border: '1px solid rgba(180,127,255,.3)', height: 460, display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div className="px-4 pt-3 pb-2" style={{ background: 'linear-gradient(135deg,rgba(180,127,255,.15),rgba(71,200,255,.1))', borderBottom: '1px solid var(--gym-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--gym-text)' }}>🤖 AI Fitness Advisor</div>
                <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>Gym &amp; health topics only</div>
              </div>
              <button onClick={() => setShowAI(false)} style={{ color: 'var(--gym-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            {/* Provider selector */}
            <div className="flex gap-1">
              {AI_PROVIDERS.map((p) => (
                <button key={p.id} onClick={() => setAiProvider(p.id)}
                  style={{
                    flex: 1, padding: '3px 0', borderRadius: 8, fontSize: 10, fontWeight: 700,
                    border: `1px solid ${aiProvider === p.id ? p.color : 'transparent'}`,
                    background: aiProvider === p.id ? p.color + '22' : 'var(--gym-surface2)',
                    color: aiProvider === p.id ? p.color : 'var(--gym-muted)',
                    cursor: 'pointer',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {aiMsgs.length === 0 && (
              <div className="text-xs text-center py-4" style={{ color: 'var(--gym-muted)' }}>
                Ask about diet plans, workouts, nutrition…
              </div>
            )}
            {aiMsgs.map((m, i) => (
              <div key={i}
                className={`text-xs p-2 rounded-xl max-w-[90%] ${m.role === 'user' ? 'ml-auto' : ''}`}
                style={{ background: m.role === 'user' ? 'rgba(71,200,255,.15)' : 'var(--gym-surface2)', color: 'var(--gym-text)', border: '1px solid var(--gym-border)' }}>
                {m.content}
              </div>
            ))}
            {aiLoading && <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>Thinking…</div>}
            <div ref={aiEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3" style={{ borderTop: '1px solid var(--gym-border)' }}>
            <input className="gym-input flex-1 text-xs" placeholder="Ask a health question…" value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendAIMessage()} />
            <button className="btn btn-primary btn-sm" onClick={sendAIMessage} disabled={aiLoading}>↑</button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════ */}

      {/* ── PAR-Q Modal ──────────────────────────────────── */}
      <Modal isOpen={showParQ} onClose={() => setShowParQ(false)} title="⚕️ PHYSICAL ACTIVITY READINESS (PAR-Q)" maxWidth={540}>
        <div className="modal-body space-y-4">
          <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(71,200,255,.06)', border: '1px solid rgba(71,200,255,.15)', color: 'var(--gym-muted)' }}>
            ℹ️ This is a health screening questionnaire. It's <strong>optional</strong> and helps your trainer plan safe workouts for you.
            Answer honestly — your answers are visible only to your trainer and gym admin.
          </div>
          <div className="space-y-3">
            {PARQ_QUESTIONS.map((q, i) => (
              <div key={q.key} className="p-3 rounded-xl" style={{ background: 'var(--gym-surface2)', border: parqForm[q.key] ? '1px solid rgba(255,71,71,.2)' : '1px solid var(--gym-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm flex-1" style={{ color: 'var(--gym-text2)' }}>
                    <span className="font-bold mr-1" style={{ color: 'var(--gym-muted)' }}>Q{i + 1}.</span>{q.label}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {[['Yes', true], ['No', false]].map(([lbl, val]) => (
                      <button key={lbl} onClick={() => setParqForm((f) => ({ ...f, [q.key]: val }))}
                        className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                        style={{
                          background: parqForm[q.key] === val ? (val ? 'rgba(255,71,71,.2)' : 'rgba(71,255,154,.15)') : 'var(--gym-surface)',
                          color:      parqForm[q.key] === val ? (val ? 'var(--gym-accent2)' : 'var(--gym-success)')      : 'var(--gym-muted)',
                          border:    `1px solid ${parqForm[q.key] === val ? (val ? 'rgba(255,71,71,.3)' : 'rgba(71,255,154,.3)') : 'var(--gym-border)'}`,
                        }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {parqForm.p_q7 && (
              <div>
                <label className="gym-label">Please describe the other reason:</label>
                <textarea className="gym-input resize-none" rows={2} placeholder="Describe any other health concerns…"
                  value={parqForm.p_q7_details} onChange={(e) => setParqForm((f) => ({ ...f, p_q7_details: e.target.value }))} />
              </div>
            )}
            <div className="p-3 rounded-xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm" style={{ color: 'var(--gym-text2)' }}>I have received physician clearance to participate in physical activity.</div>
                <div className="flex gap-2 flex-shrink-0">
                  {[['Yes', true], ['No', false]].map(([lbl, val]) => (
                    <button key={lbl} onClick={() => setParqForm((f) => ({ ...f, p_physician_clearance: val }))}
                      className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: parqForm.p_physician_clearance === val ? 'rgba(71,255,154,.15)' : 'var(--gym-surface)',
                        color:      parqForm.p_physician_clearance === val ? 'var(--gym-success)'    : 'var(--gym-muted)',
                        border:    `1px solid ${parqForm.p_physician_clearance === val ? 'rgba(71,255,154,.3)' : 'var(--gym-border)'}`,
                      }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {PARQ_QUESTIONS.some((q) => parqForm[q.key]) && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,71,71,.06)', border: '1px solid rgba(255,71,71,.2)', color: 'var(--gym-accent2)' }}>
              ⚠️ You answered <strong>Yes</strong> to one or more questions. Please consult your doctor before starting intense exercise, and inform your trainer.
              {!parqForm.p_physician_clearance && ' Consider obtaining physician clearance.'}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowParQ(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveParQ} disabled={parqSaving}>
            {parqSaving ? 'Saving…' : myParQ ? '✓ Update PAR-Q' : '✓ Submit PAR-Q'}
          </button>
        </div>
      </Modal>

      {/* ── Profile Modal ─────────────────────────────────── */}
      <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="MY PROFILE" maxWidth={440}>
        {!editMode ? (
          <div className="modal-body space-y-3">
            <div className="flex flex-col items-center py-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold mb-3 overflow-hidden"
                style={{ background: 'rgba(71,255,154,0.15)', color: 'var(--gym-success)', border: '2px solid rgba(71,255,154,0.3)', fontFamily: "'Space Mono', monospace" }}>
                {getProfileImg(user) ? (
                  <img src={getImgUrl(getProfileImg(user))} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (user?.username || 'M').charAt(0).toUpperCase()
                )}
              </div>
              <div className="text-lg font-bold" style={{ color: 'var(--gym-text)' }}>{user?.username}</div>
              <Badge variant="active" className="mt-1">Member</Badge>
            </div>
            {[['Email', user?.email], ['Phone', user?.phone || '—'], ['User ID', user?.userId]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                <div className="text-xs font-medium" style={{ color: 'var(--gym-muted)' }}>{k}</div>
                <div className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="modal-body space-y-4">
            <FieldGroup label="Username"><input className="gym-input" value={editForm.p_username} onChange={(e) => setEditForm((f) => ({ ...f, p_username: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Phone (10 digits)"><input className="gym-input" type="tel" maxLength={10} value={editForm.p_phone} onChange={(e) => setEditForm((f) => ({ ...f, p_phone: e.target.value.replace(/\D/g,'').slice(0,10) }))} /></FieldGroup>
            <FieldGroup label="Email (cannot be changed)"><input className="gym-input" value={user?.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} /></FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Blood Group">
                <select className="gym-input" value={editForm.p_blood_group} onChange={(e) => setEditForm((f) => ({ ...f, p_blood_group: e.target.value }))}>
                  <option value="">Select…</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </FieldGroup>
              <FieldGroup label="Fitness Goal"><input className="gym-input" value={editForm.p_fitness_goal} onChange={(e) => setEditForm((f) => ({ ...f, p_fitness_goal: e.target.value }))} placeholder="e.g. Lose weight" /></FieldGroup>
              <FieldGroup label="Height (cm)"><input className="gym-input" type="number" value={editForm.p_height} onChange={(e) => setEditForm((f) => ({ ...f, p_height: e.target.value }))} /></FieldGroup>
              <FieldGroup label="Weight (kg)"><input className="gym-input" type="number" value={editForm.p_weight} onChange={(e) => setEditForm((f) => ({ ...f, p_weight: e.target.value }))} /></FieldGroup>
            </div>
            {editError && <div className="px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,71,71,.08)', color: 'var(--gym-accent2)' }}>⚠ {editError}</div>}
          </div>
        )}
        <div className="modal-footer">
          {editMode ? (
            <>
              <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Profile'}</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setShowProfile(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => setEditMode(true)}>✏️ Edit Profile</button>
            </>
          )}
        </div>
      </Modal>

      {/* ── Payment Modal ─────────────────────────────────── */}
      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title="💳 PAYMENT" maxWidth={460}>
        <div className="modal-body space-y-4">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
            {[['card','Card'],['cash','Cash']].map(([mode, label]) => (
              <button key={mode} className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ background: paymentMode === mode ? 'var(--gym-surface)' : 'transparent', color: paymentMode === mode ? 'var(--gym-text)' : 'var(--gym-muted)' }}
                onClick={() => { setPaymentMode(mode); setPayError(''); setPayMsg(''); }}>
                {label}
              </button>
            ))}
          </div>
          {paymentMode === 'cash' && (
            <div className="p-4 rounded-2xl text-sm" style={{ background: 'rgba(255,179,71,.08)', border: '1px solid rgba(255,179,71,.2)', color: 'var(--gym-warning)' }}>
              Submit the request here and pay the admin with cash at the counter.
            </div>
          )}

          {/* Card preview + card fields — only shown for card payment */}
          {paymentMode === 'card' && (
            <>
              <div className="p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)', border: '1px solid rgba(71,200,255,0.2)' }}>
                <div className="font-mono text-base tracking-[.2em] mb-1" style={{ color: 'rgba(255,255,255,.8)' }}>{payForm.cardNumber || '•••• •••• •••• ••••'}</div>
                <div className="flex gap-4 text-xs" style={{ color: 'rgba(255,255,255,.5)' }}><span>{payForm.cardHolder || 'CARDHOLDER'}</span><span>{payForm.expMonth || 'MM'}/{payForm.expYear || 'YY'}</span></div>
              </div>
              <FieldGroup label="Card Number *"><input className="gym-input font-mono tracking-widest" type="text" maxLength={19} placeholder="•••• •••• •••• ••••" value={payForm.cardNumber} onChange={(e) => { const r = e.target.value.replace(/\D/g,'').slice(0,16); setPayForm((f) => ({ ...f, cardNumber: r.match(/.{1,4}/g)?.join(' ') || r })); }} /></FieldGroup>
              <FieldGroup label="Cardholder Name *"><input className="gym-input" type="text" placeholder="Name on card" value={payForm.cardHolder} onChange={(e) => setPayForm((f) => ({ ...f, cardHolder: e.target.value }))} /></FieldGroup>
              <FieldGroup label="Bank Name"><input className="gym-input" type="text" placeholder="e.g. Commercial Bank" value={payForm.bankName} onChange={(e) => setPayForm((f) => ({ ...f, bankName: e.target.value }))} /></FieldGroup>
              <div className="grid grid-cols-3 gap-3">
                <FieldGroup label="Month (MM)"><input className="gym-input font-mono" type="text" maxLength={2} placeholder="MM" value={payForm.expMonth} onChange={(e) => setPayForm((f) => ({ ...f, expMonth: e.target.value.replace(/\D/,'').slice(0,2) }))} /></FieldGroup>
                <FieldGroup label="Year (YY)"><input className="gym-input font-mono" type="text" maxLength={2} placeholder="YY" value={payForm.expYear} onChange={(e) => setPayForm((f) => ({ ...f, expYear: e.target.value.replace(/\D/,'').slice(0,2) }))} /></FieldGroup>
                <FieldGroup label="CVC *"><input className="gym-input font-mono" type="password" maxLength={4} placeholder="•••" value={payForm.cvc} onChange={(e) => setPayForm((f) => ({ ...f, cvc: e.target.value.replace(/\D/,'').slice(0,4) }))} /></FieldGroup>
              </div>
            </>
          )}

          {/* Subscription + Amount — shown for both modes */}
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Subscription">
              <select className="gym-input" value={payForm.subscriptionId} onChange={(e) => {
                const selSub = mySubscriptions.find((s) => String(s.subscriptionId) === e.target.value);
                const price  = selSub ? (resolvePlanPrice(selSub) || selSub.price || '') : '';
                setPayForm((f) => ({ ...f, subscriptionId: e.target.value, amount: price }));
              }}>
                <option value="">Select subscription…</option>
                {mySubscriptions.map((s) => (
                  <option key={s.subscriptionId} value={s.subscriptionId}>
                    {resolvePlanName(s)} — {formatCurrency(resolvePlanPrice(s) || 0)}
                  </option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup label="Amount (LKR)"><input className="gym-input" type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></FieldGroup>
          </div>

          {/* Email — only for card mode */}
          {paymentMode === 'card' && (
            <FieldGroup label="Email for Receipt"><input className="gym-input" type="email" value={payForm.customerEmail} onChange={(e) => setPayForm((f) => ({ ...f, customerEmail: e.target.value }))} /></FieldGroup>
          )}

          {/* Cash payment request button */}
          {paymentMode === 'cash' && (
            <>
              <button className="btn btn-primary w-full justify-center" onClick={handleCashPaymentRequest}>
                💵 Request Cash Payment
              </button>

              {/* Show existing cash requests status */}
              {cashRequests.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gym-muted)' }}>Your Cash Requests</div>
                  {cashRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--gym-text)' }}>{req.planLabel || `Sub #${req.subscriptionId}`}</div>
                        <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>LKR {req.amount}</div>
                      </div>
                      <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{
                        background: req.status === 'approved' || req.status === 'completed' ? 'rgba(71,255,154,.12)' :
                                    req.status === 'rejected' ? 'rgba(255,71,71,.12)' : 'rgba(255,179,71,.12)',
                        color: req.status === 'approved' || req.status === 'completed' ? 'var(--gym-success)' :
                               req.status === 'rejected' ? 'var(--gym-accent2)' : 'var(--gym-warning)',
                        border: `1px solid ${req.status === 'approved' || req.status === 'completed' ? 'rgba(71,255,154,.25)' :
                                              req.status === 'rejected' ? 'rgba(255,71,71,.25)' : 'rgba(255,179,71,.25)'}`,
                      }}>
                        {req.status === 'approved' || req.status === 'completed' ? '✅ Approved' :
                         req.status === 'rejected' ? '❌ Rejected' : '⏳ Waiting for Admin'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {payError && <div className="px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,71,71,.08)', color: 'var(--gym-accent2)' }}>⚠ {payError}</div>}
          {payMsg   && <div className="px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(71,255,154,.08)', color: 'var(--gym-success)' }}>✅ {payMsg}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowPayment(false)}>Cancel</button>
          {paymentMode === 'card' && (
            <button className="btn btn-primary" onClick={handleCardPayment} disabled={payLoading}>{payLoading ? 'Processing…' : '💳 Initiate Payment'}</button>
          )}
        </div>
      </Modal>

      {/* ── Request Session Modal ─────────────────────────── */}
      <Modal isOpen={showReqSched} onClose={closeReqSchedModal} title="REQUEST A SESSION" maxWidth={440}>
        <div className="modal-body space-y-4">
          <FieldGroup label="Trainer *">
            <select className="gym-input" value={schedForm.p_trainer_id} onChange={(e) => setSchedForm((f) => ({ ...f, p_trainer_id: e.target.value }))}>
              <option value="">Select trainer…</option>
              {(myTrainers.length > 0 ? myTrainers : trainers.filter((t) => (t.status || 'active') === 'active')).map((t) => (
                <option key={t.trainerId} value={t.trainerId}>{getTrainerLabel(t)}</option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup label="Time Slot *">
            <select className="gym-input" value={schedForm.p_timeslot_id} onChange={(e) => setSchedForm((f) => ({ ...f, p_timeslot_id: e.target.value }))}>
              <option value="">Select slot…</option>
              {timeslots.map((ts) => <option key={ts.timeslot_Id} value={ts.timeslot_Id}>{ts.starttime} – {ts.endtime}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Date *">
            <input className="gym-input" type="date" value={schedForm.p_schedule_date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setSchedForm((f) => ({ ...f, p_schedule_date: e.target.value }))} />
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={closeReqSchedModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRequestSchedule} disabled={schedSaving}>{schedSaving ? 'Requesting…' : 'Request Session'}</button>
        </div>
      </Modal>

    </div>
  );
}