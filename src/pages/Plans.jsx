import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlans, addPlan, editPlan, deletePlan } from '../actions/planAction';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { formatCurrency } from '../utils';
import { ROLES } from '../../index';
import { PLAN_TYPES, PLAN_TYPE_DURATIONS, PLAN_TYPE_MAX_TRAINERS } from '../constants/PlanConstant';

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

const PLAN_META = {
  Silver:   { color: 'var(--gym-muted)',   icon: '🥈', bg: 'rgba(107,114,128,.08)' },
  Gold:     { color: 'var(--gym-warning)', icon: '🥇', bg: 'rgba(255,179,71,.08)' },
  Platinum: { color: 'var(--gym-accent3)', icon: '💎', bg: 'rgba(71,200,255,.08)' },
};
const getMeta = (type = '') => {
  const key = Object.keys(PLAN_META).find((k) => type.toLowerCase().includes(k.toLowerCase()));
  return PLAN_META[key] || { color: 'var(--gym-accent)', icon: '📋', bg: 'rgba(232,255,71,.08)' };
};

const initForm = { p_plan_id: '', p_plan_name: '', p_plan_type: '', p_duration_days: '', p_price: '' };

// Duration select shown for the ADD/EDIT modals — options are constrained to
// whatever GYM_PLAN_PROC will actually accept for the chosen plan type.
function DurationField({ planType, value, onChange }) {
  const options = PLAN_TYPE_DURATIONS[planType] || [];
  return (
    <select className="gym-input" value={value} onChange={onChange} disabled={!planType}>
      <option value="">{planType ? 'Select duration...' : 'Select a plan type first'}</option>
      {options.map((d) => <option key={d} value={d}>{d} days</option>)}
    </select>
  );
}

