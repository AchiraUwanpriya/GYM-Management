// ============================================================
//  _shared_pages.jsx — Timeslots, Assignments, Workouts
//  All endpoints corrected
// ============================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
//call to action folder 
import { fetchTimeslots, addTimeslot, deleteTimeslot } from "../actions/timeslotsAction"
import { fetchTrainers } from "../actions/trainerAction"
import { fetchAssignments, addAssignment, deleteAssignment, updateAssignmentStatus } from "../actions/trainerAssignmnetAction"
import { fetchMembers } from "../actions/memberAction"
import { fetchWorkouts, addWorkout, deleteWorkout } from "../actions/nonEquipmentExerciseAction"
import { fetchExercises, addExercise, deleteExercise } from "../actions/exercisesAction"
import { fetchSchedules } from "../actions/schedulesAction"
import { fetchTrainerTimeslots, addTrainerTimeslot, approveTrainerTimeslot, deleteTrainerTimeslot } from "../actions/trainerTimeSlotAction"
import { fetchUsers } from "../actions/usersAction"
//call to component folder
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { ROLES } from '../../index';
import { formatDate } from '../utils';

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

// ─────────────────────────────────────────────────────────────
//  TIMESLOTS
// ─────────────────────────────────────────────────────────────
export function Timeslots() {
  const dispatch  = useDispatch();
  const { data, loading } = useSelector((s) => s.timeslots);
  const trainerTS = useSelector((s) => s.trainerTimeslots?.data || []);
  const user      = useSelector((s) => s.auth.user);
  const trainers  = useSelector((s) => s.trainers.data);
  const adminId   = user?.userId;
  const isAdmin   = user?.roleName === ROLES.ADMIN;
  const isTrainer = user?.roleName === ROLES.TRAINER;

  const [tab,      setTab]      = useState('master');
  const [showAdd,  setShowAdd]  = useState(false);
  const [showReq,  setShowReq]  = useState(false);
  const [form,     setForm]     = useState({ p_starttime: '', p_endtime: '' });
  const [reqForm,  setReqForm]  = useState({
    p_trainer_id: '',
    p_timeslot_id: '',
    p_day_of_week: '',
    _slotType: 'master',
    _scheduleType: 'dayofweek',
    _selectedDays: [],
    _start_date: '',
    _end_date: '',
    p_custom_start: '',
    p_custom_end: '',
  });
  const [saving,   setSaving]   = useState(false);

  const RESET_REQ_FORM = {
    p_trainer_id: '',
    p_timeslot_id: '',
    p_day_of_week: '',
    _slotType: 'master',
    _scheduleType: 'dayofweek',
    _selectedDays: [],
    _start_date: '',
    _end_date: '',
    p_custom_start: '',
    p_custom_end: '',
  };

  // Fetch master timeslots and trainers list once on mount (no loop)
  useEffect(() => {
    dispatch(fetchTimeslots());
    dispatch(fetchTrainers());
  }, [dispatch]);

  // Fetch trainer-specific timeslots when role/user identity is known
  // NOTE: intentionally excludes `trainers` array from deps to prevent
  // an infinite loop (fetchTrainers success → trainers changes → effect
  // re-fires → fetchTrainers again → …)
  useEffect(() => {
    const tid = isAdmin ? null : (user?.trainerId || null);
    dispatch(fetchTrainerTimeslots(tid));
  }, [dispatch, isAdmin, isTrainer, user?.userId, user?.trainerId]);

  const handleAdd = async () => {
    if (!form.p_starttime || !form.p_endtime) return;
    setSaving(true);
    const ok = await dispatch(addTimeslot(form, adminId));
    setSaving(false);
    if (ok) { setShowAdd(false); setForm({ p_starttime: '', p_endtime: '' }); }
  };

  // ─── FIX: Full validation + correct payload assembly ───────
  const handleReqSubmit = async () => {
    // 🔥 FIX: Resolve actual trainerId from userId if role is Trainer
    const currentTrainer   = isTrainer ? trainers.find(t => t.userId === user?.userId) : null;
    const currentTrainerId = currentTrainer?.trainerId || user?.trainerId || reqForm.p_trainer_id;

    // ── Validation ──────────────────────────────────────────
    if (!currentTrainerId) {
      alert('Error: Trainer profile not found. Please ensure you are registered as a trainer.');
      return;
    }

    if (reqForm._slotType === 'custom') {
      if (!reqForm.p_custom_start || !reqForm.p_custom_end) {
        alert('Please enter both Start Time and End Time for your custom slot.');
        return;
      }
    } else {
      if (!reqForm.p_timeslot_id) {
        alert('Please select a Master Time Slot.');
        return;
      }
    }

    if (reqForm._scheduleType === 'dayofweek' && !reqForm.p_day_of_week) {
      alert('Please select a Day of Week.');
      return;
    }
    if (reqForm._scheduleType === 'duration' && (!reqForm._start_date || !reqForm._end_date)) {
      alert('Please enter both Start Date and End Date.');
      return;
    }
    if (reqForm._scheduleType === 'oneyear' && !(reqForm._selectedDays?.length)) {
      alert('Please select at least one day of the week.');
      return;
    }

    setSaving(true);

    // ── Build clean payload ──────────────────────────────────
    const payload = { 
      p_trainer_id: currentTrainerId,
      p_schedule_type: reqForm._scheduleType || 'dayofweek'
    };

    // Slot time — custom or master
    if (reqForm._slotType === 'custom') {
      payload.p_custom_starttime = reqForm.p_custom_start;
      payload.p_custom_endtime   = reqForm.p_custom_end;
    } else {
      payload.p_timeslot_id = reqForm.p_timeslot_id;
    }

    // Schedule-type-specific day/date fields
    if (reqForm._scheduleType === 'duration') {
      payload.p_start_date = reqForm._start_date;
      payload.p_end_date   = reqForm._end_date;
    } else if (reqForm._scheduleType === 'oneyear') {
      const joinedDays = reqForm._selectedDays.join(',');
      payload.p_selected_days = joinedDays;
      payload.p_day_of_week   = joinedDays;
    } else {
      // dayofweek
      payload.p_day_of_week = reqForm.p_day_of_week;
    }

    const ok = await dispatch(addTrainerTimeslot(payload));
    setSaving(false);

    if (ok) {
      setShowReq(false);
      setReqForm(RESET_REQ_FORM);
      dispatch(fetchTrainerTimeslots()); // Refresh list
    }
  };

  const handleDelete  = (id) => { if (window.confirm(`Delete timeslot #${id}?`)) dispatch(deleteTimeslot(id, adminId)); };
  const handleApprove = (id) => dispatch(approveTrainerTimeslot(id, 1, adminId));
  const handleReject  = (id) => dispatch(approveTrainerTimeslot(id, 2, adminId));
  const handleDelReq  = (id) => { if (window.confirm(`Delete trainer time slot #${id}?`)) dispatch(deleteTrainerTimeslot(id, adminId)); };

  // The reducer normalizes the backend's status/Status/is_status/Is_Status
  // column into a single `status` field on each row. A soft-deleted slot
  // comes back from the stored procedure with status === 'Deleted' rather
  // than being removed from the result set.
  // Master slots are soft-deleted with status = 'inactive' (not 'deleted'),
  // so both values must be treated as "this row is deleted" for the
  // Delete button and status badge to behave correctly.
  const isSlotDeleted = (row) => {
    const s = String(row.status || '').trim().toLowerCase();
    return s === 'deleted' || s === 'inactive';
  };
  const getSlotStatus = (row) => (isSlotDeleted(row) ? 'Deleted' : (row.status && String(row.status).trim()) || 'Active');

  const masterCols = [
    { key: 'timeslot_Id', label: 'ID',    width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'starttime',   label: 'Start', render: (v) => <span className="font-mono" style={{ color: 'var(--gym-accent)' }}>{v}</span> },
    { key: 'endtime',     label: 'End',   render: (v) => <span className="font-mono" style={{ color: 'var(--gym-accent3)' }}>{v}</span> },
    { key: '_status', label: 'Status', render: (_, row) => (
      <Badge variant={isSlotDeleted(row) ? 'inactive' : 'active'}>{getSlotStatus(row)}</Badge>
    )},
    ...(isAdmin ? [{ key: '_actions', label: '', render: (_, row) => (
      isSlotDeleted(row)
        ? <span className="text-xs italic" style={{ color: 'var(--gym-muted)' }}>Deleted</span>
        : <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.timeslot_Id)}>🗑️ Delete</button>
    )}] : []),
  ];

  // A soft-deleted trainer timeslot comes back with row.status === 'deleted'
  // (separate from the isActive 0/1/2 approve/reject flag), so it must be
  // checked independently before falling back to the isActive-based badge.
  const isTrainerSlotDeleted = (row) =>
    String(row.status ?? row.Status ?? '').trim().toLowerCase() === 'deleted';

  const trainerCols = [
    { key: 'trainerTimeslot_Id', label: 'ID', width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'trainerName', label: 'Trainer', render: (_, row) => {
      // Backend may send the joined name under different casings/keys
      // depending on the endpoint — check all known variants first.
      const directName = row.trainerName || row.TrainerName || row.trainer_name;
      if (directName && directName.trim()) {
        return <span style={{ color: 'var(--gym-accent3)' }}>{directName.trim()}</span>;
      }

      // Fall back to looking the trainer up in the trainers list by id,
      // trying every field the object might expose for a display name.
      const trainerId = row.trainerId || row.trainer_Id || row.trainer_id;
      const t = trainers.find((x) => String(x.trainerId ?? x.trainer_Id) === String(trainerId));
      const composedName = t ? `${t.firstName || ''} ${t.lastName || ''}`.trim() : '';
      const fallbackName = (t && (t.trainerName || t.fullName || composedName || t.username)) || null;

      return (
        <span style={{ color: 'var(--gym-accent3)' }}>
          {fallbackName || `#${trainerId ?? 'N/A'}`}
        </span>
      );
    }},
    {
      key: 'schedule_type',
      label: 'Schedule Type',
      render: (v) => <span className="font-semibold" style={{ color: 'var(--gym-text)' }}>{(v || 'DayOfWeek').toUpperCase()}</span>
    },
    {
      key: '_time',
      label: 'Time',
      render: (_, r) => {
        if (r.custom_starttime && r.custom_endtime) {
          return <span className="font-mono text-xs">{r.custom_starttime} - {r.custom_endtime}</span>;
        }
        return <span className="font-mono text-xs">{r.starttime || 'N/A'} - {r.endtime || 'N/A'}</span>;
      }
    },
    {
      key: '_days',
      label: 'Days / Date Range',
      render: (_, r) => {
        const type = String(r.schedule_type || '').toLowerCase();
        if (type === 'duration') return `${r.start_date || '—'} to ${r.end_date || '—'}`;
        if (type === 'oneyear') return r.selected_days || r.day_of_week || 'All Days';
        return r.day_of_week || 'N/A';
      }
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (v, row) => {
        // A soft-deleted row must be checked first — it wins over isActive.
        if (isTrainerSlotDeleted(row)) return <Badge variant="inactive">Deleted</Badge>;
        // isActive: 0 = Pending, 1 = Approved/Active, 2 = Rejected
        const n = Number(v);
        if (n === 1) return <Badge variant="active">Approved</Badge>;
        if (n === 2) return <Badge variant="inactive">Rejected</Badge>;
        return <Badge variant="pending">Pending</Badge>;
      }
    },
    ...(isAdmin ? [{
      key: '_actions',
      label: 'Actions',
      render: (_, r) => (
        isTrainerSlotDeleted(r)
          ? <span className="text-xs italic" style={{ color: 'var(--gym-muted)' }}>Deleted</span>
          : <div className="flex gap-2">
              {Number(r.isActive) !== 1 && (
                <button className="btn btn-secondary btn-sm" style={{ color: 'var(--gym-success)' }} onClick={() => handleApprove(r.trainerTimeslot_Id)}>✓ Approve</button>
              )}
              {Number(r.isActive) !== 2 && (
                <button className="btn btn-danger btn-sm" onClick={() => handleReject(r.trainerTimeslot_Id)}>✕ Reject</button>
              )}
              <button className="btn btn-danger btn-sm" onClick={() => handleDelReq(r.trainerTimeslot_Id)}>🗑️ Delete</button>
            </div>
      )
    }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">Trainer Availability Times</div>
          <div className="page-sub">{data.filter((ts) => !isSlotDeleted(ts)).length} master slots</div>
        </div>
        <div className="flex gap-2">
          {isAdmin   && <button className="btn btn-primary"   onClick={() => setShowAdd(true)}>+ Add Slot</button>}
          {isTrainer && <button className="btn btn-secondary" onClick={() => setShowReq(true)}>+ Request Slot</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--gym-border)' }}>
        {[{ id: 'master', label: 'Master Slots' }, { id: 'trainer', label: 'Trainer Availability Times' }].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className="px-4 py-2 text-sm font-semibold"
            style={{ color: tab === id ? 'var(--gym-accent)' : 'var(--gym-muted)', borderBottom: tab === id ? '2px solid var(--gym-accent)' : '2px solid transparent', background: 'transparent', marginBottom: -1 }}
          >{label}</button>
        ))}
      </div>

      {tab === 'master'  && <DataTable columns={masterCols}  data={data}      loading={loading} rowKey="timeslot_Id" />}
      {tab === 'trainer' && <DataTable columns={trainerCols} data={trainerTS} loading={false}   rowKey="trainerTimeslot_Id" />}

      {/* Add Master Slot */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="ADD TIME SLOT" maxWidth={400}>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Start Time *"><input className="gym-input" type="time" value={form.p_starttime} onChange={(e) => setForm(f => ({ ...f, p_starttime: e.target.value }))} /></FieldGroup>
            <FieldGroup label="End Time *"><input className="gym-input" type="time" value={form.p_endtime} onChange={(e) => setForm(f => ({ ...f, p_endtime: e.target.value }))} /></FieldGroup>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Saving...' : 'Add Slot'}</button>
        </div>
      </Modal>

      {/* ── Request Trainer Slot ─────────────────────────────────── */}
      <Modal isOpen={showReq} onClose={() => { setShowReq(false); setReqForm(RESET_REQ_FORM); }} title="REQUEST TIME SLOT" maxWidth={480}>
        <div className="modal-body space-y-4">

          {/* Time Slot Type */}
          <FieldGroup label="Time Slot Type *">
            <select
              className="gym-input"
              value={reqForm._slotType || 'master'}
              onChange={(e) => setReqForm(f => ({ ...f, _slotType: e.target.value, p_timeslot_id: '', p_custom_start: '', p_custom_end: '' }))}
            >
              <option value="master">Master Time Slot (Fixed hours)</option>
              <option value="custom">Define Own Time Slot</option>
            </select>
          </FieldGroup>

          {/* Master slot selector */}
          {(!reqForm._slotType || reqForm._slotType === 'master') && (
            <FieldGroup label="Select Master Slot *">
              <select
                className="gym-input"
                value={reqForm.p_timeslot_id}
                onChange={(e) => setReqForm(f => ({ ...f, p_timeslot_id: e.target.value }))}
              >
                <option value="">Select slot...</option>
                {data.filter((ts) => !isSlotDeleted(ts)).map((ts) => (
                  <option key={ts.timeslot_Id} value={ts.timeslot_Id}>
                    {ts.starttime} – {ts.endtime}
                  </option>
                ))}
              </select>
            </FieldGroup>
          )}

          {/* Custom time inputs */}
          {reqForm._slotType === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Start Time *">
                <input
                  className="gym-input"
                  type="time"
                  value={reqForm.p_custom_start || ''}
                  onChange={(e) => setReqForm(f => ({ ...f, p_custom_start: e.target.value }))}
                />
              </FieldGroup>
              <FieldGroup label="End Time *">
                <input
                  className="gym-input"
                  type="time"
                  value={reqForm.p_custom_end || ''}
                  onChange={(e) => setReqForm(f => ({ ...f, p_custom_end: e.target.value }))}
                />
              </FieldGroup>
            </div>
          )}

          {/* Schedule Type */}
          <FieldGroup label="Schedule Type *">
            <select
              className="gym-input"
              value={reqForm._scheduleType || 'dayofweek'}
              onChange={(e) => setReqForm(f => ({ ...f, _scheduleType: e.target.value, p_day_of_week: '', _selectedDays: [], _start_date: '', _end_date: '' }))}
            >
              <option value="dayofweek">Day of Week (recurring weekly)</option>
              <option value="duration">Time Duration (date range)</option>
              <option value="oneyear">One Year (full year, select days)</option>
            </select>
          </FieldGroup>

          {/* Day of week — single select */}
          {(!reqForm._scheduleType || reqForm._scheduleType === 'dayofweek') && (
            <FieldGroup label="Day of Week *">
              <select
                className="gym-input"
                value={reqForm.p_day_of_week}
                onChange={(e) => setReqForm(f => ({ ...f, p_day_of_week: e.target.value }))}
              >
                <option value="">Select day...</option>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </FieldGroup>
          )}

          {/* Duration — date range */}
          {reqForm._scheduleType === 'duration' && (
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Start Date *">
                <input
                  className="gym-input"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={reqForm._start_date || ''}
                  onChange={(e) => setReqForm(f => ({ ...f, _start_date: e.target.value }))}
                />
              </FieldGroup>
              <FieldGroup label="End Date *">
                <input
                  className="gym-input"
                  type="date"
                  min={reqForm._start_date || new Date().toISOString().split('T')[0]}
                  value={reqForm._end_date || ''}
                  onChange={(e) => setReqForm(f => ({ ...f, _end_date: e.target.value }))}
                />
              </FieldGroup>
            </div>
          )}

          {/* One Year — multi-select days
              FIX Bug 1: replaced <button> with <div role="button"> to prevent
              the invalid DOM nesting error:
              "<button> cannot appear as descendant of <button>"
              Previously the day toggles were <button> elements nested inside
              the Modal whose footer also contains <button>s — browsers fire
              the nearest ancestor button's onClick on any click, so selecting
              a day was accidentally triggering the Submit button with an
              incomplete / empty payload.
          */}
          {reqForm._scheduleType === 'oneyear' && (
            <FieldGroup label="Select Days of Week (multiple allowed)">
              <div className="grid grid-cols-4 gap-2 mt-1">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => {
                  const selected = (reqForm._selectedDays || []).includes(d);
                  return (
                    <div
                      key={d}
                      role="button"
                      tabIndex={0}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none text-center"
                      style={{
                        background: selected ? 'var(--gym-accent)' : 'var(--gym-surface)',
                        color: selected ? '#000' : 'var(--gym-text)',
                        border: `1px solid ${selected ? 'var(--gym-accent)' : 'var(--gym-border)'}`,
                      }}
                      onClick={() => {
                        let sd = [...(reqForm._selectedDays || [])];
                        if (selected) sd = sd.filter((x) => x !== d);
                        else sd.push(d);
                        setReqForm(f => ({ ...f, _selectedDays: sd }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          let sd = [...(reqForm._selectedDays || [])];
                          if (selected) sd = sd.filter((x) => x !== d);
                          else sd.push(d);
                          setReqForm(f => ({ ...f, _selectedDays: sd }));
                        }
                      }}
                    >
                      {d.substring(0, 3)}
                    </div>
                  );
                })}
              </div>
            </FieldGroup>
          )}

        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => { setShowReq(false); setReqForm(RESET_REQ_FORM); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleReqSubmit} disabled={saving}>
            {saving ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </Modal>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ASSIGNMENTS
// ─────────────────────────────────────────────────────────────
export function Assignments() {
  const dispatch = useDispatch();
  const { data: assignments = [], loading } = useSelector((s) => s.assignments ?? {});
  const members = useSelector((s) => s.members?.data || []);
  const trainers = useSelector((s) => s.trainers?.data || []);
  const user = useSelector((s) => s.auth.user);
  const adminId = user?.userId;

  useEffect(() => {
    dispatch(fetchAssignments());
    dispatch(fetchMembers());
    dispatch(fetchTrainers());
  }, [dispatch]);

  // FIX: members/trainers rows carry firstName + lastName (never a literal
  // "memberName"/"trainerName" field), so resolveName was always missing
  // and silently falling back to "#<id>". Build the full name the same way
  // the rest of the app does, with graceful fallbacks.
  const resolveName = (row, list, idKey) => {
    const key = row[idKey];
    const item = list.find((x) => String(x[idKey]) === String(key));
    if (!item) return `#${key || 'N/A'}`;
    const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ').trim();
    return fullName || item.username || `#${key || 'N/A'}`;
  };

  const getStatusVariant = (status) => {
    const value = (status || '').toString().toLowerCase();
    if (value === 'approved' || value === 'assigned') return 'active';
    if (value === 'rejected' || value === 'cancelled') return 'inactive';
    return 'pending';
  };

  const getStatusLabel = (status) => {
    const value = (status || '').toString().toLowerCase();
    if (value === 'approved' || value === 'assigned') return 'Approved';
    if (value === 'rejected') return 'Rejected';
    if (value === 'cancelled') return 'Cancelled';
    return 'Pending';
  };

  const handleApprove = (id) => dispatch(updateAssignmentStatus(id, 'Approved', adminId));
  const handleReject = (id) => dispatch(updateAssignmentStatus(id, 'Rejected', adminId));
  const handleDelete = (id) => {
    if (window.confirm('Delete this assignment?')) {
      dispatch(deleteAssignment(id, adminId));
    }
  };

  const columns = [
    {
      key: 'assignmentId',
      label: 'ID',
      width: 80,
      render: (value) => <span className="id-chip">#{value}</span>,
    },
    {
      key: 'memberName',
      label: 'Member',
      render: (_, row) => <span>{resolveName(row, members, 'memberId')}</span>,
    },
    {
      key: 'trainerName',
      label: 'Trainer',
      render: (_, row) => <span>{resolveName(row, trainers, 'trainerId')}</span>,
    },
    {
      key: 'assignment_date',
      label: 'Date',
      render: (value) => <span>{formatDate(value)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={getStatusVariant(value)}>
          {getStatusLabel(value)}
        </Badge>
      ),
    },
    {
      key: '_actions',
      label: 'Actions',
      render: (_, row) => {
        const status = (row.status || '').toString().toLowerCase();
        return (
          <div className="flex gap-2">
            {status !== 'approved' && (
              <button className="btn btn-secondary btn-sm" onClick={() => handleApprove(row.assignmentId)}>
                ✓ Approve
              </button>
            )}
            {status !== 'rejected' && (
              <button className="btn btn-danger btn-sm" onClick={() => handleReject(row.assignmentId)}>
                ✕ Reject
              </button>
            )}
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.assignmentId)}>
              🗑️ Delete
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">Assignments</div>
          <div className="page-sub">Review trainer assignments and manage approval status.</div>
        </div>
      </div>

      <DataTable columns={columns} data={assignments} loading={loading} rowKey="assignmentId" />
    </div>
  );
}