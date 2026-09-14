// ============================================================
//  TrainerRequestPanel.jsx
//  Shows trainer cards with: full profile photo, full name,
//  age, experience, qualifications, real-time availability.
// ============================================================
import React, { useMemo, useState } from 'react';
import Badge from '../Badge';
import { getImgUrl } from '../../utils';

const AVAILABILITY_BUCKETS = [
  { id: 'all',       label: 'Any time'  },
  { id: 'morning',   label: 'Morning'   },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening',   label: 'Evening'   },
];

function getBucketFromTime(timeValue = '') {
  const hour = parseInt(String(timeValue).split(':')[0], 10);
  if (Number.isNaN(hour)) return 'all';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getStatusVariant(status) {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'assigned') return 'active';
  if (s === 'rejected') return 'inactive';
  return 'pending';
}


/** Avatar placeholder when no photo */
function AvatarInitial({ name, size = 72 }) {
  const letter = (name || 'T').charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: 16,
        background: 'rgba(71,200,255,.14)',
        color: 'var(--gym-accent3)',
        fontFamily: "'Space Mono', monospace",
        fontSize: size * 0.38,
        fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

/** Real-time availability indicator badge */
function AvailabilityBadge({ isAvailableNow }) {
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: isAvailableNow ? 'rgba(71,255,154,.12)' : 'rgba(140,140,160,.10)',
        color: isAvailableNow ? 'var(--gym-success)' : 'var(--gym-muted)',
        border: `1px solid ${isAvailableNow ? 'rgba(71,255,154,.25)' : 'rgba(140,140,160,.15)'}`,
      }}
    >
      <span
        style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: isAvailableNow ? 'var(--gym-success)' : 'var(--gym-muted)',
          boxShadow: isAvailableNow ? '0 0 6px var(--gym-success)' : 'none',
          animation: isAvailableNow ? 'pulseDot 2s ease-in-out infinite' : 'none',
        }}
      />
      {isAvailableNow ? 'Available Now' : 'Unavailable'}
    </div>
  );
}

/** Star rating display (read-only) */
function StarRating({ rating = 0, max = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} viewBox="0 0 16 16" width="12" height="12">
          <polygon
            points="8,1 10,6 16,6 11,10 13,15 8,11 3,15 5,10 0,6 6,6"
            fill={i < Math.round(rating) ? 'var(--gym-accent)' : 'var(--gym-border2)'}
          />
        </svg>
      ))}
    </div>
  );
}