export default function Plans() {
  const dispatch = useDispatch();
  const { data, loading } = useSelector((s) => s.plans);
  const adminId = useSelector((s) => s.ui.currentUserId);
  const user    = useSelector((s) => s.auth.user);
  const isAdmin = user?.roleName === ROLES.ADMIN;

  const [showAdd,  setShowAdd]  = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form,     setForm]     = useState(initForm);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { dispatch(fetchPlans()); }, [dispatch]);

  // Changing plan type mid-form clears the duration, since the allowed
  // durations differ per type (Silver 30/60, Gold 30/90/180/365, Platinum
  // 90/180/270/365) — an old selection could be invalid for the new type.
  const setPlanType = (setter) => (e) => setter((f) => ({ ...f, p_plan_type: e.target.value, p_duration_days: '' }));

  const handleAdd = async () => {
    if (!form.p_plan_name || !form.p_plan_type || !form.p_duration_days || !form.p_price) return;
    setSaving(true);
    const ok = await dispatch(addPlan(form, adminId));
    setSaving(false);
    if (ok) { setShowAdd(false); setForm(initForm); }
  };

  const handleEditOpen = (row) => {
    setForm({ p_plan_id: row.planId, p_plan_name: row.planName || '', p_plan_type: row.planType, p_duration_days: row.duration_days, p_price: row.price });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!form.p_plan_name || !form.p_plan_type || !form.p_duration_days || !form.p_price) return;
    setSaving(true);
    const ok = await dispatch(editPlan(form, adminId));
    setSaving(false);
    if (ok) { setShowEdit(false); setForm(initForm); }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete plan "${name}"?`)) dispatch(deletePlan(id, adminId));
  };

  const maxPrice = Math.max(...data.map((p) => parseFloat(p.price) || 0), 1);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">Membership Plans</div>
          <div className="page-sub">{data.length} plans available</div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={() => dispatch(fetchPlans())}>↺ Refresh</button>
          {isAdmin && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Plan</button>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--gym-muted)' }}>Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {data.map((plan) => {
            const meta    = getMeta(plan.planType);
            const pct     = Math.round((parseFloat(plan.price) / maxPrice) * 100);
            return (
              <div key={plan.planId} className="card" style={{ position: 'relative', overflow: 'hidden', border: `1px solid ${meta.color}33` }}>
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: meta.color }} />
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-2xl mb-1">{meta.icon}</div>
                      <div className="font-bold text-lg" style={{ color: 'var(--gym-text)' }}>{plan.planName || plan.planType}</div>
                      <div className="text-xs mt-1 flex items-center gap-2" style={{ color: 'var(--gym-muted)' }}>
                        <span>Plan #{plan.planId}</span>
                        <span style={{ color: meta.color }}>· {plan.planType}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: meta.color, fontFamily: "'Space Mono', monospace" }}>
                        {formatCurrency(plan.price)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--gym-muted)' }}>Duration</span>
                      <span style={{ color: 'var(--gym-text)' }} className="font-medium">{plan.duration_days} days</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--gym-border)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color }} />
                    </div>
                    <div className="text-xs text-right" style={{ color: 'var(--gym-muted)' }}>{pct}% of max</div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--gym-muted)' }}>Trainers included</span>
                    <span style={{ color: 'var(--gym-text)' }} className="font-medium">
                      {plan.maxTrainers || PLAN_TYPE_MAX_TRAINERS[plan.planType] || 1}
                      {(plan.maxTrainers || PLAN_TYPE_MAX_TRAINERS[plan.planType] || 1) > 1 ? ' trainers' : ' trainer'}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--gym-border)' }}>
                      <button className="btn btn-secondary btn-sm flex-1" onClick={() => handleEditOpen(plan)}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm flex-1" onClick={() => handleDelete(plan.planId, plan.planType)}>🗑️ Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {!loading && data.length === 0 && (
            <div className="col-span-3 text-center py-12" style={{ color: 'var(--gym-muted)' }}>No plans found.</div>
          )}
        </div>
      )}

      {/* ADD */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="ADD MEMBERSHIP PLAN" maxWidth={440}>
        <div className="modal-body space-y-4">
          <FieldGroup label="Plan Name *">
            <input className="gym-input" type="text" value={form.p_plan_name} onChange={(e) => setForm(f => ({ ...f, p_plan_name: e.target.value }))} placeholder="e.g. Gold Annual" />
          </FieldGroup>
          <FieldGroup label="Plan Type *">
            <select className="gym-input" value={form.p_plan_type} onChange={setPlanType(setForm)}>
              <option value="">Select type...</option>
              {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Duration (days) *">
              <DurationField planType={form.p_plan_type} value={form.p_duration_days} onChange={(e) => setForm(f => ({ ...f, p_duration_days: e.target.value }))} />
            </FieldGroup>
            <FieldGroup label="Price (LKR) *">
              <input className="gym-input" type="number" min="0" step="0.01" value={form.p_price} onChange={(e) => setForm(f => ({ ...f, p_price: e.target.value }))} placeholder="5000.00" />
            </FieldGroup>
          </div>
          {form.p_plan_type && (
            <div className="text-xs px-3 py-2 rounded-xl" style={{ background: 'var(--gym-surface2)', color: 'var(--gym-muted)' }}>
              {form.p_plan_type === 'Platinum'
                ? `Platinum members can be assigned up to ${PLAN_TYPE_MAX_TRAINERS.Platinum} trainers.`
                : `${form.p_plan_type} members can be assigned 1 trainer.`}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Saving...' : 'Add Plan'}</button>
        </div>
      </Modal>

      {/* EDIT */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="EDIT PLAN" maxWidth={440}>
        <div className="modal-body space-y-4">
          <FieldGroup label="Plan Name *">
            <input className="gym-input" type="text" value={form.p_plan_name} onChange={(e) => setForm(f => ({ ...f, p_plan_name: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label="Plan Type *">
            <select className="gym-input" value={form.p_plan_type} onChange={setPlanType(setForm)}>
              <option value="">Select type...</option>
              {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Duration (days) *">
              <DurationField planType={form.p_plan_type} value={form.p_duration_days} onChange={(e) => setForm(f => ({ ...f, p_duration_days: e.target.value }))} />
            </FieldGroup>
            <FieldGroup label="Price (LKR) *">
              <input className="gym-input" type="number" min="0" step="0.01" value={form.p_price} onChange={(e) => setForm(f => ({ ...f, p_price: e.target.value }))} />
            </FieldGroup>
          </div>
          {form.p_plan_type && (
            <div className="text-xs px-3 py-2 rounded-xl" style={{ background: 'var(--gym-surface2)', color: 'var(--gym-muted)' }}>
              {form.p_plan_type === 'Platinum'
                ? `Platinum members can be assigned up to ${PLAN_TYPE_MAX_TRAINERS.Platinum} trainers.`
                : `${form.p_plan_type} members can be assigned 1 trainer.`}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Update Plan'}</button>
        </div>
      </Modal>
    </div>
  );
}