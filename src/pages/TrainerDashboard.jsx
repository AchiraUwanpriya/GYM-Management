// ============================================================
//  TrainerDashboard.jsx  (+PAR-Q member health tab)
// ============================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchSchedules, fetchSchedulesByTrainer, updateScheduleStatus,
} from '../actions/schedulesAction';
import { fetchAssignments, addAssignment } from '../actions/trainerAssignmnetAction';
import { fetchTimeslots } from '../actions/timeslotsAction';
import { fetchMembers } from '../actions/memberAction';
import { fetchWorkouts, addWorkout } from '../actions/nonEquipmentExerciseAction';
import { fetchAttendance, fetchMemberAttendance } from '../actions/attendanceAction';
import { fetchTrainerTimeslots } from '../actions/trainerTimeSlotAction';
import { fetchTrainers } from '../actions/trainerAction';
import { showToast } from '../actions/uiAction';
import { fetchExercises } from '../actions/exercisesAction';
import { fetchTrainerMembersParQ } from '../actions/parqAction';
import { formatDate, getImgUrl, getProfileImg } from '../utils';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { getTrainerRequests, subscribeWorkflowStore, updateTrainerRequest } from '../utils/workflowStore';
import { ROLES } from '../../index';
import * as api from '../services/api';

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

function CalIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function DumbIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/></svg>; }
function ClockIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>; }
function GearIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function UsersIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function WarnIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function CheckIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }
function AttIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>; }
function HeartIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>; }

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