export default function TrainerRequestPanel({
  trainers = [],
  trainerTimeslots = [],
  trainerRequests = [],
  activeAssignments = [],
  availableNowIds = [],       // ← NEW prop: array of trainer IDs available right now
  onRequestTrainer,
  onCancelRequest,
}) {
  const [search,             setSearch]             = useState('');
  const [genderFilter,       setGenderFilter]       = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [showAvailNow,       setShowAvailNow]       = useState(false);
  const [expanded,           setExpanded]           = useState(null); // trainerId of expanded card

  // Build per-trainer timeslot map  { trainerId: [{label, bucket}] }
  const availabilityMap = useMemo(() => {
    const grouped = {};
    trainerTimeslots
      .filter((s) => ['true', '1', 'active', 'approved'].includes(String(s.isActive || s.status || '').toLowerCase()))
      .forEach((slot) => {
        const key = String(slot.trainerId || slot.trainer_Id);
        const timeLabel =
          slot.custom_starttime && slot.custom_endtime
            ? `${slot.custom_starttime} – ${slot.custom_endtime}`
            : slot.starttime && slot.endtime
            ? `${slot.starttime} – ${slot.endtime}`
            : 'Flexible';
        const dayLabel = slot.selected_days || slot.day_of_week || 'Daily';
        grouped[key] ||= [];
        grouped[key].push({
          label:  `${dayLabel} · ${timeLabel}`,
          bucket: getBucketFromTime(slot.custom_starttime || slot.starttime),
        });
      });
    return grouped;
  }, [trainerTimeslots]);

  const assignedIds = new Set(
    (activeAssignments || []).map((a) => String(a.trainerId || a.trainer_Id))
  );

  const availNowSet = new Set(availableNowIds.map(String));

  const filteredTrainers = useMemo(() =>
    trainers.filter((t) => {
      if ((t.status || 'active') !== 'active') return false;
      if (showAvailNow && !availNowSet.has(String(t.trainerId))) return false;
      if (search) {
        const hay = `${t.username||''} ${t.firstName||''} ${t.lastName||''} ${t.email||''} ${t.bio||''} ${t.qualifications||''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      if (genderFilter !== 'all' && String(t.gender || '').toLowerCase() !== genderFilter) return false;
      if (availabilityFilter !== 'all') {
        const slots = availabilityMap[String(t.trainerId)] || availabilityMap[String(t.userId)] || [];
        if (!slots.some((s) => s.bucket === availabilityFilter)) return false;
      }
      return true;
    }),
    [(trainers || []), search, genderFilter, availabilityFilter, showAvailNow, availNowSet, availabilityMap]
  );

  return (
    <div className="gym-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="gym-card-title mb-0">🏋️ Select a Trainer</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>
            Browse trainer profiles and send a session request.
          </div>
        </div>
        <div className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(71,200,255,.08)', color: 'var(--gym-accent3)' }}>
          {filteredTrainers.length} trainer{filteredTrainers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="grid sm:grid-cols-4 gap-3 mb-4">
        <input
          className="gym-input"
          placeholder="Search by name, skill…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="gym-input" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
          <option value="all">All genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <select className="gym-input" value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}>
          {AVAILABILITY_BUCKETS.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
        <button
          onClick={() => setShowAvailNow((v) => !v)}
          className="btn btn-sm"
          style={{
            background: showAvailNow ? 'rgba(71,255,154,.15)' : 'var(--gym-surface2)',
            color:      showAvailNow ? 'var(--gym-success)' : 'var(--gym-muted)',
            border:     showAvailNow ? '1px solid rgba(71,255,154,.3)' : '1px solid var(--gym-border)',
            fontWeight: 600,
          }}
        >
          {showAvailNow ? '● Available Now' : '○ Available Now'}
        </button>
      </div>

      {/* Trainer Cards */}
      {filteredTrainers.length === 0 ? (
        <div className="py-12 text-center text-sm" style={{ color: 'var(--gym-muted)' }}>
          No trainers match the selected filters right now.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredTrainers.map((trainer) => {
            const tid           = String(trainer.trainerId);
            const request       = trainerRequests.find((r) => String(r.trainerId) === tid);
            const reqStatus     = (request?.status || '').toLowerCase();
            const slots         = availabilityMap[tid] || availabilityMap[String(trainer.userId)] || [];
            const alreadyAssigned = assignedIds.has(tid);
            const isAvailNow    = availNowSet.has(tid);
            const photoUrl      = getImgUrl(trainer.profile_image);
            const fullName      = [trainer.firstName, trainer.lastName].filter(Boolean).join(' ')
                                  || trainer.username || 'Trainer';
            const isExpanded    = expanded === tid;

            return (
              <div
                key={tid}
                style={{
                  background:    'var(--gym-surface2)',
                  border:        `1px solid ${isAvailNow ? 'rgba(71,255,154,.2)' : 'var(--gym-border)'}`,
                  borderRadius:  20,
                  overflow:      'hidden',
                  transition:    'box-shadow .2s',
                  boxShadow:     isAvailNow ? '0 0 0 1px rgba(71,255,154,.12)' : 'none',
                }}
              >
                {/* ── Top section: photo + key info ── */}
                <div style={{ padding: '16px 16px 0' }}>
                  <div className="flex items-start gap-4">
                    {/* Profile Photo */}
                    <div
                      style={{
                        width: 76, height: 76,
                        borderRadius: 16,
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: `2px solid ${isAvailNow ? 'rgba(71,255,154,.4)' : 'var(--gym-border2)'}`,
                        position: 'relative',
                      }}
                    >
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={fullName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <AvatarInitial name={fullName} size={76} />
                      )}
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          {/* Full name */}
                          <div
                            style={{
                              fontFamily: "'Space Mono', monospace",
                              fontSize: 15,
                              fontWeight: 700,
                              color: 'var(--gym-text)',
                              lineHeight: 1.2,
                            }}
                          >
                            {fullName}
                          </div>
                          {/* Username/handle */}
                          {trainer.username && trainer.username !== fullName && (
                            <div style={{ fontSize: 11, color: 'var(--gym-muted)', marginTop: 2 }}>
                              @{trainer.username}
                            </div>
                          )}
                        </div>
                        {/* Request status badge */}
                        {request ? (
                          <Badge variant={getStatusVariant(reqStatus)}>{reqStatus === 'pending' ? 'Pending' : request.status}</Badge>
                        ) : alreadyAssigned ? (
                          <Badge variant="active">Assigned</Badge>
                        ) : null}
                      </div>

                      {/* Availability badge */}
                      <div style={{ marginTop: 7 }}>
                        <AvailabilityBadge isAvailableNow={isAvailNow} />
                      </div>
                    </div>
                  </div>

                  {/* ── Stats row: Age · Gender · Experience ── */}
                  <div
                    className="grid grid-cols-3 gap-2"
                    style={{ marginTop: 14, marginBottom: 12 }}
                  >
                    {[
                      ['Age',        trainer.age ? `${trainer.age} yrs` : '—'],
                      ['Gender',     trainer.gender || '—'],
                      ['Experience', `${trainer.experience_years || 0} yrs`],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          background: 'var(--gym-surface)',
                          borderRadius: 12,
                          padding: '8px 10px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 10, color: 'var(--gym-muted)', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gym-text)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Expandable details ── */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : tid)}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: 'var(--gym-surface)',
                    border: 'none',
                    borderTop: '1px solid var(--gym-border)',
                    borderBottom: isExpanded ? '1px solid var(--gym-border)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: 'var(--gym-accent3)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span>View {isExpanded ? 'less' : 'more'} details</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    width="14" height="14"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isExpanded && (
                  <div style={{ padding: '14px 16px', borderTop: 'none' }}>
                    {/* Qualifications */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--gym-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Qualifications
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--gym-text)', lineHeight: 1.5 }}>
                        {trainer.qualifications || trainer.bio || 'Profile details coming soon.'}
                      </div>
                    </div>

                    {/* Email */}
                    {trainer.email && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--gym-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Contact
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--gym-text)' }}>{trainer.email}</div>
                      </div>
                    )}

                    {/* Approved timeslots */}
                    {slots.length > 0 && (
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 11, color: 'var(--gym-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Available Time Slots
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {slots.map((slot, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: 11, padding: '4px 10px', borderRadius: 999,
                                background: 'rgba(71,200,255,.08)', color: 'var(--gym-accent3)',
                                border: '1px solid rgba(71,200,255,.15)',
                              }}
                            >
                              {slot.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {slots.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--gym-muted)', fontStyle: 'italic' }}>
                        Timeslot pending admin approval.
                      </div>
                    )}
                  </div>
                )}

                {/* ── Action footer ── */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--gym-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--gym-muted)' }}>
                    {reqStatus === 'pending'  && '⏳ Waiting for admin/trainer approval.'}
                    {(reqStatus === 'approved' || reqStatus === 'assigned') && '✅ Trainer approved your request.'}
                    {reqStatus === 'rejected' && `❌ ${request.reviewNote || 'Trainer declined.'}`}
                    {!request && alreadyAssigned    && '✅ This trainer is your assigned trainer.'}
                    {!request && !alreadyAssigned   && 'Send a request and wait for approval.'}
                  </div>
                  <div className="flex gap-2">
                    {reqStatus === 'pending' && (
                      <button
                        className="btn btn-danger btn-sm flex-shrink-0"
                        onClick={() => onCancelRequest(request.assignmentId || request.eaId)}
                        title="Cancel this request"
                      >
                        ✕ Cancel
                      </button>
                    )}
                    <button
                      className="btn btn-primary btn-sm flex-shrink-0"
                      disabled={alreadyAssigned || reqStatus === 'pending' || reqStatus === 'approved' || reqStatus === 'assigned'}
                      onClick={() => onRequestTrainer(trainer)}
                    >
                      {alreadyAssigned                                      ? '✓ Assigned'
                      : reqStatus === 'pending'                              ? '⏳ Pending'
                      : reqStatus === 'approved' || reqStatus === 'assigned' ? '✓ Assigned'
                      : '+ Request'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
