// ============================================================
//  Schedules.jsx
//  Endpoints: /Schedule/*
// ============================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { formatDate, formatDateTime } from '../utils';
import { ROLES } from '../../index';
import { fetchSchedules, fetchSchedulesByMember, fetchSchedulesByTrainer,
         addSchedule, editSchedule, updateScheduleStatus, deleteSchedule } from '../actions/schedulesAction';
import { fetchMembers } from '../actions/memberAction';
import { fetchTrainers } from '../actions/trainerAction';
import { fetchUsers } from '../actions/usersAction';
import { fetchTimeslots } from '../actions/timeslotsAction';
import { fetchExercises } from '../actions/exercisesAction';
import { addWorkout, fetchWorkouts, fetchWorkoutsByMember, updateNonEquipmentStatus, approveExercise } from '../actions/nonEquipmentExerciseAction';

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

const initForm = { p_member_id: '', p_trainer_id: '', p_timeslot_id: '', p_schedule_date: '', p_status: 'Pending' };

export default function Schedules() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const user      = useSelector((s) => s.auth.user);
  const { data, loading } = useSelector((s) => s.schedules);
  const members   = useSelector((s) => s.members?.data || []);
  const trainers  = useSelector((s) => s.trainers?.data || []);
  const users     = useSelector((s) => s.users?.data || []);
  const timeslots = useSelector((s) => s.timeslots?.data || []);
  const uiCurrentUserId = useSelector((s) => s.ui.currentUserId);
  const adminId = user?.userId || uiCurrentUserId;

  const isAdmin   = user?.roleName === ROLES.ADMIN;
  const isTrainer = user?.roleName === ROLES.TRAINER;
  const currentTrainer = isTrainer ? trainers.find((t) => String(t.userId) === String(user?.userId)) : null;
  const currentTrainerId = currentTrainer?.trainerId || '';

  const exercises = useSelector((s) => s.exercises?.data || []);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [showWorkout, setShowWorkout] = useState(false);
  const [form,        setForm]        = useState(initForm);
  const [workoutForm, setWorkoutForm] = useState({ p_exercise_id: '', p_sets: '', p_reps: '' });
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('all');
  const [memberTab,   setMemberTab]   = useState('sessions'); // 'sessions' | 'workouts'
  const allWorkouts = useSelector((s) => s.workouts?.data || []);
  const [showViewWorkouts, setShowViewWorkouts] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);

  useEffect(() => {
    if (user?.roleName === ROLES.MEMBER) {
      const member = members?.find(m => String(m.userId) === String(user.userId));
      if (member) {
        dispatch(fetchSchedulesByMember(member.memberId));
        dispatch(fetchWorkoutsByMember(member.memberId));
      }
    } else if (user?.roleName === ROLES.TRAINER) {
      const trainer = trainers?.find(t => String(t.userId) === String(user.userId));
      if (trainer) {
        dispatch(fetchSchedulesByTrainer(trainer.trainerId));
      }
      dispatch(fetchWorkouts());
    } else {
      dispatch(fetchSchedules());
      dispatch(fetchWorkouts());
    }
    dispatch(fetchMembers());
    dispatch(fetchTrainers());
    dispatch(fetchUsers());
    dispatch(fetchTimeslots());
    dispatch(fetchExercises());
  }, [dispatch, user, trainers?.length, members?.length]);

  useEffect(() => {
    if (user?.roleName === ROLES.TRAINER && currentTrainerId) {
      dispatch(fetchSchedulesByTrainer(currentTrainerId));
    }
  }, [dispatch, user?.roleName, currentTrainerId]);

  const handleAdd = async () => {
    const trainerId = isTrainer ? currentTrainerId : form.p_trainer_id;
    if (!form.p_member_id || !trainerId || !form.p_timeslot_id || !form.p_schedule_date) return;
    setSaving(true);
    const ok = await dispatch(addSchedule({ ...form, p_trainer_id: trainerId }, adminId));
    setSaving(false);
    if (ok) { setShowAdd(false); setForm(initForm); }
  };

  const handleEditOpen = (row) => {
    setForm({
      p_schedule_id:   row.scheduleId,
      p_member_id:     row.memberId,
      p_trainer_id:    row.trainerId,
      p_timeslot_id:   row.timeslotId,
      p_schedule_date: row.scheduleDate?.substring(0,10) || '',
      p_status:        row.status || 'Pending',
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    setSaving(true);
    const ok = await dispatch(editSchedule(isTrainer ? { ...form, p_trainer_id: currentTrainerId } : form, adminId));
    setSaving(false);
    if (ok) { setShowEdit(false); setForm(initForm); }
  };

  const handleStatus = (id, status) => dispatch(updateScheduleStatus(id, status));

  const openWorkoutModal = (row) => {
    setForm({ p_schedule_id: row.scheduleId, memberName: row.memberName });
    setWorkoutForm({ p_exercise_id: '', p_sets: '3', p_reps: '12' });
    setShowWorkout(true);
  };

  const handleAddWorkout = async () => {
    if (!workoutForm.p_exercise_id) return;
    setSaving(true);
    const ok = await dispatch(addWorkout({ 
      p_schedule_id: form.p_schedule_id, 
      ...workoutForm 
    }, adminId));
    setSaving(false);
    if (ok) setShowWorkout(false);
  };

  const handleViewWorkouts = async (scheduleId) => {
    setSelectedScheduleId(scheduleId);
    // Don't dispatch fetchWorkouts(scheduleId) here to prevent overwriting the full list
    setShowViewWorkouts(true);
  };

  // Member marks an assigned workout as done. Uses the existing 'completed'
  // sub_status value (the DB's CK_NonEquipmentExercise_SubStatus constraint
  // only allows the original literal set, so we don't introduce a new one).
  // Per the GYM_NON_EQUIPMENT_EXERCISE_PROC ActionType '7' change, this also
  // resets approval_status back to 'pending' so it lands in the Admin/Trainer
  // approval queue. Re-used as the "Resubmit" action after a rejection —
  // calling it again on an already-'completed' row still resets
  // approval_status to 'pending', which is exactly the redo behavior we want.
  const handleSubmitWorkout = (useId) => {
    if (!useId) return;
    dispatch(updateNonEquipmentStatus(useId, 'completed'));
  };

  // Admin/Trainer verifies a member's submission.
  const handleApproveWorkout = (useId, decision) => {
    if (!useId) return;
    dispatch(approveExercise(useId, decision, adminId));
  };

  // Resolve the combined lifecycle state from the two independent DB fields:
  // sub_status ('pending' | 'completed', set by the member) and
  // approval_status ('pending' | 'approved' | 'rejected', set by Admin/Trainer).
  // 'awaiting' below is a UI-only label — it is NOT a new sub_status DB value.
  const getWorkoutStatus = (row) => {
    const sub = row.sub_status ?? row.subStatus;
    const appr = row.approval_status ?? row.approvalStatus;
    if (sub !== 'completed') return 'pending';
    if (appr === 'approved') return 'completed';
    if (appr === 'rejected') return 'rejected';
    return 'awaiting';
  };

  const workoutStatusMeta = {
    pending:  { label: 'Pending',           variant: 'pending'  },
    awaiting: { label: 'Awaiting Approval', variant: 'pending'  },
    completed:{ label: 'Completed',         variant: 'active'   },
    rejected: { label: 'Rejected',          variant: 'inactive' },
  };



  // Resolve exercise name from exercise_Id when the workout row itself
  // doesn't carry an exerciseName field.
  const getExerciseName = (w) => {
    const id = w.exercise_Id ?? w.exerciseId;
    const direct = w.exerciseName || w.ExerciseName;
    if (direct) return direct;
    const ex = exercises.find((e) => String(e.exerciseId ?? e.exercise_Id) === String(id));
    return ex?.exerciseName || ex?.ExerciseName || `#${id ?? '—'}`;
  };

  // Resolve the time range (start–end) for a given schedule/session.
  const getSessionTimeRange = (scheduleId) => {
    const sched = data.find((s) => String(s.scheduleId) === String(scheduleId));
    if (!sched) return '—';
    const slot = timeslots.find((ts) => String(ts.timeslot_Id || ts.timeslotId) === String(sched.timeslotId));
    const start = sched.starttime || sched.startTime || slot?.starttime || slot?.startTime || slot?.StartTime;
    const end = sched.endtime || sched.endTime || slot?.endtime || slot?.endTime || slot?.EndTime;
    return start && end ? `${start} - ${end}` : '—';
  };

  // Safety-net: even if the backend/action returns unfiltered data,
  // a trainer should only ever see sessions assigned to them.
  let filtered = isTrainer
    ? data.filter((s) => String(s.trainerId) === String(currentTrainerId))
    : data;
  if (search)              filtered = filtered.filter((s) => String(s.scheduleId).includes(search) || (s.memberName || '').toLowerCase().includes(search.toLowerCase()));
  if (statusFilter !== 'all') filtered = filtered.filter((s) => s.status === statusFilter);

  // For the member's "All Assigned Workouts" tab, filter by their schedules
  const memberScheduleIds = data.map(s => String(s.scheduleId));
  const memberAssignedWorkouts = user?.roleName === ROLES.MEMBER 
    ? (memberScheduleIds.length > 0
        ? allWorkouts.filter(w => memberScheduleIds.includes(String(w.scheduleId)))
        : allWorkouts)
    : allWorkouts;

  const statusVariant = (s = '') => {
    if (s === 'Scheduled')  return 'active';
    if (s === 'Cancelled')  return 'inactive';
    return 'pending';
  };

  const columns = [
    { key: 'scheduleId',   label: 'ID',      width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'memberName',   label: 'Member',  render: (v, row) => {
      const m = members.find((x) => x.memberId === row.memberId);
      return <span className="font-medium" style={{ color: 'var(--gym-text)' }}>{v || (m ? `${m.firstName} ${m.lastName}` : `#${row.memberId}`)}</span>;
    }},
    { key: 'trainerName',  label: 'Trainer', render: (v, row) => {
      const t = trainers.find((x) => String(x.trainerId) === String(row.trainerId));
      const u = t ? users.find((x) => String(x.userId) === String(t.userId)) : null;
      const fallback = t
        ? (t.username || `${t.firstName || u?.firstName || ''} ${t.lastName || u?.lastName || ''}`.trim() || `#${row.trainerId}`)
        : `#${row.trainerId}`;
      return <span style={{ color: 'var(--gym-accent3)' }}>{v || fallback}</span>;
    }},
    { key: 'scheduleDate', label: 'Date',    render: (v) => formatDate(v) },
    { key: 'starttime',    label: 'Time',    render: (v, row) => (
      <span className="font-mono text-xs">{
        (() => {
          const slot = timeslots.find((ts) => String(ts.timeslot_Id || ts.timeslotId) === String(row.timeslotId));
          const start = v || row.startTime || slot?.starttime || slot?.startTime || slot?.StartTime;
          const end = row.endtime || row.endTime || slot?.endtime || slot?.endTime || slot?.EndTime;
          return start && end ? `${start} - ${end}` : '—';
        })()
      }</span>
    )},
    { key: 'status',       label: 'Status',  render: (v) => <Badge variant={statusVariant(v)}>{v || 'Pending'}</Badge> },
    { key: '_workouts', label: 'Workouts', render: (_, row) => (
      <div className="flex gap-1">
        <button className="btn btn-secondary btn-sm" style={{ color: 'var(--gym-accent)' }} onClick={() => handleViewWorkouts(row.scheduleId)}>📖 View</button>
      </div>
    )},
    ...(isAdmin || isTrainer ? [{
      key: '_actions', label: 'Actions', render: (_, row) => (
        <div className="flex gap-1 flex-wrap">
          {row.status !== 'Scheduled' && <button className="btn btn-secondary btn-sm" style={{ color: 'var(--gym-success)', fontSize: '0.7rem' }} onClick={() => handleStatus(row.scheduleId, 'Scheduled')}>✓ Confirm</button>}
          {row.status === 'Scheduled' && <button className="btn btn-secondary btn-sm" style={{ color: 'var(--gym-accent3)', fontSize: '0.7rem' }} onClick={() => openWorkoutModal(row)}>+ Workout</button>}
          {row.status !== 'Cancelled' && <button className="btn btn-secondary btn-sm" style={{ color: 'var(--gym-accent2)', fontSize: '0.7rem' }} onClick={() => handleStatus(row.scheduleId, 'Cancelled')}>✕ Cancel</button>}
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => handleEditOpen(row)}>✏️</button>}
          {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm('Delete this schedule?')) dispatch(deleteSchedule(row.scheduleId, adminId)); }}>🗑️</button>}
        </div>
      )
    }] : []),
  ];

  const workoutCols = [
    { key: 'use_Id', label: 'ID', width: 60, render: (v, row) => <span className="id-chip">#{v || row.wse_id}</span> },
    { key: 'exerciseName', label: 'Exercise', render: (_, row) => <span className="font-bold" style={{ color: 'var(--gym-text)' }}>{getExerciseName(row)}</span> },
    { key: 'sets', label: 'Sets', width: 60 },
    { key: 'reps', label: 'Reps', width: 60 },
    { key: 'trainerName', label: 'Assigned By', render: (v) => <span style={{ color: 'var(--gym-accent3)' }}>{v || 'Admin'}</span> },
    { key: 'scheduleDate', label: 'Session Date', render: (v) => formatDate(v) },
    { key: 'sub_status', label: 'Status', render: (_, row) => {
      const wStatus = getWorkoutStatus(row);
      const meta = workoutStatusMeta[wStatus];
      const useId = row.use_Id || row.wse_id;
      return (
        <div className="flex items-center gap-2">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {wStatus === 'pending' && (
            <button className="btn btn-sm btn-secondary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => handleSubmitWorkout(useId)}>✓ Mark Done</button>
          )}
          {wStatus === 'rejected' && (
            <button className="btn btn-sm btn-secondary" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => handleSubmitWorkout(useId)}>↻ Resubmit</button>
          )}
        </div>
      );
    }},
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">Schedules</div>
          <div className="page-sub">{filtered.length} sessions</div>
        </div>
        {(isAdmin || isTrainer) && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ New Schedule</button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--gym-muted)' }}>🔍</span>
          <input className="gym-input pl-8 w-48" placeholder="Search member, ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="gym-input w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        {user?.roleName === ROLES.MEMBER && (
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium" onClick={() => setMemberTab('sessions')} style={{ background: memberTab === 'sessions' ? 'var(--gym-surface)' : 'transparent', color: memberTab === 'sessions' ? 'var(--gym-accent)' : 'var(--gym-muted)' }}>📅 My Sessions</button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium" onClick={() => setMemberTab('workouts')} style={{ background: memberTab === 'workouts' ? 'var(--gym-surface)' : 'transparent', color: memberTab === 'workouts' ? 'var(--gym-accent)' : 'var(--gym-muted)' }}>🏋️ All Assigned Workouts</button>
          </div>
        )}
      </div>

      {memberTab === 'sessions' ? (
        <DataTable columns={columns} data={filtered} loading={loading} rowKey="scheduleId" />
      ) : (
        <DataTable columns={workoutCols} data={memberAssignedWorkouts} loading={loading} rowKey="use_Id" />
      )}

      {/* VIEW WORKOUTS MODAL */}
      <Modal isOpen={showViewWorkouts} onClose={() => setShowViewWorkouts(false)} title="Session Workouts" maxWidth={600}>
        <div className="modal-body">
          {allWorkouts.filter(w => String(w.scheduleId) === String(selectedScheduleId)).length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>No workouts assigned to this session.</div>
          ) : (
             <DataTable 
               columns={[
                 { key: 'exerciseName', label: 'Exercise', render: (_, row) => <span className="font-bold">{getExerciseName(row)}</span> },
                 { key: 'sets', label: 'Sets' },
                 { key: 'reps', label: 'Reps' },
                 { key: '_duration', label: 'Time Duration', render: () => <span className="font-mono text-xs">{getSessionTimeRange(selectedScheduleId)}</span> },
                 { key: 'sub_status', label: 'Status', render: (_, row) => {
                   const wStatus = getWorkoutStatus(row);
                   const meta = workoutStatusMeta[wStatus];
                   const useId = row.use_Id || row.wse_id;
                   return (
                     <div className="flex items-center gap-2">
                       <Badge variant={meta.variant}>{meta.label}</Badge>
                       {(isAdmin || isTrainer) && wStatus === 'awaiting' && (
                         <>
                           <button className="btn btn-sm btn-secondary" style={{ fontSize: '10px', padding: '2px 6px', color: 'var(--gym-success)' }} onClick={() => handleApproveWorkout(useId, 'approved')}>✓ Approve</button>
                           <button className="btn btn-sm btn-secondary" style={{ fontSize: '10px', padding: '2px 6px', color: 'var(--gym-accent2)' }} onClick={() => handleApproveWorkout(useId, 'rejected')}>✕ Reject</button>
                         </>
                       )}
                     </div>
                   );
                 }}
               ]} 
               data={allWorkouts.filter(w => String(w.scheduleId) === String(selectedScheduleId))}
               loading={false} 
             />
          )}
        </div>
      </Modal>

      {/* ADD */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="CREATE SCHEDULE" maxWidth={500}>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Member *">
              <select className="gym-input" value={form.p_member_id} onChange={(e) => setForm(f => ({ ...f, p_member_id: e.target.value }))}>
                <option value="">Select member...</option>
                {members.map((m) => <option key={m.memberId} value={m.memberId}>{m.firstName} {m.lastName}</option>)}
              </select>
            </FieldGroup>
            {!isTrainer && (
              <FieldGroup label="Trainer *">
                <select className="gym-input" value={form.p_trainer_id} onChange={(e) => setForm(f => ({ ...f, p_trainer_id: e.target.value }))}>
                  <option value="">Select trainer...</option>
                  {trainers.map((t) => {
                    const u = users.find((x) => String(x.userId) === String(t.userId));
                    const label = t.username || `${t.firstName || u?.firstName || ''} ${t.lastName || u?.lastName || ''}`.trim() || `Trainer #${t.trainerId}`;
                    return <option key={t.trainerId} value={t.trainerId}>{label}</option>;
                  })}
                </select>
              </FieldGroup>
            )}
            {isTrainer && (
              <FieldGroup label="Trainer">
                <input className="gym-input" value={currentTrainer?.username || `${currentTrainer?.firstName || ''} ${currentTrainer?.lastName || ''}`.trim() || `Trainer #${currentTrainerId}`} disabled />
              </FieldGroup>
            )}
            <FieldGroup label="Time Slot *">
              <select className="gym-input" value={form.p_timeslot_id} onChange={(e) => setForm(f => ({ ...f, p_timeslot_id: e.target.value }))}>
                <option value="">Select slot...</option>
                {timeslots.map((ts) => <option key={ts.timeslot_Id} value={ts.timeslot_Id}>{ts.starttime} – {ts.endtime}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup label="Schedule Date *">
              <input className="gym-input" type="date" value={form.p_schedule_date} onChange={(e) => setForm(f => ({ ...f, p_schedule_date: e.target.value }))} />
            </FieldGroup>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Creating...' : 'Create Schedule'}</button>
        </div>
      </Modal>

      {/* EDIT */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="EDIT SCHEDULE" maxWidth={500}>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {!isTrainer && (
              <FieldGroup label="Trainer">
                <select className="gym-input" value={form.p_trainer_id} onChange={(e) => setForm(f => ({ ...f, p_trainer_id: e.target.value }))}>
                  <option value="">Select trainer...</option>
                  {trainers.map((t) => {
                    const u = users.find((x) => String(x.userId) === String(t.userId));
                    const label = t.username || `${t.firstName || u?.firstName || ''} ${t.lastName || u?.lastName || ''}`.trim() || `Trainer #${t.trainerId}`;
                    return <option key={t.trainerId} value={t.trainerId}>{label}</option>;
                  })}
                </select>
              </FieldGroup>
            )}
            {isTrainer && (
              <FieldGroup label="Trainer">
                <input className="gym-input" value={currentTrainer?.username || `${currentTrainer?.firstName || ''} ${currentTrainer?.lastName || ''}`.trim() || `Trainer #${currentTrainerId}`} disabled />
              </FieldGroup>
            )}
            <FieldGroup label="Time Slot">
              <select className="gym-input" value={form.p_timeslot_id} onChange={(e) => setForm(f => ({ ...f, p_timeslot_id: e.target.value }))}>
                <option value="">Select slot...</option>
                {timeslots.map((ts) => <option key={ts.timeslot_Id} value={ts.timeslot_Id}>{ts.starttime} – {ts.endtime}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup label="Date">
              <input className="gym-input" type="date" value={form.p_schedule_date} onChange={(e) => setForm(f => ({ ...f, p_schedule_date: e.target.value }))} />
            </FieldGroup>
            <FieldGroup label="Status">
              <select className="gym-input" value={form.p_status} onChange={(e) => setForm(f => ({ ...f, p_status: e.target.value }))}>
                <option value="Pending">Pending</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </FieldGroup>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </Modal>

      {/* ADD WORKOUT */}
      <Modal isOpen={showWorkout} onClose={() => setShowWorkout(false)} title={`ADD WORKOUT — ${form.memberName}`} maxWidth={400}>
        <div className="modal-body space-y-4">
          <FieldGroup label="Select Exercise">
            <select className="gym-input" value={workoutForm.p_exercise_id} onChange={(e) => setWorkoutForm(f => ({ ...f, p_exercise_id: e.target.value }))}>
              <option value="">Choose exercise...</option>
              {exercises.map(ex => <option key={ex.exerciseId} value={ex.exerciseId}>{ex.exerciseName || ex.ExerciseName}</option>)}
            </select>
          </FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Sets">
              <input className="gym-input" type="number" value={workoutForm.p_sets} onChange={(e) => setWorkoutForm(f => ({ ...f, p_sets: e.target.value }))} />
            </FieldGroup>
            <FieldGroup label="Reps">
              <input className="gym-input" type="number" value={workoutForm.p_reps} onChange={(e) => setWorkoutForm(f => ({ ...f, p_reps: e.target.value }))} />
            </FieldGroup>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddWorkout} disabled={saving}>{saving ? 'Adding...' : 'Add to Schedule'}</button>
        </div>
      </Modal>
    </div>
  );
}