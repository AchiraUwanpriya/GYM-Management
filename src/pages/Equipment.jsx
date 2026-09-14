// ============================================================
//  Equipment.jsx — Equipment + Live RFID Tracking
//  Features:
//  - Separate IN/OUT buttons (no manual RFID entry)
//  - Auto-fetch RFID from DB for logged-in member
//  - Attendance check prerequisite before equipment use
//  - Live Available quantity updates
//  - Live tracking grid with current users
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEquipment, addEquipment, editEquipment, deleteEquipment, updateEquipmentStatus } from '../actions/equipmentAction';
import { fetchMembers } from '../actions/memberAction';
import { fetchLiveEquipmentUsage } from '../actions/equipmentUsageAction';
import { showToast } from '../actions/uiAction';
// FIX: tagEquipmentIn/tagEquipmentOut hit /Equipment/Tag* which is a broken
// backend path (RequestAPI model has the needed properties commented out).
// Member IN/OUT now goes through the same Start/End Usage Log endpoints the
// admin Manual IN/OUT already uses successfully.
import { getMemberActiveSessions, startEquipmentUsage, endEquipmentUsage } from '../services/equipmentApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { ROLES } from '../../index';

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

const initForm = { p_equipment_name: '', p_equipment_type: '', p_description: '', p_quantity: 1 };

