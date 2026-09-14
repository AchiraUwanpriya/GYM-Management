// ============================================================
//  TrainerAvailabilityPage.jsx
//  Member-facing page: browse trainers, send / cancel requests.
//  Requests are stored in workflowStore (localStorage) and
//  show Pending until admin/trainer approves or rejects them.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTrainers,
} from '../actions/trainerAction';
import {
  fetchAssignments,
} from '../actions/trainerAssignmnetAction';
import { fetchUsers } from '../actions/usersAction';
import {
  fetchTrainerTimeslots,
} from '../actions/trainerTimeSlotAction';
import {
  showToast,
} from '../actions/uiAction';
import TrainerRequestPanel from '../components/member/TrainerRequestPanel';
import Badge from '../components/Badge';
import { formatDate } from '../utils';
import {
  createTrainerRequest,
  cancelTrainerRequest,
  getTrainerRequests,
  subscribeWorkflowStore,
} from '../utils/workflowStore';

// ── helpers ──────────────────────────────────────────────────
function getStatusVariant(status) {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'assigned') return 'active';
  if (s === 'rejected') return 'inactive';
  return 'pending';
}

function computeAvailableNowIds(trainerTimeslots = []) {
  const now   = new Date();
  const dayIdx = now.getDay(); // 0 Sun … 6 Sat
  const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const todayName = DAY_NAMES[dayIdx];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const ids = new Set();
  trainerTimeslots
    .filter((s) => ['true', '1', 'active', 'approved'].includes(String(s.isActive || s.status || '').toLowerCase()))
    .forEach((slot) => {
      // day match
      const days = (slot.selected_days || slot.day_of_week || '').toLowerCase();
      if (days && !days.includes(todayName) && !days.includes('daily') && !days.includes('every')) return;

      // time match
      const startStr = slot.custom_starttime || slot.starttime || '';
      const endStr   = slot.custom_endtime   || slot.endtime   || '';
      if (!startStr || !endStr) return;

      const toMin = (t) => {
        const [h, m] = t.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      if (nowMinutes >= toMin(startStr) && nowMinutes <= toMin(endStr)) {
        ids.add(String(slot.trainerId || slot.trainer_Id));
      }
    });
  return [...ids];
}

// ── Request History row ───────────────────────────────────────
function RequestRow({ req, onCancel }) {
  const status = (req.status || 'pending').toLowerCase();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 14,
        background: 'var(--gym-surface2)',
        border: '1px solid var(--gym-border)',
      }}
    >
      {/* Trainer initial avatar */}
      <div
        style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: 'rgba(71,200,255,.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Space Mono', monospace",
          fontWeight: 700, fontSize: 16,
          color: 'var(--gym-accent3)',
        }}
      >
        {(req.trainerName || 'T').charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gym-text)', marginBottom: 2 }}>
          {req.trainerName || `Trainer #${req.trainerId}`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--gym-muted)' }}>
          Requested {formatDate(req.requestedAt)}
          {req.reviewNote ? ` · ${req.reviewNote}` : ''}
        </div>
      </div>

      {/* Status badge */}
      <Badge variant={getStatusVariant(req.status)}>
        {status === 'pending'   ? '⏳ Pending'
        : status === 'approved' || status === 'assigned' ? '✅ Approved'
        : status === 'rejected' ? '❌ Rejected'
        : req.status}
      </Badge>

      {/* Cancel button — only for pending */}
      {status === 'pending' && (
        <button
          className="btn btn-danger btn-sm"
          style={{ flexShrink: 0 }}
          onClick={() => onCancel(req.id)}
        >
          ✕ Cancel
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function TrainerAvailabilityPage() {
  const dispatch = useDispatch();
  const user            = useSelector((s) => s.auth.user);
  const trainers        = useSelector((s) => s.trainers?.data        || []);
  const users           = useSelector((s) => s.users?.data           || []);
  const trainerTimeslots = useSelector((s) => s.trainerTimeslots?.data || []);
  const assignments     = useSelector((s) => s.assignments?.data     || []);

  const [trainerRequests, setTrainerRequests] = useState([]);

  // ── Fetch data ─────────────────────────────────────────────
  useEffect(() => {
    if (!user?.userId) return;
    dispatch(fetchTrainers());
    dispatch(fetchUsers());
    dispatch(fetchAssignments());
    dispatch(fetchTrainerTimeslots());
  }, [dispatch, user?.userId]);

  // ── Sync workflowStore ────────────────────────────────────
  useEffect(() => {
    if (!user?.userId) return;
    const sync = () => {
      setTrainerRequests(
        getTrainerRequests().filter((r) => String(r.memberId) === String(user.userId))
      );
    };
    sync();
    return subscribeWorkflowStore(sync);
  }, [user?.userId]);

  // ── Derived data ───────────────────────────────────────────
  const myAssignments = useMemo(
    () => assignments.filter((a) => String(a.memberId) === String(user?.userId)),
    [assignments, user?.userId]
  );

  const availableNowIds = useMemo(
    () => computeAvailableNowIds(trainerTimeslots),
    [trainerTimeslots]
  );

  const enrichedTrainers = useMemo(() =>
    trainers.map((trainer) => {
      const linkedUser = users.find((u) => String(u.userId) === String(trainer.userId));
      const fullName = `${trainer.firstName || linkedUser?.firstName || ''} ${trainer.lastName || linkedUser?.lastName || ''}`.trim();
      return {
        ...trainer,
        firstName: trainer.firstName || linkedUser?.firstName || '',
        lastName: trainer.lastName || linkedUser?.lastName || '',
        username: trainer.username || fullName || linkedUser?.username || `Trainer #${trainer.trainerId}`,
        email: trainer.email || linkedUser?.email || '',
        phone: trainer.phone || linkedUser?.phone || '',
        gender: trainer.gender || linkedUser?.gender || '',
        profile_image: trainer.profile_image || linkedUser?.profile_image || '',
      };
    }),
    [trainers, users]
  );

  // ── Handlers ──────────────────────────────────────────────
  const handleRequestTrainer = (trainer) => {
    const existing = trainerRequests.find(
      (r) => String(r.trainerId) === String(trainer.trainerId)
    );
    if (existing?.status === 'pending') {
      dispatch(showToast('A request to this trainer is already pending.', 'error'));
      return;
    }
    if (myAssignments.some(
      (a) => String(a.trainerId || a.trainer_Id) === String(trainer.trainerId)
    )) {
      dispatch(showToast('This trainer is already assigned to you.', 'success'));
      return;
    }
    createTrainerRequest({
      memberId:    user.userId,
      memberName:  user.username || user.email || `Member #${user.userId}`,
      memberEmail: user.email  || '',
      memberPhone: user.phone  || '',
      trainerId:        trainer.trainerId,
      trainerUserId:    trainer.userId || trainer.trainerId,
      trainerName:      trainer.username,
      trainerEmail:     trainer.email || '',
      trainerProfileSnapshot: {
        gender:         trainer.gender          || '',
        experience:     trainer.experience_years || '',
        qualifications: trainer.qualifications  || trainer.bio || '',
      },
    });
    dispatch(showToast(`Request sent to ${trainer.username}. Waiting for approval.`, 'success'));
  };

  const handleCancelRequest = (requestId) => {
    if (!window.confirm('Cancel this trainer request?')) return;
    cancelTrainerRequest(requestId);
    dispatch(showToast('Trainer request cancelled.', 'info'));
  };

  // Split requests by status for the history section
  const pendingRequests  = trainerRequests.filter((r) => (r.status || '').toLowerCase() === 'pending');
  const resolvedRequests = trainerRequests.filter((r) => (r.status || '').toLowerCase() !== 'pending');

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Trainer Availability</div>
          <div className="page-sub">
            Browse trainers, send session requests, and track your request status.
          </div>
        </div>
      </div>

      {/* ── My Requests summary (pending) ─────────────────── */}
      {trainerRequests.length > 0 && (
        <div className="gym-card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="gym-card-title mb-0">📋 My Trainer Requests</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>
                Track the status of all your sent requests
              </div>
            </div>
            <div
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: 'rgba(71,200,255,.08)', color: 'var(--gym-accent3)' }}
            >
              {pendingRequests.length} pending
            </div>
          </div>

          <div className="space-y-2">
            {/* Pending first */}
            {pendingRequests.map((req) => (
              <RequestRow key={req.id} req={req} onCancel={handleCancelRequest} />
            ))}
            {/* Then resolved */}
            {resolvedRequests.map((req) => (
              <RequestRow key={req.id} req={req} onCancel={handleCancelRequest} />
            ))}
          </div>

          {pendingRequests.length > 0 && (
            <p className="text-xs mt-3" style={{ color: 'var(--gym-muted)' }}>
              ⏳ Pending requests are waiting for admin or trainer approval. You can cancel a pending request at any time.
            </p>
          )}
        </div>
      )}

      {/* ── Trainer browse panel ───────────────────────────── */}
      <TrainerRequestPanel
        trainers={enrichedTrainers}
        trainerTimeslots={trainerTimeslots}
        trainerRequests={trainerRequests}
        activeAssignments={myAssignments}
        availableNowIds={availableNowIds}
        onRequestTrainer={handleRequestTrainer}
        onCancelRequest={handleCancelRequest}
      />

    </div>
  );
}
