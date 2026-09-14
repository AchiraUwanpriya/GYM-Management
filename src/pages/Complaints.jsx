// ============================================================
//  Complaints.jsx — Full complaint system
//  Features:
//    • Complaint type: "public" or "person"
//    • Person → select target role (Member/Trainer) → dropdown
//    • Star rating (1–5 interactive)
//    • Admin: resolve complaints
//    • Member/Trainer: submit + view own complaints
// ============================================================
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ROLES } from '../../index';
import { fetchTrainers } from '../actions/trainerAction';
import { fetchMembers } from '../actions/memberAction';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  getAllComplaints,
  addComplaint,
  updateComplaintStatus,
} from '../services/complaintApi';

/* ─────────────────────────────
   Star Rating (interactive)
───────────────────────────── */
function StarRating({ value = 0, onChange = () => {}, readOnly = false }) {
  const [hovered, setHovered] = useState(null);
  const display = hovered !== null ? hovered : value;

  return (
    <div
      style={{ display: 'flex', gap: 2, cursor: readOnly ? 'default' : 'pointer' }}
      onMouseLeave={() => !readOnly && setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const full = display >= star;
        const half = !full && display >= star - 0.5;

        return (
          <span key={star} style={{ position: 'relative', fontSize: 22 }}>
            <span style={{ color: '#555' }}>★</span>

            {(full || half) && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: full ? '100%' : '50%',
                  overflow: 'hidden',
                  color: '#facc15',
                }}
              >
                ★
              </span>
            )}

            {!readOnly && (
              <>
                <span
                  onMouseEnter={() => setHovered(star - 0.5)}
                  onClick={() => onChange(star - 0.5)}
                  style={{ position: 'absolute', left: 0, width: '50%', height: '100%', top: 0 }}
                />
                <span
                  onMouseEnter={() => setHovered(star)}
                  onClick={() => onChange(star)}
                  style={{ position: 'absolute', right: 0, width: '50%', height: '100%', top: 0 }}
                />
              </>
            )}
          </span>
        );
      })}
      {!readOnly && value > 0 && (
        <span className="text-xs font-mono ml-1" style={{ color: 'var(--gym-warning)', lineHeight: '22px' }}>
          {value}
        </span>
      )}
    </div>
  );
}

const StarDisplay = ({ value }) => <StarRating value={Number(value) || 0} readOnly />;