export default function Equipment() {
  const dispatch      = useDispatch();
  const { data, loading } = useSelector((s) => s.equipment);
  const liveUsage     = useSelector((s) => s.equipmentUsage?.data || []);
  const members       = useSelector((s) => s.members?.data || []);
  const adminId       = useSelector((s) => s.ui.currentUserId);
  const user          = useSelector((s) => s.auth.user);
  const isAdmin       = user?.roleName === ROLES.ADMIN;
  const isMember      = user?.roleName === ROLES.MEMBER;

  const [tab,      setTab]      = useState('equipment');
  const [showAdd,  setShowAdd]  = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showManualIn, setShowManualIn] = useState(false);
  const [form,     setForm]     = useState(initForm);
  const [manualForm, setManualForm] = useState({ p_member_id: '', p_equipment_id: '' });
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [tagging,  setTagging]  = useState(null); // equipmentId being tagged
  const [mySessions, setMySessions] = useState([]); // current member's active sessions

  // Fetch data
  useEffect(() => {
    dispatch(fetchEquipment());
    dispatch(fetchMembers());
    dispatch(fetchLiveEquipmentUsage());
    const timer = setInterval(() => dispatch(fetchLiveEquipmentUsage()), 15000);
    return () => clearInterval(timer);
  }, [dispatch]);

  // Load member's own active sessions
  const loadMySessions = useCallback(async () => {
    if (!isMember || !user?.userId) return;
    try {
      const res = await getMemberActiveSessions(user.userId);
      const rs = res?.data?.ResultSet || [];
      setMySessions(Array.isArray(rs) ? rs : []);
    } catch { setMySessions([]); }
  }, [isMember, user?.userId]);

  useEffect(() => { loadMySessions(); }, [loadMySessions]);

  // ── ADMIN HANDLERS ──
  const handleAdd = async () => {
    if (!form.p_equipment_name) return;
    setSaving(true);
    const ok = await dispatch(addEquipment(form, adminId));
    setSaving(false);
    if (ok) { setShowAdd(false); setForm(initForm); }
  };
  const handleEditOpen = (row) => {
    if (row.status === 'deleted') {
      dispatch(showToast('Deleted equipment cannot be edited.', 'error'));
      return;
    }
    setForm({ p_equipment_id: row.equipmentId, p_equipment_name: row.equipmentName, p_equipment_type: row.equipmentType || '', p_description: row.description || '', p_quantity: row.quantity || 1 });
    setShowEdit(true);
  };
  const handleEditSave = async () => {
    setSaving(true);
    const ok = await dispatch(editEquipment(form, adminId));
    setSaving(false);
    if (ok) { setShowEdit(false); setForm(initForm); }
  };
  const handleDelete = (id, name, status) => {
    if (status === 'deleted') {
      dispatch(showToast('Already deleted.', 'error'));
      return;
    }
    if (window.confirm(`Delete equipment "${name}"?`)) dispatch(deleteEquipment(id, adminId));
  };

  // Admin can only flip between active <-> inactive. Deleted equipment is
  // locked — no status change, no edit, no re-delete.
  const handleToggleStatus = (row) => {
    if (row.status === 'deleted') return;
    const next = row.status === 'active' ? 'inactive' : 'active';
    dispatch(updateEquipmentStatus(row.equipmentId, next, adminId));
  };

  const refreshLive = () => {
    dispatch(fetchLiveEquipmentUsage());
    dispatch(fetchEquipment());
    loadMySessions();
  };

  const handleAdminManualIn = async () => {
    if (!manualForm.p_member_id || !manualForm.p_equipment_id) {
      dispatch(showToast('Select member and equipment.', 'error'));
      return;
    }
    const selectedMember = members.find((m) => String(m.memberId) === String(manualForm.p_member_id));
    setSaving(true);
    try {
      const res = await startEquipmentUsage({
        ...manualForm,
        p_rfid_id: selectedMember?.rfId_Id || selectedMember?.rfid_Id || '',
        p_starttime: new Date().toISOString(),
        p_status: 'in_progress',
        p_admin_id: adminId,
      });
      if (res.data?.StatusCode === 200) {
        dispatch(showToast('Manual equipment IN recorded.', 'success'));
        setShowManualIn(false);
        setManualForm({ p_member_id: '', p_equipment_id: '' });
        refreshLive();
      } else {
        dispatch(showToast(res.data?.Result || 'Manual IN failed.', 'error'));
      }
    } catch {
      dispatch(showToast('Manual IN connection error.', 'error'));
    }
    setSaving(false);
  };

  const handleAdminManualOut = async (row) => {
    const logId = row.logId || row.LogId;
    if (!logId) {
      dispatch(showToast('Log ID missing for this active session.', 'error'));
      return;
    }
    setTagging(logId);
    try {
      const res = await endEquipmentUsage(logId, new Date().toISOString(), row.elapsed_mins || row.actual_mins || 0);
      if (res.data?.StatusCode === 200) {
        dispatch(showToast('Manual equipment OUT recorded.', 'success'));
        refreshLive();
      } else {
        dispatch(showToast(res.data?.Result || 'Manual OUT failed.', 'error'));
      }
    } catch {
      dispatch(showToast('Manual OUT connection error.', 'error'));
    }
    setTagging(null);
  };

  // Find the logged-in member's own record (for rfid + memberId), the same
  // way the admin Manual IN modal resolves a selected member's rfid.
  const getMyMember = () =>
    members.find((m) =>
      String(m.userId) === String(user?.userId) ||
      String(m.memberId) === String(user?.memberId)
    );

  // ── MEMBER TAG IN ──
  // FIX: was calling tagEquipmentIn -> /Equipment/Tag* (broken backend model).
  // Now uses the same StartEquipmentUsageLog call the admin Manual IN uses,
  // which is wired to the corrected GYM_EQUIPMENT_USAGE_LOG_PROC ActionType 6.
  const handleTagIn = async (eq) => {
    if (!user?.userId) { dispatch(showToast('Please log in first.', 'error')); return; }
    const myMember = getMyMember();
    const rfid = myMember?.rfId_Id || myMember?.rfid_Id;
    if (!rfid) {
      dispatch(showToast('No RFID tag linked to your account. Contact an admin.', 'error'));
      return;
    }
    setTagging(eq.equipmentId);
    try {
      const res = await startEquipmentUsage({
        p_rfid_id: rfid,
        p_equipment_id: eq.equipmentId,
        p_member_id: myMember?.memberId || user.memberId,
        p_starttime: new Date().toISOString(),
        p_status: 'in_progress',
        p_admin_id: user.userId,
      });
      if (res.data?.StatusCode === 200) {
        dispatch(showToast(`✅ Tagged IN to ${eq.equipmentName}!`, 'success'));
        dispatch(fetchLiveEquipmentUsage());
        dispatch(fetchEquipment());
        loadMySessions();
      } else {
        dispatch(showToast(res.data?.Result || 'Tag IN failed.', 'error'));
      }
    } catch { dispatch(showToast('Connection error', 'error')); }
    setTagging(null);
  };

  // ── MEMBER TAG OUT ──
  // FIX: was calling tagEquipmentOut -> /Equipment/Tag* (broken backend model).
  // Now uses EndEquipmentUsageLog with the member's rfid, since the proc's
  // ActionType 7 finds the active session by rfid, not by log id.
  const handleTagOut = async (eq) => {
    if (!user?.userId) { dispatch(showToast('Please log in first.', 'error')); return; }
    const myMember = getMyMember();
    const rfid = myMember?.rfId_Id || myMember?.rfid_Id;
    if (!rfid) {
      dispatch(showToast('No RFID tag linked to your account. Contact an admin.', 'error'));
      return;
    }
    setTagging(eq.equipmentId);
    try {
      const res = await endEquipmentUsage(null, new Date().toISOString(), 0, rfid);
      if (res.data?.StatusCode === 200) {
        dispatch(showToast(`✅ Tagged OUT of ${eq.equipmentName}!`, 'success'));
        dispatch(fetchLiveEquipmentUsage());
        dispatch(fetchEquipment());
        loadMySessions();
      } else {
        dispatch(showToast(res.data?.Result || 'Tag OUT failed.', 'error'));
      }
    } catch { dispatch(showToast('Connection error', 'error')); }
    setTagging(null);
  };

  // FIX: GetAllEquipment returns every row regardless of status (active,
  // inactive, deleted). Members should only ever see equipment that's
  // actually usable — admins still see everything so they can manage it.
  const visibleData = isMember ? data.filter((e) => e.status === 'active') : data;

  const filtered = search
    ? visibleData.filter((e) => (e.equipmentName || '').toLowerCase().includes(search.toLowerCase()))
    : visibleData;

  // Check if member is currently using a particular equipment
  const isUsingEquipment = (equipmentId) => {
    return mySessions.some(s => String(s.equipmentId) === String(equipmentId));
  };

  // Count active users per equipment from live data
  const getActiveCount = (equipmentId) => {
    return liveUsage.filter(l => String(l.equipmentId) === String(equipmentId) && l.status === 'in_progress').length;
  };

  const getMemberDisplayName = (member) =>
    `${member?.firstName || ''} ${member?.lastName || ''}`.trim() ||
    member?.username ||
    (member?.memberId ? `Member #${member.memberId}` : '');

  const enrichedLiveUsage = liveUsage.map((row) => {
    const member = members.find((m) =>
      String(m.memberId) === String(row.memberId || row.member_Id || '') ||
      String(m.userId) === String(row.memberId || row.member_Id || '') ||
      String(m.rfId_Id || m.rfid_Id || '') === String(row.rfid_number || row.rfid_Id || '')
    );
    const equipment = data.find((e) => String(e.equipmentId) === String(row.equipmentId || row.equipment_Id || ''));
    const memberName = String(row.memberName || row.member_name || '').trim() || getMemberDisplayName(member);
    const equipmentName = String(row.equipmentName || row.equipment_name || '').trim() || equipment?.equipmentName;

    return {
      ...row,
      logId: row.logId || row.LogId,
      rfid_Id: row.rfid_Id || row.rfid_number || member?.rfId_Id || member?.rfid_Id || '',
      memberId: row.memberId || row.member_Id || member?.memberId || '',
      memberName: memberName || 'Unknown member',
      equipmentId: row.equipmentId || row.equipment_Id || equipment?.equipmentId || '',
      equipmentName: equipmentName || 'Unknown equipment',
    };
  });

  // ── EQUIPMENT LIST COLUMNS ──
  const eqCols = [
    { key: 'equipmentId', label: 'ID', width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'equipmentName', label: 'Name', render: (v) => <span className="font-medium" style={{ color:'var(--gym-text)' }}>{v}</span> },
    { key: 'equipmentType', label: 'Type', render: (v) => <span style={{ color:'var(--gym-accent3)' }}>{v || '—'}</span> },
    { key: 'description', label: 'Notes', render: (v) => <span className="text-xs" style={{ color:'var(--gym-muted)' }}>{v ? v.substring(0,50)+'…' : '—'}</span> },
    { key: 'quantity', label: 'Qty', render: (v, row) => {
      const activeCount = getActiveCount(row.equipmentId);
      const available = Math.max(0, (v || 0) - activeCount);
      return (
        <div className="flex flex-col items-center">
          <Badge variant={available > 0 ? "active" : "error"}>
            Available: {available}
          </Badge>
          <span className="text-[10px] opacity-60 mt-1">Total: {v || 0} · In Use: {activeCount}</span>
        </div>
      );
    }},
    ...(isAdmin ? [{ key: 'status', label: 'Status', width: 110, render: (v, row) => {
      if (v === 'deleted') {
        return <Badge variant="error">🗑️ Deleted</Badge>;
      }
      return (
        <button
          className="btn btn-sm"
          onClick={() => handleToggleStatus(row)}
          title={v === 'active' ? 'Click to mark inactive' : 'Click to mark active'}
          style={v === 'active'
            ? { background:'rgba(71,255,154,.12)', color:'var(--gym-success)', border:'1px solid rgba(71,255,154,.3)', fontWeight:600 }
            : { background:'rgba(255,193,71,.12)', color:'#ffc147', border:'1px solid rgba(255,193,71,.3)', fontWeight:600 }}
        >
          {v === 'active' ? '● Active' : '○ Inactive'}
        </button>
      );
    }}] : []),
    ...(isAdmin ? [{ key: '_actions', label: 'Actions', render: (_, row) => {
      if (row.status === 'deleted') {
        return <span className="text-xs" style={{ color:'var(--gym-muted)' }}>— locked —</span>;
      }
      return (
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => handleEditOpen(row)}>✏️ Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.equipmentId, row.equipmentName, row.status)}>🗑️</button>
        </div>
      );
    }}] : []),
    ...(isMember ? [{ key: '_tag', label: 'START / STOP', render: (_, row) => {
      const using = isUsingEquipment(row.equipmentId);
      const activeCount = getActiveCount(row.equipmentId);
      const available = Math.max(0, (row.quantity || 0) - activeCount);
      const isTagging = tagging === row.equipmentId;
      
      return (
        <div className="flex gap-2">
          <button
            className="btn btn-sm"
            style={{ 
              background: 'rgba(71,255,154,.12)', color: 'var(--gym-success)', 
              border: '1px solid rgba(71,255,154,.3)', fontWeight: 600 
            }}
            onClick={() => handleTagIn(row)}
            disabled={isTagging || using || available <= 0}
            title={using ? 'Already using' : available <= 0 ? 'No available machines' : 'Tag IN to start exercise'}
          >
            {isTagging ? '...' : '📡 IN'}
          </button>
          <button
            className="btn btn-sm"
            style={{ 
              background: 'rgba(255,71,71,.1)', color: 'var(--gym-accent2)', 
              border: '1px solid rgba(255,71,71,.3)', fontWeight: 600 
            }}
            onClick={() => handleTagOut(row)}
            disabled={isTagging || !using}
            title={!using ? 'Not currently using' : 'Tag OUT to end exercise'}
          >
            {isTagging ? '...' : '🛑 OUT'}
          </button>
        </div>
      );
    }}] : []),
  ];

  // ── LIVE TRACKING COLUMNS ──
  const liveCols = [
    { key: 'rfid_Id', label: 'RFID', width: 70, render: (v) => <span className="font-mono text-xs">#{v || '—'}</span> },
    { key: 'memberId', label: 'VID', width: 60, render: (v) => <span className="id-chip">#{v || '—'}</span> },
    { key: 'memberName', label: 'User Name', render: (v) => <span className="font-medium" style={{ color:'var(--gym-text)' }}>{v || '—'}</span> },
    { key: 'equipmentName', label: 'Equipment', render: (v) => <span style={{ color:'var(--gym-accent3)', fontWeight: 600 }}>{v || '—'}</span> },
    { key: 'elapsed_mins', label: 'Time', width: 80, render: (v) => {
      const mins = parseInt(v) || 0;
      return <span className="font-mono text-xs font-bold" style={{ color: mins > 60 ? 'var(--gym-accent2)' : 'var(--gym-success)' }}>
        {mins}m
      </span>;
    }},
    { key: '_use', label: 'USE', width: 50, render: () => <Badge variant="active">1</Badge> },
    { key: '_avail', label: 'Available', render: (_, row) => {
      const equip = data.find(e => String(e.equipmentId) === String(row.equipmentId));
      if (!equip) return '—';
      const activeCount = getActiveCount(row.equipmentId);
      const available = Math.max(0, (equip.quantity || 0) - activeCount);
      return <span style={{ color: available > 0 ? 'var(--gym-success)' : 'var(--gym-accent2)', fontWeight: 'bold' }}>{available}</span>;
    }},
    { key: 'status', label: 'Status', width: 100, render: (v) => <Badge variant={v === 'in_progress' ? 'pending' : 'active'}>{v === 'in_progress' ? '🏃 Active' : v}</Badge> },
    ...(isAdmin ? [{ key: '_adminOut', label: 'Admin OUT', width: 110, render: (_, row) => {
      const logId = row.logId || row.LogId;
      return (
        <button
          className="btn btn-danger btn-sm"
          onClick={() => handleAdminManualOut(row)}
          disabled={tagging === logId}
        >
          {tagging === logId ? 'Saving...' : 'OUT'}
        </button>
      );
    }}] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">Equipment & Live Tracking</div>
          <div className="page-sub">{visibleData.length} items · {enrichedLiveUsage.length} in use now</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={refreshLive}>↺ Refresh Live</button>
          {isAdmin && <button className="btn btn-secondary" onClick={() => setShowManualIn(true)}>+ Manual IN</button>}
          {isAdmin && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Equipment</button>}
        </div>
      </div>

      {/* Live Alert */}
      {enrichedLiveUsage.length > 0 && (
        <div className="p-3 rounded-xl flex items-center gap-3" style={{ background:'rgba(71,200,255,.08)', border:'1px solid rgba(71,200,255,.2)' }}>
          <span className="text-xl">🔴</span>
          <span className="text-sm font-medium" style={{ color:'var(--gym-accent3)' }}>
            <strong>{enrichedLiveUsage.length}</strong> member{enrichedLiveUsage.length > 1 ? 's' : ''} currently using equipment
          </span>
        </div>
      )}

      {/* My Active Sessions (member only) */}
      {isMember && mySessions.length > 0 && (
        <div className="p-4 rounded-xl space-y-2" style={{ background:'rgba(71,255,154,.06)', border:'1px solid rgba(71,255,154,.2)' }}>
          <div className="text-sm font-bold flex items-center gap-2" style={{ color:'var(--gym-success)' }}>
            🏃 Your Active Sessions ({mySessions.length})
          </div>
          {mySessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background:'var(--gym-surface2)' }}>
              <div>
                <span className="font-medium" style={{ color:'var(--gym-text)' }}>{s.equipmentName || 'Equipment'}</span>
                <span className="text-xs ml-2" style={{ color:'var(--gym-muted)' }}>Started: {s.starttime}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold" style={{ color:'var(--gym-accent)' }}>{s.elapsed_mins || 0}m</span>
                <button className="btn btn-sm" 
                  style={{ background:'rgba(255,71,71,.1)', color:'var(--gym-accent2)', border:'1px solid rgba(255,71,71,.3)' }}
                  onClick={() => handleTagOut({ equipmentId: s.equipmentId, equipmentName: s.equipmentName })}>
                  🛑 OUT
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor:'var(--gym-border)' }}>
        {[
          { id:'equipment', label:'🏋️ Equipment List' },
          { id:'live',      label:`🔴 Live Tracking (${enrichedLiveUsage.length})` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className="px-4 py-2 text-sm font-semibold"
            style={{ color: tab===id ? 'var(--gym-accent)' : 'var(--gym-muted)', borderBottom: tab===id ? '2px solid var(--gym-accent)' : '2px solid transparent', background:'transparent', marginBottom:-1 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'equipment' && (
        <div className="space-y-3">
          <div className="relative w-52">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color:'var(--gym-muted)' }}>🔍</span>
            <input className="gym-input pl-8" placeholder="Search equipment..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <DataTable columns={eqCols} data={filtered} loading={loading} rowKey="equipmentId" />
        </div>
      )}

      {tab === 'live' && (
        <div className="space-y-3">
          {enrichedLiveUsage.length === 0
            ? <div className="card p-8 text-center" style={{ color:'var(--gym-muted)' }}>
                <div className="text-4xl mb-3">🏃</div>
                <div className="text-sm">No members currently using equipment.</div>
              </div>
            : <DataTable columns={liveCols} data={enrichedLiveUsage} loading={false} rowKey="logId" />
          }
        </div>
      )}

      {/* Manual Live Tracking Modal */}
      <Modal isOpen={showManualIn} onClose={() => setShowManualIn(false)} title="MANUAL EQUIPMENT IN" maxWidth={460}>
        <div className="modal-body space-y-4">
          <FieldGroup label="Member *">
            <select className="gym-input" value={manualForm.p_member_id} onChange={(e) => setManualForm(f => ({ ...f, p_member_id: e.target.value }))}>
              <option value="">Select member...</option>
              {members.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {getMemberDisplayName(m)}
                </option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup label="Equipment *">
            <select className="gym-input" value={manualForm.p_equipment_id} onChange={(e) => setManualForm(f => ({ ...f, p_equipment_id: e.target.value }))}>
              <option value="">Select equipment...</option>
              {data.filter((e) => e.status === 'active').map((e) => (
                <option key={e.equipmentId} value={e.equipmentId}>
                  {e.equipmentName || `Equipment #${e.equipmentId}`}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowManualIn(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdminManualIn} disabled={saving}>{saving ? 'Saving...' : 'Mark IN'}</button>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="ADD EQUIPMENT" maxWidth={440}>
        <div className="modal-body space-y-4">
          <FieldGroup label="Equipment Name *">
            <input className="gym-input" value={form.p_equipment_name} onChange={(e) => setForm(f => ({ ...f, p_equipment_name: e.target.value }))} placeholder="e.g. Treadmill" />
          </FieldGroup>
          <div className="flex gap-4">
            <div className="flex-1">
              <FieldGroup label="Type">
                <input className="gym-input" value={form.p_equipment_type} onChange={(e) => setForm(f => ({ ...f, p_equipment_type: e.target.value }))} placeholder="e.g. Cardio" />
              </FieldGroup>
            </div>
            <div className="w-24">
              <FieldGroup label="Quantity *">
                <input type="number" min="1" className="gym-input" value={form.p_quantity} onChange={(e) => setForm(f => ({ ...f, p_quantity: parseInt(e.target.value) || 1 }))} />
              </FieldGroup>
            </div>
          </div>
          <FieldGroup label="Description">
            <textarea className="gym-input resize-none" rows={3} value={form.p_description} onChange={(e) => setForm(f => ({ ...f, p_description: e.target.value }))} />
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Adding...' : 'Add Equipment'}</button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="EDIT EQUIPMENT" maxWidth={440}>
        <div className="modal-body space-y-4">
          <FieldGroup label="Name">
            <input className="gym-input" value={form.p_equipment_name} onChange={(e) => setForm(f => ({ ...f, p_equipment_name: e.target.value }))} />
          </FieldGroup>
          <div className="flex gap-4">
            <div className="flex-1">
              <FieldGroup label="Type">
                <input className="gym-input" value={form.p_equipment_type} onChange={(e) => setForm(f => ({ ...f, p_equipment_type: e.target.value }))} />
              </FieldGroup>
            </div>
            <div className="w-24">
              <FieldGroup label="Quantity">
                <input type="number" min="1" className="gym-input" value={form.p_quantity} onChange={(e) => setForm(f => ({ ...f, p_quantity: parseInt(e.target.value) || 1 }))} />
              </FieldGroup>
            </div>
          </div>
          <FieldGroup label="Description">
            <textarea className="gym-input resize-none" rows={3} value={form.p_description} onChange={(e) => setForm(f => ({ ...f, p_description: e.target.value }))} />
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </Modal>
    </div>
  );
}