// ── PAR-Q question labels ─────────────────────────────────────
const PARQ_QS = [
  { key: 'q1_heart_condition',     short: 'Heart condition' },
  { key: 'q2_chest_pain_activity', short: 'Chest pain (activity)' },
  { key: 'q3_chest_pain_rest',     short: 'Chest pain (rest)' },
  { key: 'q4_dizziness',           short: 'Dizziness' },
  { key: 'q5_bone_joint',          short: 'Bone/joint problem' },
  { key: 'q6_bp_medication',       short: 'BP medication' },
  { key: 'q7_other_reason',        short: 'Other reason' },
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
  return (
    <Modal isOpen onClose={onClose} title={`⚕️ PAR-Q — ${record.firstName} ${record.lastName}`} maxWidth={480}>
      <div className="modal-body space-y-3">
        {!hasRiskFlag(record) ? (
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(71,255,154,.08)', border: '1px solid rgba(71,255,154,.25)', color: 'var(--gym-success)' }}>
            ✅ No health flags — cleared for normal training.
          </div>
        ) : (
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,71,71,.08)', border: '1px solid rgba(255,71,71,.25)', color: 'var(--gym-accent2)' }}>
            ⚠️ <strong>Health flags present.</strong> {isTrue(record.physician_clearance) ? 'Physician clearance confirmed.' : 'No physician clearance — consult before intense training.'}
          </div>
        )}

        <div className="space-y-2">
          {PARQ_QS.map((q) => (
            <div key={q.key} className="flex items-center justify-between p-2.5 rounded-xl"
              style={{ background: 'var(--gym-surface2)', border: isTrue(record[q.key]) ? '1px solid rgba(255,71,71,.2)' : '1px solid var(--gym-border)' }}>
              <span className="text-xs" style={{ color: 'var(--gym-text2)' }}>{q.short}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                style={{ background: isTrue(record[q.key]) ? 'rgba(255,71,71,.12)' : 'rgba(71,255,154,.1)', color: isTrue(record[q.key]) ? 'var(--gym-accent2)' : 'var(--gym-success)' }}>
                {isTrue(record[q.key]) ? 'YES ⚠' : 'NO ✓'}
              </span>
            </div>
          ))}

          {record.q7_other_details && (
            <div className="p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--gym-muted)' }}>Other details:</div>
              <div className="text-sm" style={{ color: 'var(--gym-text)' }}>{record.q7_other_details}</div>
            </div>
          )}

          <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
            <span className="text-xs" style={{ color: 'var(--gym-text2)' }}>Physician clearance</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
              style={{ background: isTrue(record.physician_clearance) ? 'rgba(71,255,154,.1)' : 'rgba(255,179,71,.1)', color: isTrue(record.physician_clearance) ? 'var(--gym-success)' : 'var(--gym-warning)' }}>
              {isTrue(record.physician_clearance) ? 'YES ✓' : 'NO'}
            </span>
          </div>
        </div>

        <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>
          Updated: {record.updated_date?.substring(0, 10) || '—'}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

export default function TrainerDashboard() {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const user        = useSelector((s) => s.auth.user);
  const schedules   = useSelector((s) => s.schedules?.data || []);
  const assignments = useSelector((s) => s.assignments?.data || []);
  const trainerTS   = useSelector((s) => s.trainerTimeslots?.data || []);
  const members     = useSelector((s) => s.members?.data || []);
  const allAttendance = useSelector((s) => s.allAttendance?.data || s.attendance?.data || []);
  const memberParQs   = useSelector((s) => s.parq?.members || []);
  const exercises     = useSelector((s) => s.exercises?.data || []);

  const [mainTab,          setMainTab]          = useState('sessions');
  const [activeTab,        setActiveTab]        = useState('pending');
  const [showCancel,       setShowCancel]       = useState(false);
  const [cancelTarget,     setCancelTarget]     = useState(null);
  const [cancelReason,     setCancelReason]     = useState('');
  const [cancelling,       setCancelling]       = useState(false);
  const [showAddEx,        setShowAddEx]        = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showProfile,      setShowProfile]      = useState(false);
  const [editMode,         setEditMode]         = useState(false);
  const [editForm,         setEditForm]         = useState({});
  const [editSaving,       setEditSaving]       = useState(false);
  const [editError,        setEditError]        = useState('');
  const [exForm,           setExForm]           = useState({ exercise: '', exercise_id: '', sets: '', weights: '', rest_seconds: '', description: '' });
  const [saving,           setSaving]           = useState(false);
  const [exerciseList,     setExerciseList]     = useState([]);
  const [attSearch,        setAttSearch]        = useState('');
  const [attDateFilter,    setAttDateFilter]    = useState('');
  const [selectedParQ,     setSelectedParQ]     = useState(null);
  const [parqFilter,       setParqFilter]       = useState('all');
  const [parqSearch,       setParqSearch]       = useState('');
  const [trainerRequests,  setTrainerRequests]  = useState([]);
  const [attActionLoading, setAttActionLoading] = useState(false);
  const [attActionMsg,     setAttActionMsg]     = useState('');
  const [attActionError,   setAttActionError]   = useState('');
  const [trainerAttendance, setTrainerAttendance] = useState([]);

  const trainers = useSelector((s) => s.trainers?.data || []);

  const trainerObj = trainers.find(t => String(t.userId) === String(user?.userId));
  const myTrainerId = trainerObj?.trainerId || user?.userId;

  useEffect(() => {
    if (user?.userId) {
      // FIX: this was never dispatched here, so s.trainers.data stayed []
      // unless some other page had already populated it. That left
      // trainerObj lookup below unresolved, myTrainerId silently fell back
      // to user.userId (a User_Id, not a Trainer_Id), and every filter that
      // depends on myTrainerId (timeslots, attendance, schedules) matched
      // nothing.
      dispatch(fetchTrainers());

      if (String(user?.roleId) === String(ROLES.TRAINER)) {
        const trainer = trainers?.find(t => String(t.userId) === String(user.userId));
        if (trainer) {
          dispatch(fetchSchedulesByTrainer(trainer.trainerId));
        }
      } else {
        dispatch(fetchSchedules());
      }
      dispatch(fetchAssignments());
      dispatch(fetchTimeslots());
      dispatch(fetchMembers());
      dispatch(fetchAttendance());
      dispatch(fetchExercises());
    }
  }, [dispatch, user?.userId, trainers.length]);

  // FIX: Fetch trainer-specific timeslots once we know the real trainer PK.
  // The main useEffect above fires before trainers load, so myTrainerId
  // isn't known yet. This separate effect fires again once myTrainerId
  // settles to the correct Trainer table PK.
  useEffect(() => {
    if (myTrainerId) {
      dispatch(fetchTrainerTimeslots(myTrainerId));
    }
  }, [dispatch, myTrainerId]);

  useEffect(() => {
    if (!user?.userId) return undefined;

    const syncTrainerRequests = () => {
      const trainer = trainers.find(t => String(t.userId) === String(user.userId));
      const tid = trainer?.trainerId || user.userId;

      setTrainerRequests(
        getTrainerRequests().filter((request) =>
          String(request.trainerId) === String(tid) ||
          String(request.trainerUserId) === String(user.userId)
        )
      );
    };

    syncTrainerRequests();
    return subscribeWorkflowStore(syncTrainerRequests);
  }, [user?.userId, trainers.length]);


  useEffect(() => {
    // FIX: fetchTrainerMembersParQ → GetParQByTrainerId needs the Trainer
    // table PK, not the User table PK. Passing user.userId here was the
    // same bug as the time-slot/attendance fallback — it happened to be
    // called before trainerObj even resolved, so it always sent the wrong
    // id. Now fires once myTrainerId is the real trainer_Id.
    if (myTrainerId) {
      dispatch(fetchTrainerMembersParQ(myTrainerId));
    }
  }, [dispatch, myTrainerId]);

  useEffect(() => {
    if (!myTrainerId || myTrainerId === user?.userId) {
      // myTrainerId hasn't resolved to the real Trainer PK yet — wait.
      // (falls back to userId while trainers are still loading)
      setTrainerAttendance([]);
      return;
    }

    let cancelled = false;
    const loadTrainerAttendance = async () => {
      try {
        const res = await api.getTrainerAttendanceByTrainer(myTrainerId);
        if (!cancelled) {
          setTrainerAttendance(res?.data?.ResultSet || []);
        }
      } catch {
        if (!cancelled) {
          setTrainerAttendance([]);
        }
      }
    };

    loadTrainerAttendance();
    return () => { cancelled = true; };
  }, [myTrainerId, user?.userId]);

  const myAssignments     = assignments.filter((a) =>
    String(a.trainer_Id || a.trainerId) === String(myTrainerId)
  );
  const pendingSessions   = schedules.filter((s) => s.status === 'Pending');
  const scheduledSessions = schedules.filter((s) => s.status === 'Scheduled');
  const cancelledSessions = schedules.filter((s) => s.status === 'Cancelled');

  const myTimeslots = trainerTS.filter((ts) =>
    String(ts.trainer_Id || ts.trainerId) === String(myTrainerId)
  );

  const myMemberIds = myAssignments.map((a) => String(a.memberId || a.member_Id));
  const myMemberAttendance = allAttendance.filter((a) => myMemberIds.includes(String(a.memberId)));

  let filteredAtt = myMemberAttendance;
  if (attSearch) filteredAtt = filteredAtt.filter((a) => {
    const m = members.find((m) => String(m.memberId) === String(a.memberId));
    const name = m ? `${m.firstName} ${m.lastName}` : '';
    return name.toLowerCase().includes(attSearch.toLowerCase()) || String(a.memberId).includes(attSearch);
  });
  if (attDateFilter) filteredAtt = filteredAtt.filter((a) => a.check_in_time?.startsWith(attDateFilter));

  const getMemberName = (id) => {
    const m = members.find((m) => String(m.memberId) === String(id));
    return m ? `${m.firstName} ${m.lastName}` : `Member #${id}`;
  };

  const memberParQsWithNames = memberParQs.map(r => {
    const m = members.find(m => String(m.memberId) === String(r.userId) || String(m.userId) === String(r.userId)) || {};
    return { ...r, firstName: m.firstName || r.firstName || 'Unknown', lastName: m.lastName || r.lastName || '' };
  });

  const flaggedParQ   = memberParQsWithNames.filter(hasRiskFlag);
  let filteredParQ  = parqFilter === 'flagged' ? memberParQsWithNames.filter(hasRiskFlag)
                      : parqFilter === 'clear'   ? memberParQsWithNames.filter((r) => !hasRiskFlag(r))
                      : memberParQsWithNames;
  if (parqSearch) {
    const term = parqSearch.toLowerCase();
    filteredParQ = filteredParQ.filter((r) => `${r.firstName} ${r.lastName}`.toLowerCase().includes(term));
  }
  const pendingTrainerRequests = trainerRequests.filter((request) => request.status === 'pending');

  const handleApprove = (s) => dispatch(updateScheduleStatus(s.scheduleId, 'Scheduled'));
  const openCancelModal = (s) => { setCancelTarget(s); setCancelReason(''); setShowCancel(true); };
  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    await dispatch(updateScheduleStatus(cancelTarget.scheduleId, 'Cancelled', cancelReason));
    setCancelling(false);
    setShowCancel(false);
  };
  const handleReject = (s) => dispatch(updateScheduleStatus(s.scheduleId, 'Cancelled', user.userId));
  const handleApproveTrainerRequest = async (request) => {
    const ok = await dispatch(addAssignment({
      p_trainer_id: user.trainerId || request.trainerId || user.userId,
      p_member_id: request.memberId,
      p_assignment_date: new Date().toISOString().substring(0, 10),
    }, user.userId));

    if (ok) {
      updateTrainerRequest(request.id, {
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewNote: 'Trainer approved the request.',
      });
      dispatch(showToast(`Assigned ${request.memberName} to your trainer list.`, 'success'));
    }
  };
  const handleRejectTrainerRequest = (request) => {
    updateTrainerRequest(request.id, {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewNote: 'Trainer rejected this request.',
    });
    dispatch(showToast(`Rejected request from ${request.memberName}.`, 'success'));
  };

  const handleTrainerAttendance = async (mode) => {
    // Use the real Trainer PK for check-in/out, not userId
    const trainerId = myTrainerId;
    if (!trainerId || trainerId === user?.userId) {
      setAttActionError('Trainer profile is still loading. Please try again in a moment.');
      setAttActionMsg('');
      return;
    }
    setAttActionLoading(true); setAttActionMsg(''); setAttActionError('');
    try {
      const res = mode === 'in' ? await api.trainerCheckIn(trainerId) : await api.trainerCheckOut(trainerId);
      if (res?.data?.StatusCode === 200) {
        setAttActionMsg(mode === 'in' ? 'Check-in recorded successfully.' : 'Check-out recorded successfully.');
        const latest = await api.getTrainerAttendanceByTrainer(trainerId);
        setTrainerAttendance(latest?.data?.ResultSet || []);
      } else {
        setAttActionError(res?.data?.Result || 'Attendance action failed.');
      }
    } catch {
      setAttActionError('Could not connect to the trainer attendance server.');
    }
    setAttActionLoading(false);
  };

  const openProfile = () => {
    setEditMode(false); setEditError('');
    setEditForm({
      p_user_id:     user.userId,
      p_admin_id:    user.userId,
      p_username:    user.username || '',
      p_email:       user.email    || '',
      p_phone:       user.phone    || '',
      p_password_hash: '',
    });
    setShowProfile(true);
  };

  const handleSaveProfile = async () => {
    if (editForm.p_phone && editForm.p_phone.length !== 10) {
      setEditError('Phone must be exactly 10 digits.'); return;
    }
    setEditSaving(true); setEditError('');
    try {
      const res = await api.editUser(editForm, user.userId);
      if (res.data?.StatusCode === 200) {
        setEditMode(false);
        dispatch(showToast('Profile updated. Please log in again to see changes.', 'success'));
      } else { setEditError(res.data?.Result || 'Update failed.'); }
    } catch { setEditError('Could not connect.'); }
    setEditSaving(false);
  };

  const statusVariant = (s) => s === 'Scheduled' ? 'confirmed' : s === 'Cancelled' ? 'inactive' : 'pending';
  const tabSessions = mainTab === 'sessions' ? (activeTab === 'pending' ? pendingSessions : activeTab === 'scheduled' ? scheduledSessions : cancelledSessions) : [];

  const addToExList = () => {
    if (!exForm.exercise_id) return;
    setExerciseList((lst) => [...lst, { ...exForm, id: Date.now() }]);
    setExForm({ exercise: '', exercise_id: '', sets: '', weights: '', rest_seconds: '', description: '' });
  };
  const handleAddExercise = async () => {
    const toSave = exerciseList.length > 0 ? exerciseList : (exForm.exercise_id ? [{ ...exForm }] : []);
    if (toSave.length === 0) return;
    setSaving(true);
    for (const ex of toSave) {
      await dispatch(addWorkout({ p_schedule_id: selectedSchedule.scheduleId, p_exercise_id: ex.exercise_id, p_sets: ex.sets, p_reps: ex.rest_seconds, p_sub_status: 'pending' }, user.userId));
    }
    setSaving(false);
    setExerciseList([]);
    setExForm({ exercise: '', exercise_id: '', sets: '', weights: '', rest_seconds: '', description: '' });
    setShowAddEx(false);
  };


  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-3xl sm:text-4xl tracking-widest leading-none" style={{ fontFamily: "'Bebas Neue', cursive", color: 'var(--gym-text)' }}>
            Trainer Portal — <span style={{ color: 'var(--gym-accent3)' }}>{user?.username}</span>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>DTS Gym Management · {user?.email || user?.phone}</div>
        </div>
        <button onClick={openProfile} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'var(--gym-surface)', border: '1px solid var(--gym-border)', color: 'var(--gym-text)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold overflow-hidden"
            style={{ background: 'rgba(71,200,255,0.15)', color: 'var(--gym-accent3)', border: '1.5px solid rgba(71,200,255,0.3)', fontFamily: "'Space Mono', monospace" }}>
            {getProfileImg(user) ? (
              <img src={getImgUrl(getProfileImg(user))} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              (user?.username || 'T').charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-semibold">{user?.username}</div>
            <div className="text-xs" style={{ color: 'var(--gym-accent3)' }}>Trainer · View Profile</div>
          </div>
          <span style={{ color: 'var(--gym-muted)' }}>→</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MiniStat label="My Members"    value={myAssignments.length}      sub="Assigned to you"   color="var(--gym-accent)"  icon={<UsersIcon />} />
        <MiniStat label="Pending"       value={pendingSessions.length}    sub="Awaiting decision" color="var(--gym-warning)" icon={<WarnIcon />} />
        <MiniStat label="Scheduled"     value={scheduledSessions.length}  sub="Approved sessions" color="var(--gym-success)" icon={<CheckIcon />} />
        <MiniStat label="Health Flags"  value={flaggedParQ.length}        sub={`of ${memberParQs.length} submitted`} color={flaggedParQ.length > 0 ? 'var(--gym-accent2)' : 'var(--gym-success)'} icon={<HeartIcon />} />
      </div>

      <div className="gym-card" style={{ border: '1px solid rgba(71,200,255,.2)', background: 'rgba(71,200,255,.03)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="gym-card-title mb-0">My Attendance</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>
              Mark your own trainer check-in/check-out.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-success"
              onClick={() => handleTrainerAttendance('in')}
              disabled={attActionLoading}
            >
              {attActionLoading ? '...' : 'Check In'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleTrainerAttendance('out')}
              disabled={attActionLoading}
            >
              {attActionLoading ? '...' : 'Check Out'}
            </button>
          </div>
        </div>
        {attActionMsg && (
          <div className="mt-3 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(71,255,154,.08)', border: '1px solid rgba(71,255,154,.25)', color: 'var(--gym-success)' }}>
            {attActionMsg}
          </div>
        )}
        {attActionError && (
          <div className="mt-3 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,71,71,.08)', border: '1px solid rgba(255,71,71,.22)', color: 'var(--gym-accent2)' }}>
            {attActionError}
          </div>
        )}
        <div className="mt-4 space-y-2">
          {trainerAttendance.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--gym-muted)' }}>No attendance records found</div>
          ) : (
            trainerAttendance.slice(0, 3).map((record) => (
              record && (
                <div key={record.trainerAttendanceId || `${record.checkInTime}-${record.checkOutTime}`} className="p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                  <div className="text-sm font-medium" style={{ color: 'var(--gym-text)' }}>{record.trainerName || user?.username || 'Trainer attendance'}</div>
                  <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>
                    In: {record.checkInTime ? formatDate(record.checkInTime) : '—'}{record.checkOutTime ? ` · Out: ${formatDate(record.checkOutTime)}` : ''}
                  </div>
                </div>
              )
            ))
          )}
        </div>
      </div>

      {/* Main Tabs — now 4 tabs */}
      <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ background: 'var(--gym-surface2)', width: 'fit-content' }}>
        {[
          { id: 'sessions',   label: '📅 Sessions' },
          { id: 'attendance', label: '✅ Attendance' },
          { id: 'timeslots',  label: '🕐 Time Slots' },
          { id: 'parq',       label: flaggedParQ.length > 0 ? `⚕️ Health (${flaggedParQ.length} ⚠)` : '⚕️ Health' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setMainTab(id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: mainTab === id ? 'var(--gym-surface)' : 'transparent',
              color: mainTab === id ? (id === 'parq' && flaggedParQ.length > 0 ? 'var(--gym-accent2)' : 'var(--gym-text)') : 'var(--gym-muted)',
              border: 'none',
              boxShadow: mainTab === id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
            }}>{label}</button>
        ))}
      </div>

      {/* ── Sessions Tab ── */}
      {mainTab === 'sessions' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="gym-card">
            <div className="flex items-center justify-between mb-4">
              <div className="gym-card-title mb-0">Session Requests</div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/schedules')}>All →</button>
            </div>
            <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
              {[['pending', `Pending (${pendingSessions.length})`], ['scheduled', `Approved (${scheduledSessions.length})`], ['cancelled', `Rejected (${cancelledSessions.length})`]].map(([key, lbl]) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ background: activeTab === key ? 'var(--gym-surface)' : 'transparent', color: activeTab === key ? 'var(--gym-text)' : 'var(--gym-muted)', border: 'none', boxShadow: activeTab === key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none' }}>
                  {lbl}
                </button>
              ))}
            </div>
            {tabSessions.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No {activeTab} sessions</div>
            ) : (
              <div className="space-y-3">
                {tabSessions.slice(0, 5).map((s) => {
                  // PAR-Q flag for this member
                  const mParQ = memberParQs.find((p) => {
                    const m = members.find((mm) => String(mm.memberId) === String(s.memberId));
                    return m && String(p.userId) === String(m.userId);
                  });
                  return (
                    <div key={s.scheduleId} className="p-3 rounded-xl"
                      style={{ background: 'var(--gym-surface2)', border: hasRiskFlag(mParQ) ? '1px solid rgba(255,71,71,.15)' : '1px solid var(--gym-border)' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>{s.session_name || `Session #${s.scheduleId}`}</div>
                            {hasRiskFlag(mParQ) && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,71,71,.1)', color: 'var(--gym-accent2)' }}>⚠️ Health Flag</span>
                            )}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>{getMemberName(s.memberId)} · {formatDate(s.scheduleDate)}</div>
                        </div>
                        <Badge variant={statusVariant(s.status)}>{s.status || 'Pending'}</Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {s.status === 'Pending' && (
                          <><button className="btn btn-success btn-sm" onClick={() => handleApprove(s)}>✓ Approve</button><button className="btn btn-danger btn-sm" onClick={() => handleReject(s)}>✗ Reject</button></>
                        )}
                        {s.status === 'Scheduled' && (
                          <div className="flex gap-2">
                            <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedSchedule(s); setShowAddEx(true); }}>+ Add Exercise</button>
                            <button className="btn btn-danger btn-sm" onClick={() => openCancelModal(s)}>Cancel</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="gym-card">
              <div className="flex items-center justify-between mb-4">
                <div className="gym-card-title mb-0">Member Trainer Requests</div>
                <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--gym-surface2)', color: 'var(--gym-muted)' }}>
                  {pendingTrainerRequests.length} pending
                </span>
              </div>
              {pendingTrainerRequests.length === 0 ? (
                <div className="py-4 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>
                  No direct trainer requests right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTrainerRequests.slice(0, 4).map((request) => (
                    <div key={request.id} className="p-3 rounded-xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>{request.memberName}</div>
                          <div className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>{request.memberEmail || request.memberPhone || 'Member contact not provided'}</div>
                        </div>
                        <Badge variant="pending">Pending</Badge>
                      </div>
                      <div className="text-xs mb-3" style={{ color: 'var(--gym-muted)' }}>
                        Requested on {formatDate(request.requestedAt)}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button className="btn btn-success btn-sm" onClick={() => handleApproveTrainerRequest(request)}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRejectTrainerRequest(request)}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="gym-card">
              <div className="gym-card-title">Quick Actions</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <ClockIcon />, label: 'My Time Slots',  route: '/timeslots', color: 'var(--gym-accent)' },
                  { icon: <DumbIcon />, label: 'Workout Plans',   route: '/workouts',  color: 'var(--gym-success)' },
                  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V3a2.5 2.5 0 0 1 2.5-2.5H20v16.5H6.5a2.5 2.5 0 0 0-2.5 2.5z"/></svg>, label: 'Exercise Catalog', route: '/workouts?tab=exercises', color: 'var(--gym-accent3)' },
                  { icon: <GearIcon />, label: 'Live Floor',      route: '/equipment', color: 'var(--gym-warning)' },
                ].map(({ icon, label, route, color }) => (
                  <button key={route} onClick={() => navigate(route)}
                    className="flex items-center gap-2 p-3 rounded-xl w-full text-left"
                    style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '18', color }}>{icon}</span>
                    <span className="text-xs sm:text-sm font-medium flex-1 leading-tight" style={{ color: 'var(--gym-text2)' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="gym-card">
              <div className="gym-card-title">🗓️ My Schedule</div>
              {scheduledSessions.length === 0 ? (
                <div className="py-4 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No confirmed sessions yet</div>
              ) : (
                <div className="space-y-2">
                  {scheduledSessions.slice(0,5).map((s) => (
                    <div key={s.scheduleId} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--gym-text)' }}>{getMemberName(s.memberId)}</div>
                        <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{s.scheduleDate?.substring(0,10)}</div>
                      </div>
                      <Badge variant="confirmed">Scheduled</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {mainTab === 'attendance' && (
        <div className="gym-card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="gym-card-title mb-0">✅ My Members — Attendance</div>
            <div className="flex gap-2 flex-wrap">
              <input className="gym-input w-44 text-sm" placeholder="Search member…" value={attSearch} onChange={(e) => setAttSearch(e.target.value)} />
              <input className="gym-input w-36 text-sm" type="date" value={attDateFilter} onChange={(e) => setAttDateFilter(e.target.value)} />
              {attDateFilter && <button className="btn btn-secondary btn-sm" onClick={() => setAttDateFilter('')}>Clear</button>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {(() => {
              const today   = new Date().toISOString().split('T')[0];
              const todayAtt = myMemberAttendance.filter((a) => a.check_in_time?.startsWith(today));
              const inside   = todayAtt.filter((a) => !a.check_out_time);
              const left     = todayAtt.filter((a) =>  a.check_out_time);
              return [
                { label: 'Today Check-ins',  val: todayAtt.length,            color: 'var(--gym-success)' },
                { label: 'Currently Inside', val: inside.length,              color: 'var(--gym-accent3)' },
                { label: 'Already Left',     val: left.length,                color: 'var(--gym-muted)' },
                { label: 'Total Records',    val: myMemberAttendance.length,  color: 'var(--gym-accent)' },
              ].map(({ label, val, color }) => (
                <div key={label} className="p-3 rounded-xl text-center" style={{ background: 'var(--gym-surface2)', border: `1px solid ${color}22` }}>
                  <div className="text-xl font-bold" style={{ color, fontFamily: "'Space Mono', monospace" }}>{val}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>{label}</div>
                </div>
              ));
            })()}
          </div>

          {filteredAtt.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No attendance records found</div>
          ) : (
            <div className="space-y-2">
              {filteredAtt.slice(0, 30).map((a) => (
                <div key={a.attendanceId} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.check_out_time ? 'var(--gym-muted)' : 'var(--gym-success)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--gym-text)' }}>{getMemberName(a.memberId)}</div>
                    <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>
                      In: {a.check_in_time?.substring(0,19) || '—'}{a.check_out_time && ` · Out: ${a.check_out_time.substring(0,19)}`}
                    </div>
                  </div>
                  <Badge variant={a.check_out_time ? 'inactive' : 'active'}>{a.check_out_time ? 'Left' : '🟢 Inside'}</Badge>
                </div>
              ))}
              {filteredAtt.length > 30 && (
                <div className="text-center text-xs pt-2" style={{ color: 'var(--gym-muted)' }}>Showing first 30 of {filteredAtt.length} records</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── My Time Slots Tab ── */}
      {mainTab === 'timeslots' && (
        <div className="gym-card">
          <div className="flex items-center justify-between mb-4">
            <div className="gym-card-title mb-0">🕐 My Time Slots</div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/timeslots')}>+ Request Slot</button>
          </div>
          {myTimeslots.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>
              No time slots assigned yet.{' '}
              <button className="underline" style={{ color: 'var(--gym-accent)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/timeslots')}>Request one</button>
            </div>
          ) : (
            <div className="space-y-2">
              {myTimeslots.map((t) => (
                <div key={t.trainerTimeslot_Id} className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(71,200,255,0.1)', color: 'var(--gym-accent3)' }}><ClockIcon /></span>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>
                        {t.starttime || t.custom_starttime || 'Unknown'} – {t.endtime || t.custom_endtime || 'Unknown'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{t.day_of_week || t.selected_days || 'Daily'}</div>
                    </div>
                  </div>
                  <Badge variant={t.isActive ? 'active' : 'pending'}>{t.isActive ? 'Approved' : 'Pending'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PAR-Q Health Tab ── */}
      {mainTab === 'parq' && (
        <div className="gym-card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: flaggedParQ.length > 0 ? 'rgba(255,71,71,.1)' : 'rgba(71,255,154,.1)', color: flaggedParQ.length > 0 ? 'var(--gym-accent2)' : 'var(--gym-success)' }}>
                <HeartIcon />
              </div>
              <div>
                <div className="gym-card-title mb-0">⚕️ Members' Health Questionnaires</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>
                  {memberParQs.length} submitted · <span style={{ color: flaggedParQ.length > 0 ? 'var(--gym-accent2)' : 'var(--gym-success)' }}>{flaggedParQ.length} flagged</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <input className="gym-input w-48 text-sm" placeholder="Search member by name..." value={parqSearch} onChange={(e) => setParqSearch(e.target.value)} />
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                {[['all', `All (${memberParQs.length})`], ['flagged', `⚠ (${flaggedParQ.length})`], ['clear', `✓ (${memberParQs.length - flaggedParQ.length})`]].map(([key, lbl]) => (
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

          {memberParQs.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>
              None of your assigned members have submitted a PAR-Q yet.
            </div>
          ) : filteredParQ.length === 0 ? (
            <div className="py-6 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>
              No {parqFilter === 'flagged' ? 'flagged' : 'clear'} records.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredParQ.map((r) => (
                <div key={r.parqId}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--gym-surface2)', border: hasRiskFlag(r) ? '1px solid rgba(255,71,71,.2)' : '1px solid var(--gym-border)' }}
                  onClick={() => setSelectedParQ(r)}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: hasRiskFlag(r) ? 'rgba(255,71,71,.12)' : 'rgba(71,255,154,.1)', color: hasRiskFlag(r) ? 'var(--gym-accent2)' : 'var(--gym-success)', fontFamily: "'Space Mono', monospace" }}>
                    {(r.firstName || 'M').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>{r.firstName} {r.lastName}</div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {hasRiskFlag(r) ? (
                        PARQ_QS.filter((q) => isTrue(r[q.key])).map((q) => (
                          <span key={q.key} className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255,71,71,.1)', color: 'var(--gym-accent2)' }}>{q.short}</span>
                        ))
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>No health flags reported.</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isTrue(r.physician_clearance) && (
                      <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(71,255,154,.1)', color: 'var(--gym-success)' }}>MD ✓</span>
                    )}
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                      style={{ background: hasRiskFlag(r) ? 'rgba(255,71,71,.12)' : 'rgba(71,255,154,.1)', color: hasRiskFlag(r) ? 'var(--gym-accent2)' : 'var(--gym-success)' }}>
                      {hasRiskFlag(r) ? '⚠️ FLAG' : '✓ CLEAR'}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Members section (sessions tab) */}
      {myAssignments.length > 0 && mainTab === 'sessions' && (
        <div className="gym-card">
          <div className="gym-card-title">My Members</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {myAssignments.slice(0, 8).map((a) => {
              const m = members.find((m) => String(m.memberId) === String(a.memberId));
              const today   = new Date().toISOString().split('T')[0];
              const present = allAttendance.some((att) =>
                String(att.memberId) === String(a.memberId) && att.check_in_time?.startsWith(today)
              );
              const mParQ = m ? memberParQs.find((p) => String(p.userId) === String(m.userId)) : null;
              return (
                <div key={a.assignmentId} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--gym-surface2)', border: hasRiskFlag(mParQ) ? '1px solid rgba(255,71,71,.15)' : '1px solid var(--gym-border)' }}>
                  <div className="relative w-9 h-9 flex-shrink-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
                      style={{ background: 'rgba(71,255,154,0.15)', color: 'var(--gym-success)', border: '1.5px solid rgba(71,255,154,0.3)', fontFamily: "'Space Mono', monospace" }}>
                      {(m?.firstName || 'M').charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                      style={{ background: present ? 'var(--gym-success)' : 'var(--gym-muted)', borderColor: 'var(--gym-surface2)' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--gym-text)' }}>
                      {m ? `${m.firstName} ${m.lastName}` : `Member #${a.memberId}`}
                    </div>
                    <div className="text-xs flex items-center gap-1" style={{ color: present ? 'var(--gym-success)' : 'var(--gym-muted)' }}>
                      {present ? '🟢 In Gym' : 'Absent today'}
                      {hasRiskFlag(mParQ) && <span style={{ color: 'var(--gym-accent2)' }}> · ⚠️</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cancel Modal ── */}
      <Modal isOpen={showCancel} onClose={() => setShowCancel(false)} title="CANCEL SESSION" maxWidth={420}>
        <div className="modal-body space-y-4">
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,71,71,.08)', border: '1px solid rgba(255,71,71,.2)', color: 'var(--gym-accent2)' }}>
            ⚠ You are cancelling Session #{cancelTarget?.scheduleId}. Please provide a reason.
          </div>
          <div><label className="gym-label">Cancellation Reason *</label>
            <textarea className="gym-input resize-none" rows={3} value={cancelReason}
              placeholder="e.g. Emergency — unable to attend, member has been notified."
              onChange={(e) => setCancelReason(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowCancel(false)}>Back</button>
          <button className="btn btn-danger" disabled={cancelling || !cancelReason.trim()} onClick={handleConfirmCancel}>
            {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
          </button>
        </div>
      </Modal>

      {/* ── Add Exercise Modal ── */}
      <Modal isOpen={showAddEx} onClose={() => setShowAddEx(false)} title="ADD EXERCISE FOR SESSION" maxWidth={480}>
        {selectedSchedule && (
          <div className="px-6 pt-3 pb-1">
            <div className="p-3 rounded-xl text-xs flex items-center gap-2" style={{ background: 'var(--gym-surface2)', color: 'var(--gym-muted)' }}>
              <DumbIcon />
              Session <strong style={{ color: 'var(--gym-text)' }}>#{selectedSchedule.scheduleId}</strong> · Member: <strong style={{ color: 'var(--gym-text)' }}>{getMemberName(selectedSchedule.memberId)}</strong>
            </div>
          </div>
        )}
        <div className="modal-body space-y-4">
          <FieldGroup label="Exercise Name *">
            <select
              className="gym-input"
              value={exForm.exercise_id}
              onChange={(e) => {
                const selected = exercises.find((ex) => String(ex.exerciseId) === e.target.value);
                setExForm(f => ({
                  ...f,
                  exercise_id: e.target.value,
                  exercise: selected ? (selected.ExerciseName || selected.exerciseName) : ''
                }));
              }}
            >
              <option value="">-- Select an Exercise --</option>
              {exercises.map((ex) => (
                <option key={ex.exerciseId} value={ex.exerciseId}>
                  {ex.ExerciseName || ex.exerciseName}
                </option>
              ))}
            </select>
          </FieldGroup>
          <div className="grid grid-cols-3 gap-3">
            <FieldGroup label="Sets"><input className="gym-input" type="number" value={exForm.sets} onChange={(e) => setExForm(f => ({ ...f, sets: e.target.value }))} placeholder="3" /></FieldGroup>
            <FieldGroup label="Weight (kg)"><input className="gym-input" type="number" step="0.5" value={exForm.weights} onChange={(e) => setExForm(f => ({ ...f, weights: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Rest (secs)"><input className="gym-input" type="number" value={exForm.rest_seconds} onChange={(e) => setExForm(f => ({ ...f, rest_seconds: e.target.value }))} placeholder="60" /></FieldGroup>
          </div>
          <FieldGroup label="Instructions">
            <input className="gym-input" value={exForm.description} onChange={(e) => setExForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes..." />
          </FieldGroup>
        </div>
        {exerciseList.length > 0 && (
          <div className="px-6 pb-2">
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--gym-muted)' }}>Queued ({exerciseList.length}):</div>
            {exerciseList.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between text-xs p-2 rounded-lg mb-1" style={{ background: 'var(--gym-surface2)' }}>
                <span style={{ color: 'var(--gym-text)' }}>{ex.exercise}</span>
                <span style={{ color: 'var(--gym-muted)' }}>{ex.sets}×{ex.rest_seconds}s</span>
              </div>
            ))}
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAddEx(false)}>Close</button>
          <button className="btn btn-secondary" onClick={addToExList} disabled={!exForm.exercise_id}>+ Add to List</button>
          <button className="btn btn-primary" onClick={handleAddExercise} disabled={saving || (!exForm.exercise_id && exerciseList.length === 0)}>
            {saving ? 'Saving...' : `Save ${exerciseList.length > 0 ? exerciseList.length + ' Exercise(s)' : 'Exercise'}`}
          </button>
        </div>
      </Modal>

      {/* ── Profile Modal ── */}
      <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="MY TRAINER PROFILE" maxWidth={440}>
        {!editMode ? (
          <div className="modal-body space-y-3">
            <div className="flex flex-col items-center py-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold mb-3 overflow-hidden"
                style={{ background: 'rgba(71,200,255,0.15)', color: 'var(--gym-accent3)', border: '2px solid rgba(71,200,255,0.3)', fontFamily: "'Space Mono', monospace" }}>
                {getProfileImg(user) ? (
                  <img src={getImgUrl(getProfileImg(user))} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (user?.username || 'T').charAt(0).toUpperCase()
                )}
              </div>
              <div className="text-lg font-bold" style={{ color: 'var(--gym-text)' }}>{user?.username}</div>
              <Badge variant="info" className="mt-1">Trainer</Badge>
            </div>
            {[['Username', user?.username], ['Email', user?.email || '—'], ['Phone', user?.phone || '—'], ['Role', 'Trainer'], ['User ID', user?.userId]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                <div className="text-xs font-medium" style={{ color: 'var(--gym-muted)' }}>{k}</div>
                <div className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="modal-body space-y-4">
            <FieldGroup label="Username"><input className="gym-input" value={editForm.p_username} onChange={(e) => setEditForm((f) => ({ ...f, p_username: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Email"><input className="gym-input" type="email" value={editForm.p_email} onChange={(e) => setEditForm((f) => ({ ...f, p_email: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Phone (10 digits)"><input className="gym-input" type="tel" maxLength={10} value={editForm.p_phone} onChange={(e) => setEditForm((f) => ({ ...f, p_phone: e.target.value.replace(/\D/g,'').slice(0,10) }))} /></FieldGroup>
            
            <div className="p-3 rounded-xl space-y-2" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--gym-accent)' }}>READ-ONLY DETAILS</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span style={{color:'var(--gym-muted)'}}>Name:</span> {user?.firstName} {user?.lastName}</div>
                <div><span style={{color:'var(--gym-muted)'}}>Gender:</span> {user?.gender || '—'}</div>
                <div className="col-span-2"><span style={{color:'var(--gym-muted)'}}>Joined:</span> {formatDate(user?.created_date)}</div>
              </div>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: 'var(--gym-border)' }}>
              <FieldGroup label="Change Password">
                <input className="gym-input" type="password" value={editForm.p_password_hash} onChange={(e) => setEditForm((f) => ({ ...f, p_password_hash: e.target.value }))} placeholder="Leave blank to keep current password" />
              </FieldGroup>
            </div>
            
            {editError && <div className="text-xs p-2 rounded" style={{ background: 'rgba(255,71,71,0.1)', color: 'var(--gym-accent2)' }}>{editError}</div>}
          </div>
        )}
        <div className="modal-footer">
          {editMode ? (
            <>
              <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setShowProfile(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => setEditMode(true)}>✏️ Edit Profile</button>
            </>
          )}
        </div>
      </Modal>

      {/* PAR-Q Detail Modal */}
      {selectedParQ && <ParQDetailModal record={selectedParQ} onClose={() => setSelectedParQ(null)} />}
    </div>
  );
}