/* ─────────────────────────────
   Main Component
───────────────────────────── */
export default function Complaints() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth?.user);

  const roleId = user?.roleId;
  const roleName = user?.roleName;
  const userId = user?.id || user?.userId || user?.memberId || user?.trainerId || null;

  const isAdmin = roleName === ROLES.ADMIN;
  const isTrainer = roleName === ROLES.TRAINER;

  const members = useSelector((s) => s.members?.data || []);
  const trainers = useSelector((s) => s.trainers?.data || []);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);

  // ─── Form state ─────────
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('public');           // 'public' or 'person'
  const [targetRole, setTargetRole] = useState('');      // 'member' or 'trainer'
  const [targetUserId, setTargetUserId] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ─── Admin resolve ─────
  const [showResolve, setShowResolve] = useState(false);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolving, setResolving] = useState(false);

  // ─── Filters ───────────
  const [filterType, setFilterType] = useState('all');     // 'all', 'public', 'person'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'resolved'

  /* ───────── Load data ───────── */
  useEffect(() => {
    dispatch(fetchTrainers());
    dispatch(fetchMembers());
  }, [dispatch]);

  const fetchComplaints = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // FIX: GetComplaintByUser (getMyComplaints) only returns complaints
      // *filed by* p_user_id — it can never include public complaints
      // filed by someone else. Trainers/members need to see those too
      // (the "🌐 Public" filter tab below implies as much), so everyone
      // now pulls the full list and the role-based split happens in
      // `filtered` below instead of at the API layer.
      const res = await getAllComplaints();
      const data = res?.data?.ResultSet || res?.data;
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Complaint fetch error:', err);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [userId]);

  /* ───────── Filtered data ───────── */
  // Enrich complaints: resolve targetUserId → targetUserName from local store
  const enrichedComplaints = complaints.map((c) => {
    if (c.type !== 'person' || !c.targetUserId) return c;
    if (c.targetUserName) return c; // already set by API
    // Search members
    const member = members.find((m) =>
      String(m.userId) === String(c.targetUserId) ||
      String(m.memberId) === String(c.targetUserId)
    );
    if (member) return { ...c, targetUserName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || `Member #${member.memberId}` };
    // Search trainers
    const trainer = trainers.find((t) =>
      String(t.userId) === String(c.targetUserId) ||
      String(t.trainerId) === String(c.targetUserId)
    );
    if (trainer) return { ...c, targetUserName: trainer.username || `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim() || `Trainer #${trainer.trainerId}` };
    return c;
  });

  // Non-admins may only ever see: public complaints (from anyone), complaints
  // they filed themselves, and person complaints targeting them.
  const visibleComplaints = isAdmin
    ? enrichedComplaints
    : enrichedComplaints.filter((c) => {
        const tLower = (c.type || '').trim().toLowerCase();
        return tLower === 'public' ||
               String(c.userId) === String(userId) ||
               String(c.targetUserId) === String(userId);
      });

  const filtered = visibleComplaints.filter((c) => {
    if (filterType !== 'all' && (c.type || '').trim().toLowerCase() !== filterType.toLowerCase()) return false;
    if (filterStatus !== 'all' && (c.status || 'pending').toLowerCase() !== filterStatus.toLowerCase()) return false;
    return true;
  });

  /* ───────── Submit complaint ───────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!message.trim()) { setFormError('Please enter a complaint message.'); return; }
    if (!rating) { setFormError('Please select a rating.'); return; }
    if (type === 'person') {
      if (!targetRole) { setFormError('Please select target role (Member or Trainer).'); return; }
      if (!targetUserId) { setFormError('Please select the person.'); return; }
    }

    setSubmitting(true);
    try {
      await addComplaint({
        p_userId: userId,
        p_type: type,
        p_targetUserId: type === 'person' ? targetUserId : '',
        p_message: message.trim(),
        p_rating: Math.round(rating),
        p_status: 'pending',
      });

      // Reset form
      setMessage('');
      setRating(0);
      setType('public');
      setTargetRole('');
      setTargetUserId('');
      setShowForm(false);
      fetchComplaints();
    } catch (err) {
      console.error('Submit error:', err);
      setFormError('Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ───────── Admin resolve ───────── */
  const handleResolve = async () => {
    if (!resolveTarget) return;
    setResolving(true);
    try {
      await updateComplaintStatus(resolveTarget.complaintId, 'resolved', userId);
      setShowResolve(false);
      setResolveTarget(null);
      fetchComplaints();
    } catch (err) {
      console.error('Resolve error:', err);
    } finally {
      setResolving(false);
    }
  };


/* ───────── Target user list ───────── */
const targetList = targetRole === 'trainer'
    ? trainers
        .filter((t) => String(t.status).toLowerCase() === 'active')
        .map((t) => ({ id: t.userId, name: t.username || `${t.firstName} ${t.lastName}` }))
    : targetRole === 'member'
    ? members
        .filter((m) => String(m.status).toLowerCase() === 'approved')
        .map((m) => ({ id: m.userId, name: `${m.firstName} ${m.lastName}` }))
    : [];

  /* ───────── Stat counts ───────── */
  const totalComplaints = visibleComplaints.length;
  const pendingCount = visibleComplaints.filter((c) => (c.status || 'pending') === 'pending').length;
  const resolvedCount = visibleComplaints.filter((c) => c.status === 'resolved').length;
  const avgRating = totalComplaints > 0
    ? (visibleComplaints.reduce((sum, c) => sum + (c.rating || 0), 0) / totalComplaints).toFixed(1)
    : '—';

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">{isAdmin ? 'All Complaints' : 'My Complaints'}</div>
          <div className="page-sub">
            {totalComplaints} total · {pendingCount} pending · {resolvedCount} resolved
          </div>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Submit Complaint
          </button>
        )}
      </div>

      {/* ── Stats ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: totalComplaints, color: 'var(--gym-accent3)' },
          { label: 'Pending', value: pendingCount, color: 'var(--gym-warning)' },
          { label: 'Resolved', value: resolvedCount, color: 'var(--gym-success)' },
          { label: 'Avg Rating', value: avgRating, color: 'var(--gym-accent)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3 rounded-xl text-center" style={{ background: 'var(--gym-surface)', border: `1px solid ${color}22` }}>
            <div className="text-xl font-bold" style={{ color, fontFamily: "'Space Mono', monospace" }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
          {[['all', 'All'], ['public', '🌐 Public'], ['person', '👤 Person']].map(([key, lbl]) => (
            <button key={key} onClick={() => setFilterType(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filterType === key ? 'var(--gym-surface)' : 'transparent',
                color: filterType === key ? 'var(--gym-text)' : 'var(--gym-muted)',
                border: 'none',
                boxShadow: filterType === key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}>{lbl}</button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
          {[['all', 'All Status'], ['pending', '⏳ Pending'], ['resolved', '✅ Resolved']].map(([key, lbl]) => (
            <button key={key} onClick={() => setFilterStatus(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filterStatus === key ? 'var(--gym-surface)' : 'transparent',
                color: filterStatus === key ? 'var(--gym-text)' : 'var(--gym-muted)',
                border: 'none',
                boxShadow: filterStatus === key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* ── Complaint List ────────────────────── */}
      {loading ? (
        <div className="py-12 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>Loading complaints…</div>
      ) : filtered.length === 0 ? (
        <div className="gym-card py-12 text-center">
          <div className="text-3xl mb-3">📋</div>
          <div className="text-sm" style={{ color: 'var(--gym-muted)' }}>
            {complaints.length === 0 ? 'No complaints yet.' : 'No complaints match current filters.'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.complaintId} className="gym-card"
              style={{ border: c.status === 'resolved' ? '1px solid rgba(71,255,154,.15)' : '1px solid var(--gym-border)' }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-lg font-medium"
                      style={{
                        background: (c.type || '').trim().toLowerCase() === 'person' ? 'rgba(71,200,255,.1)' : 'rgba(232,255,71,.08)',
                        color: (c.type || '').trim().toLowerCase() === 'person' ? 'var(--gym-accent3)' : 'var(--gym-accent)',
                        border: `1px solid ${(c.type || '').trim().toLowerCase() === 'person' ? 'rgba(71,200,255,.2)' : 'rgba(232,255,71,.15)'}`,
                      }}>
                      {(c.type || '').trim().toLowerCase() === 'person' ? '👤 Person' : '🌐 Public'}
                    </span>
                    {c.userFullName && (
                      <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>
                        by <strong style={{ color: 'var(--gym-text2)' }}>{c.userFullName}</strong>
                      </span>
                    )}
                    {(c.type || '').trim().toLowerCase() === 'person' && c.targetUserName && (
                      <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>
                        → <strong style={{ color: 'var(--gym-accent3)' }}>{c.targetUserName}</strong>
                      </span>
                    )}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--gym-text)' }}>{c.message}</div>
                  {c.created_date && (
                    <div className="text-xs mt-1.5" style={{ color: 'var(--gym-muted)' }}>
                      {c.created_date.substring(0, 10)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Badge variant={c.status === 'resolved' ? 'active' : 'pending'}>
                    {c.status || 'Pending'}
                  </Badge>
                  <StarDisplay value={c.rating} />
                </div>
              </div>

              {/* Admin resolve button */}
              {isAdmin && (c.status || 'pending') !== 'resolved' && (
                <div className="pt-2 flex justify-end" style={{ borderTop: '1px solid var(--gym-border)' }}>
                  <button className="btn btn-success btn-sm"
                    onClick={() => { setResolveTarget(c); setShowResolve(true); }}>
                    ✓ Mark Resolved
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Submit Complaint Modal ───────────── */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setFormError(''); }} title="SUBMIT COMPLAINT" maxWidth={520}>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">

            {/* Complaint Type */}
            <div>
              <label className="gym-label">Complaint Type *</label>
              <div className="flex gap-3">
                {[
                  { val: 'public', icon: '🌐', label: 'Public', desc: 'General feedback' },
                  { val: 'person', icon: '👤', label: 'Person', desc: 'About a specific user' },
                ].map(({ val, icon, label, desc }) => (
                  <label key={val}
                    className="flex items-center gap-3 cursor-pointer flex-1 px-4 py-3 rounded-xl transition-all"
                    style={{
                      border: `1px solid ${type === val ? 'var(--gym-accent)' : 'var(--gym-border)'}`,
                      background: type === val ? 'rgba(232,255,71,.06)' : 'var(--gym-surface)',
                    }}>
                    <input type="radio" name="complaintType" value={val}
                      checked={type === val}
                      onChange={() => { setType(val); setTargetRole(''); setTargetUserId(''); }}
                      className="hidden" />
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <div>
                      <div className="text-sm font-medium" style={{ color: type === val ? 'var(--gym-accent)' : 'var(--gym-text)' }}>{label}</div>
                      <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Person target selection */}
            {type === 'person' && (
              <div className="space-y-3">
                <div>
                  <label className="gym-label">Target Role *</label>
                  <select className="gym-input" value={targetRole}
                    onChange={(e) => { setTargetRole(e.target.value); setTargetUserId(''); }}>
                    <option value="">Select role…</option>
                    <option value="member">Member</option>
                    <option value="trainer">Trainer</option>
                  </select>
                </div>

                {targetRole && (
                  <div>
                    <label className="gym-label">
                      Select {targetRole === 'trainer' ? 'Trainer' : 'Member'} *
                    </label>
                    <select className="gym-input" value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}>
                      <option value="">Choose {targetRole}…</option>
                      {targetList.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    {targetList.length === 0 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>
                        No {targetRole}s found.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Message */}
            <div>
              <label className="gym-label">Complaint Message *</label>
              <textarea
                className="gym-input resize-none"
                rows={4}
                placeholder="Describe your complaint or feedback…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Rating */}
            <div>
              <label className="gym-label">Rating (1–5) *</label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,71,71,.08)', border: '1px solid rgba(255,71,71,.22)', color: 'var(--gym-accent2)' }}>
                ⚠ {formError}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Resolve Confirmation Modal ───────── */}
      <Modal isOpen={showResolve} onClose={() => setShowResolve(false)} title="RESOLVE COMPLAINT" maxWidth={420}>
        <div className="modal-body space-y-4">
          <div className="p-3 rounded-xl text-sm"
            style={{ background: 'rgba(71,255,154,.06)', border: '1px solid rgba(71,255,154,.2)', color: 'var(--gym-success)' }}>
            ✅ You are marking Complaint <strong>#{resolveTarget?.complaintId}</strong> as resolved.
          </div>
          {resolveTarget && (
            <div className="p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--gym-muted)' }}>Complaint:</div>
              <div className="text-sm" style={{ color: 'var(--gym-text)' }}>{resolveTarget.message}</div>
              <div className="flex items-center gap-2 mt-2">
                <StarDisplay value={resolveTarget.rating} />
                <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>
                  by {resolveTarget.userFullName || 'User #' + resolveTarget.userId}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowResolve(false)}>Cancel</button>
          <button className="btn btn-success" onClick={handleResolve} disabled={resolving}>
            {resolving ? 'Resolving…' : '✓ Confirm Resolve'}
          </button>
        </div>
      </Modal>
    </div>
  );
}