import React from 'react';

// ── Each status has its OWN distinct colour ──────────────────
// active    = green   (badge-active)
// approved  = teal    (badge-approved)   ← was same as active — FIXED
// pending   = amber   (badge-pending)
// inactive  = red     (badge-inactive)
// rejected  = purple  (badge-rejected)   ← was same as inactive — FIXED
// suspended = orange  (badge-suspended)  ← was same as inactive — FIXED
// deleted   = grey    (badge-deleted)    ← new for soft-delete
const VARIANT_MAP = {
  active:    'badge-active',
  inactive:  'badge-inactive',
  pending:   'badge-pending',
  confirmed: 'badge-active',
  completed: 'badge-active',
  cancelled: 'badge-inactive',
  info:      'badge-info',
  card:      'badge-info',
  cash:      'badge-pending',
  online:    'badge-active',
  // ── User-status specific (now all distinct) ──
  approved:  'badge-approved',
  rejected:  'badge-rejected',
  suspended: 'badge-suspended',
  deleted:   'badge-deleted',
};

export default function Badge({ variant = 'info', children }) {
  const cls = VARIANT_MAP[variant?.toLowerCase()] || 'badge-info';
  return <span className={`badge ${cls}`}>{children}</span>;
}