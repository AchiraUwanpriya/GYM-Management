// ============================================================
//  RFID.jsx — Full RFID Tag Management + Attendance + Checker
//  Fixes: scanner input type, RFID checker, manual IN/OUT
// ============================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchRfidTags, addRfidTag, deleteRfidTag, assignRfidToMember,
  toggleRfidStatus,
} from '../actions/rfidTagsAction';
import { fetchAttendance } from '../actions/attendanceAction';
import { fetchMembers } from '../actions/memberAction';
import { fetchTrainers } from '../actions/trainerAction';
import { fetchUsers } from '../actions/usersAction';
import { showToast } from '../actions/uiAction';
import * as rfidApi from '../services/rfidApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { formatDate, isSuccess } from '../utils';
import { ROLES } from '../../index';

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

export default function RFID() {
  const dispatch    = useDispatch();
  const adminId     = useSelector((s) => s.ui.currentUserId);
  const user        = useSelector((s) => s.auth.user);
  const rfidTags    = useSelector((s) => s.rfidTags?.data || []);
  const rfidLoading = useSelector((s) => s.rfidTags?.loading || false);
  const members     = useSelector((s) => s.members?.data || []);
  const trainers    = useSelector((s) => s.trainers?.data || []);
  const users       = useSelector((s) => s.users?.data || []);
  const attendance  = useSelector((s) => s.allAttendance?.data || []);
  const isAdmin     = user?.roleName === ROLES.ADMIN;

  // Scanner / Manual Check-in/out
  const [rfidInput,   setRfidInput]   = useState('');
  const [tapResult,   setTapResult]   = useState(null);
  const [tapping,     setTapping]     = useState(false);

  // RFID Checker
  const [checkerInput,  setCheckerInput]  = useState('');
  const [checkerResult, setCheckerResult] = useState(null);
  const [checking,      setChecking]      = useState(false);

  // Add tag modal
  const [showAdd,   setShowAdd]   = useState(false);
  const [addForm,   setAddForm]   = useState({ p_issue_date: new Date().toISOString().split('T')[0], p_is_active: 1, p_rfid_number: '' });
  const [addSaving, setAddSaving] = useState(false);

  // Assign modal
  const [showAssign,   setShowAssign]   = useState(false);
  const [assignForm,   setAssignForm]   = useState({ rfidId: '', memberId: '' });
  const [assignSaving, setAssignSaving] = useState(false);

  const [tab, setTab] = useState('tags');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchRfidTags());
    dispatch(fetchMembers());
    dispatch(fetchTrainers());
    dispatch(fetchUsers());
    dispatch(fetchAttendance());
  }, [dispatch]);

  // Resolves whatever the user typed (physical tag number OR internal DB
  // ID) down to the physical rfid_number string. GYM_ATTENDANCE_PROC's
  // check-in/check-out actions look the tag up by rfid_number (a real
  // scanner only ever knows the physical code, not our rfId_Id PK), so
  // sending the DB ID here makes that lookup fail with
  // "Invalid or inactive RFID: <id>" even when the tag is active.
  const findRfidNumber = (input) => {
    const trimmed = (input || '').trim();
    if (!trimmed) return null;
    
    // Check by number first
    const byNumber = rfidTags.find(t =>
      t.rfid_number && t.rfid_number.toLowerCase() === trimmed.toLowerCase()
    );
    if (byNumber) return byNumber.rfid_number;
    
    // Check by DB ID, but still return the physical number
    const asNum = parseInt(trimmed, 10);
    if (!isNaN(asNum) && String(asNum) === trimmed) {
      const byId = rfidTags.find(t => t.rfId_Id === asNum);
      if (byId) return byId.rfid_number;
    }
    
    return null;
  };

  // ── Manual CHECK IN ────────────────────────────────────
  const handleCheckIn = async () => {
    if (!rfidInput.trim()) return;
    setTapping(true); setTapResult(null);
    try {
      const rfidNumber = findRfidNumber(rfidInput);
      if (!rfidNumber) {
        setTapResult({ ok: false, msg: `RFID "${rfidInput}" not found. Check the number and try again.` });
        setTapping(false);
        return;
      }
      const res = await rfidApi.checkIn(rfidNumber);
      if (isSuccess(res.data)) {
        setTapResult({ ok: true, msg: '✅ CHECK IN recorded successfully!' });
        dispatch(fetchAttendance());
        dispatch(showToast('Check-in recorded!', 'success'));
      } else {
        setTapResult({ ok: false, msg: res.data?.Result || 'Check-in failed.' });
      }
    } catch (err) {
      setTapResult({ ok: false, msg: 'Network error during check-in.' });
    }
    setTapping(false);
  };

  // ── Manual CHECK OUT ───────────────────────────────────
  const handleCheckOut = async () => {
    if (!rfidInput.trim()) return;
    setTapping(true); setTapResult(null);
    try {
      const rfidNumber = findRfidNumber(rfidInput);
      if (!rfidNumber) {
        setTapResult({ ok: false, msg: `RFID "${rfidInput}" not found. Check the number and try again.` });
        setTapping(false);
        return;
      }
      const res = await rfidApi.checkOut(rfidNumber);
      if (isSuccess(res.data)) {
        setTapResult({ ok: true, msg: '✅ CHECK OUT recorded successfully!' });
        dispatch(fetchAttendance());
        dispatch(showToast('Check-out recorded!', 'success'));
      } else {
        setTapResult({ ok: false, msg: res.data?.Result || 'Check-out failed.' });
      }
    } catch (err) {
      setTapResult({ ok: false, msg: 'Network error during check-out.' });
    }
    setTapping(false);
  };

  // ── RFID Checker — lookup owner ────────────────────────
  const handleCheckRfid = async () => {
    const trimmed = (checkerInput || '').trim();
    if (!trimmed) return;
    setChecking(true); setCheckerResult(null);
    try {
      let found = null;
      // Always try backend lookup first for the freshest data (includes is_status)
      try {
        const res = await rfidApi.getRfidByNumber(trimmed);
        if (res.data?.StatusCode === 200 && res.data?.ResultSet) {
          const rs = res.data.ResultSet;
          found = Array.isArray(rs) ? rs[0] : rs;
        }
      } catch { /* backend lookup failed, try local */ }

      // Fallback to local cache
      if (!found) {
        found = rfidTags.find(t =>
          t.rfid_number && t.rfid_number.toLowerCase() === trimmed.toLowerCase()
        );
        if (!found) {
          const asNum = parseInt(trimmed, 10);
          if (!isNaN(asNum)) found = rfidTags.find(t => t.rfId_Id === asNum);
        }
      }

      if (found) {
        // If this came from the backend lookup it may already include a
        // joined memberName; otherwise (or if that's missing) resolve
        // locally from members/trainers via memberId/trainerId.
        const localOwner = getOwnerInfo(found);
        const ownerName = found.memberName || localOwner.name;
        const ownerType = found.ownerType || localOwner.type;
        setCheckerResult({
          ok: true,
          tag: found,
          ownerName,
          ownerType,
          msg: ownerName
            ? `Owner: ${ownerName} (${ownerType || 'Member'} #${found.memberId || found.trainerId})`
            : 'This RFID tag is not assigned to any member.',
        });
      } else {
        setCheckerResult({ ok: false, msg: `No RFID tag found for "${trimmed}".` });
      }
    } catch {
      setCheckerResult({ ok: false, msg: 'Error looking up RFID.' });
    }
    setChecking(false);
  };

  const handleAddTag = async () => {
    setAddSaving(true);
    const ok = await dispatch(addRfidTag(addForm, adminId));
    setAddSaving(false);
    if (ok) { setShowAdd(false); setAddForm({ p_issue_date: new Date().toISOString().split('T')[0], p_is_active: 1, p_rfid_number: '' }); }
  };

  const handleDeleteTag = (id) => {
    if (window.confirm(`Delete RFID tag #${id}?`)) dispatch(deleteRfidTag(id, adminId));
  };

  const handleOpenAssign = (tag) => {
    setAssignForm({ 
      rfidId: tag.rfId_Id, 
      memberId: tag.memberId || tag.trainerId || '', 
      isTrainer: !!tag.trainerId 
    });
    setShowAssign(true);
  };

  const handleAssign = async () => {
    if (!assignForm.memberId) return;
    setAssignSaving(true);
    try {
      const res = await rfidApi.assignRfidToMember(
        assignForm.rfidId, 
        assignForm.memberId, 
        adminId, 
        assignForm.isTrainer
      );
      if (isSuccess(res.data)) {
        dispatch(showToast(res.data?.Result || 'Assigned successfully!', 'success'));
        dispatch(fetchRfidTags());
        setShowAssign(false);
      } else {
        dispatch(showToast(res.data?.Result || 'Assignment failed.', 'error'));
      }
    } catch { dispatch(showToast('Connection error', 'error')); }
    setAssignSaving(false);
  };

  const handleToggleStatus = async (row) => {
    if (saving) return;
    setSaving(true);
    try { await dispatch(toggleRfidStatus(row.rfId_Id, adminId)); }
    finally { setSaving(false); }
  };

  // ── Resolve owner name/type from memberId/trainerId ────────
  // The backend doesn't return a joined memberName/ownerType on the
  // tag rows, so we resolve it locally from the members/trainers we
  // already have loaded, keyed off the raw memberId / trainerId.
  const getOwnerInfo = (row) => {
    if (row.trainerId) {
      const t = trainers.find((x) => String(x.trainerId) === String(row.trainerId));
      const u = t ? users.find((x) => String(x.userId) === String(t.userId)) : null;
      const name = t
        ? (t.username || `${t.firstName || u?.firstName || ''} ${t.lastName || u?.lastName || ''}`.trim() || `Trainer #${row.trainerId}`)
        : `Trainer #${row.trainerId}`;
      return { type: 'Trainer', name };
    }
    if (row.memberId) {
      const m = members.find((x) => String(x.memberId) === String(row.memberId));
      const name = m
        ? (`${m.firstName || ''} ${m.lastName || ''}`.trim() || `Member #${row.memberId}`)
        : `Member #${row.memberId}`;
      return { type: 'Member', name };
    }
    return { type: null, name: null };
  };

  const tagColumns = [
    { key: 'rfId_Id',     label: 'DB ID',    width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'rfid_number', label: 'RFID No.', render: (v) => <span className="font-mono text-xs" style={{color:'var(--gym-accent)'}}>{v || '—'}</span> },
    { key: 'issueDate', label: 'Issue Date', render: (v) => formatDate(v) },
    { key: 'isActive',  label: 'Status', render: (v, row) => {
      // status === 'deleted' is a soft-delete flag distinct from isActive
      // (toggle only flips isActive; delete sets both). Show it plainly
      // instead of letting deleted rows masquerade as "Inactive".
      if (row.status === 'deleted') return <Badge variant="inactive">Deleted</Badge>;
      return <Badge variant={v ? 'active' : 'inactive'}>{v ? 'Active' : 'Inactive'}</Badge>;
    }},
    {key: 'ownerType', label: 'Owner Type', render: (_, row) => {
      const { type } = getOwnerInfo(row);
      return <Badge variant={type === 'Trainer' ? 'info' : type === 'Member' ? 'active' : 'inactive'}>{type || 'Unassigned'}</Badge>;
    }},
    { key: 'memberName', label: 'Assigned To', render: (_, row) => {
      const { type, name } = getOwnerInfo(row);
      return name
        ? <span className="text-xs font-semibold" style={{color:'var(--gym-success)'}}>{type === 'Trainer' ? '🧑‍🏫' : '👤'} {name}</span>
        : <span className="text-xs italic" style={{color:'var(--gym-muted)'}}>Unassigned</span>;
    }},
{ key: 'isActive', label: 'Status Toggle', render: (v, row) => {
      if (row.status === 'deleted') {
        return <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>—</span>;
      }
      return isAdmin ? (
        <button className={"btn btn-sm " + (v ? "btn-danger" : "btn-secondary")}
          style={{ color: v ? 'var(--gym-accent2)' : 'var(--gym-success)' }}
          onClick={() => handleToggleStatus(row)} disabled={saving}>
          {v ? '🔴 Set Inactive' : '🟢 Set Active'}
        </button>
      ) : <Badge variant={v ? 'active' : 'inactive'}>{v ? 'Active' : 'Inactive'}</Badge>;
    }},
    ...(isAdmin ? [{
      key: '_actions', label: 'Actions', render: (_, row) => {
        if (row.status === 'deleted') {
          return <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>—</span>;
        }
        return (
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenAssign(row)}
              disabled={!!row.memberId || !!row.trainerId} title={(row.memberId || row.trainerId) ? "Tag already assigned" : "Assign to user"}>
              {(row.memberId || row.trainerId) ? 'Locked' : 'Assign'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTag(row.rfId_Id)}>Delete</button>
          </div>
        );
      }
    }] : []),
  ];

  const attColumns = [
    { key: 'attendanceId',  label: 'ID', width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'memberName', label: 'Member', render: (v, row) => {
      const m = members.find((x) => x.memberId === row.memberId);
      return <span style={{ color: 'var(--gym-text)', fontWeight: 500 }}>{v || (m ? `${m.firstName} ${m.lastName}` : `#${row.memberId}`)}</span>;
    }},
    { key: 'rfidId', label: 'RFID Tag', width: 80, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'checkInTime', label: 'Check In', render: (v) => <span className="font-mono text-xs" style={{ color: 'var(--gym-success)' }}>{v ? v.replace('T', ' ').substring(0,19) : '—'}</span> },
    { key: 'checkOutTime',label: 'Check Out', render: (v) => <span className="font-mono text-xs" style={{ color: v ? 'var(--gym-accent2)' : 'var(--gym-muted)' }}>{v ? v.replace('T', ' ').substring(0,19) : 'Still in gym'}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">RFID Management</div>
          <div className="page-sub">{rfidTags.length} tags registered · {attendance.length} attendance records</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add RFID Tag</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--gym-border)' }}>
        {[
          { id: 'tags',      label: '🏷️ RFID Tags',  count: rfidTags.length },
          { id: 'scanner',   label: '📡 Scanner / Check-in',     count: null },
          { id: 'checker',   label: '🔍 RFID Checker', count: null },
          { id: 'attendance',label: '📋 Attendance',  count: attendance.length },
        ].map(({ id, label, count }) => (
          <button key={id} onClick={() => setTab(id)}
            className="px-4 py-2 text-sm font-semibold transition-colors relative"
            style={{
              color: tab === id ? 'var(--gym-accent)' : 'var(--gym-muted)',
              borderBottom: tab === id ? '2px solid var(--gym-accent)' : '2px solid transparent',
              background: 'transparent', marginBottom: -1,
            }}>
            {label} {count !== null && <span className="id-chip ml-1">{count}</span>}
          </button>
        ))}
      </div>

      {/* RFID Tags Tab */}
      {tab === 'tags' && (
        <DataTable columns={tagColumns} data={rfidTags} loading={rfidLoading} rowKey="rfId_Id" />
      )}

      {/* Scanner Tab — Manual CHECK IN / CHECK OUT */}
      {tab === 'scanner' && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="card p-6 space-y-5">
            <div className="text-base font-semibold" style={{ color: 'var(--gym-accent)', letterSpacing: '0.05em' }}>📡 MANUAL RFID CHECK-IN / CHECK-OUT</div>
            <div className="flex items-center justify-center rounded-2xl"
              style={{ height: 140, background: 'var(--gym-surface2)',
                border: `2px dashed ${tapping ? 'var(--gym-warning)' : 'var(--gym-border2)'}`,
                transition: 'border-color 0.3s' }}>
              {tapping ? (
                <div className="text-center">
                  <div className="text-4xl mb-2 animate-pulse">📡</div>
                  <div className="text-sm" style={{ color: 'var(--gym-warning)' }}>Processing...</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-5xl mb-2">🏷️</div>
                  <div className="text-sm" style={{ color: 'var(--gym-muted)' }}>Enter RFID Number or DB ID</div>
                </div>
              )}
            </div>

            <FieldGroup label="RFID Number / Tag ID">
              <input
                className="gym-input text-center font-mono text-base tracking-widest"
                type="text"
                value={rfidInput}
                onChange={(e) => setRfidInput(e.target.value)}
                placeholder="e.g. 420132-52031 or DB ID"
                onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
              />
            </FieldGroup>

            <div className="grid grid-cols-2 gap-3">
              <button className="btn btn-primary py-3 justify-center"
                onClick={handleCheckIn} disabled={tapping || !rfidInput.trim()}
                style={{ background: 'var(--gym-success)', borderColor: 'var(--gym-success)' }}>
                {tapping ? 'Processing...' : '⬇️ CHECK IN'}
              </button>
              <button className="btn btn-primary py-3 justify-center"
                onClick={handleCheckOut} disabled={tapping || !rfidInput.trim()}
                style={{ background: 'var(--gym-accent2)', borderColor: 'var(--gym-accent2)' }}>
                {tapping ? 'Processing...' : '⬆️ CHECK OUT'}
              </button>
            </div>

            {tapResult && (
              <div className="p-4 rounded-xl flex items-center gap-3 text-sm font-medium"
                style={{
                  background: tapResult.ok ? 'rgba(71,255,154,.08)' : 'rgba(255,71,71,.08)',
                  border: `1px solid ${tapResult.ok ? 'rgba(71,255,154,.25)' : 'rgba(255,71,71,.25)'}`,
                  color: tapResult.ok ? 'var(--gym-success)' : 'var(--gym-accent2)',
                }}>
                <span className="text-2xl">{tapResult.ok ? '✅' : '❌'}</span>
                {tapResult.msg}
              </div>
            )}
          </div>

          <div className="card p-6 space-y-4">
            <div className="text-base font-semibold" style={{ color: 'var(--gym-accent3)', letterSpacing: '0.05em' }}>📖 HOW RFID WORKS</div>
            {[
              { icon: '1️⃣', title: 'Member Enters Gym', desc: 'Member taps RFID tag at the entrance scanner → Attendance check-in recorded automatically.' },
              { icon: '2️⃣', title: 'Equipment Station', desc: 'Member taps RFID at each machine (e.g. Treadmill) → Equipment usage session begins.' },
              { icon: '3️⃣', title: 'Live Tracking', desc: 'Admin/Trainer sees real-time: who is on which machine, how long, vs target time.' },
              { icon: '4️⃣', title: 'Session End', desc: 'Second tap at machine → Session ends, actual_mins logged against target_mins.' },
              { icon: '5️⃣', title: 'Exit Gym', desc: 'Member taps at exit scanner → Attendance check-out time recorded.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-3 p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
                <div>
                  <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--gym-text)' }}>{title}</div>
                  <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RFID Checker Tab — Lookup owner by RFID number */}
      {tab === 'checker' && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="card p-6 space-y-5">
            <div className="text-base font-semibold" style={{ color: 'var(--gym-warning)', letterSpacing: '0.05em' }}>🔍 RFID CHECKER — Find Owner</div>
            <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(255,179,71,.06)', border: '1px solid rgba(255,179,71,.15)', color: 'var(--gym-muted)' }}>
              Enter an RFID number to find out who it belongs to and check the tag status.
            </div>
            <FieldGroup label="RFID Number / Tag ID">
              <input className="gym-input text-center font-mono text-base tracking-widest"
                type="text" value={checkerInput}
                onChange={(e) => setCheckerInput(e.target.value)}
                placeholder="e.g. 420132-52031"
                onKeyDown={(e) => e.key === 'Enter' && handleCheckRfid()} />
            </FieldGroup>
            <button className="btn btn-primary w-full py-3 justify-center"
              onClick={handleCheckRfid} disabled={checking || !checkerInput.trim()}
              style={{ background: 'var(--gym-warning)', borderColor: 'var(--gym-warning)', color: '#000' }}>
              {checking ? 'Looking up...' : '🔍 Check RFID Owner'}
            </button>

            {checkerResult && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl text-sm font-medium"
                  style={{
                    background: checkerResult.ok ? 'rgba(71,255,154,.08)' : 'rgba(255,71,71,.08)',
                    border: `1px solid ${checkerResult.ok ? 'rgba(71,255,154,.25)' : 'rgba(255,71,71,.25)'}`,
                    color: checkerResult.ok ? 'var(--gym-success)' : 'var(--gym-accent2)',
                  }}>
                  <span className="text-xl mr-2">{checkerResult.ok ? '✅' : '❌'}</span>
                  {checkerResult.msg}
                </div>
                {checkerResult.ok && checkerResult.tag && (
                  <div className="space-y-2">
                    {[
                      ['DB ID',       `#${checkerResult.tag.rfId_Id}`],
                      ['RFID Number', checkerResult.tag.rfid_number || '—'],
                      ['Owner',       checkerResult.ownerName || 'Unassigned'],
                      ['Owner Type',  checkerResult.ownerType || '—'],
                      [checkerResult.ownerType === 'Trainer' ? 'Trainer ID' : 'Member ID',
                       (checkerResult.tag.memberId || checkerResult.tag.trainerId) ? `#${checkerResult.tag.memberId || checkerResult.tag.trainerId}` : '—'],
                      ['Active',      checkerResult.tag.isActive ? '✅ Active' : '❌ Inactive'],
                      ['Status',      checkerResult.tag.is_status || '—'],
                      ['Issue Date',  formatDate(checkerResult.tag.issueDate)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                        <span className="text-xs font-medium" style={{ color: 'var(--gym-muted)' }}>{k}</span>
                        <span className="text-sm font-semibold font-mono" style={{ color: 'var(--gym-text)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card p-6 space-y-4">
            <div className="text-base font-semibold" style={{ color: 'var(--gym-accent3)' }}>📊 RFID Stats</div>
            {[
              ['Total Tags', rfidTags.length, 'var(--gym-accent)'],
              ['Active', rfidTags.filter(t => t.isActive).length, 'var(--gym-success)'],
              ['Inactive', rfidTags.filter(t => !t.isActive).length, 'var(--gym-accent2)'],
              ['Assigned', rfidTags.filter(t => t.memberId || t.trainerId).length, 'var(--gym-warning)'],
              ['Unassigned', rfidTags.filter(t => !t.memberId && !t.trainerId).length, 'var(--gym-muted)'],
            ].map(([label, val, color]) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                <span className="text-sm" style={{ color: 'var(--gym-text2)' }}>{label}</span>
                <span className="text-lg font-bold font-mono" style={{ color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {tab === 'attendance' && (
        <DataTable columns={attColumns} data={attendance} loading={false} rowKey="attendanceId" />
      )}

      {/* Add Tag Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="ADD RFID TAG" maxWidth={400}>
        <div className="modal-body space-y-4">
          <FieldGroup label="RFID Tag Number (Physical) *">
            <input className="gym-input font-mono tracking-widest" placeholder="e.g. 420132-52031"
              value={addForm.p_rfid_number}
              onChange={(e) => setAddForm(f => ({ ...f, p_rfid_number: e.target.value.toUpperCase() }))} />
            <div className="text-xs mt-1" style={{color:'var(--gym-muted)'}}>Physical code printed on the RFID card/tag.</div>
          </FieldGroup>
          <FieldGroup label="Issue Date *">
            <input className="gym-input" type="date" value={addForm.p_issue_date}
              onChange={(e) => setAddForm(f => ({ ...f, p_issue_date: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label="Status">
            <select className="gym-input" value={addForm.p_is_active}
              onChange={(e) => setAddForm(f => ({ ...f, p_is_active: e.target.value }))}>
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddTag} disabled={addSaving}>
            {addSaving ? 'Adding...' : 'Add Tag'}
          </button>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="ASSIGN RFID TAG" maxWidth={420}>
        <div className="modal-body space-y-4">
          <div className="p-3 rounded-xl text-sm font-medium" style={{ background: 'var(--gym-surface2)', color: 'var(--gym-accent)' }}>
            🏷️ Assigning Tag ID: <strong>#{assignForm.rfidId}</strong>
          </div>
          
          <FieldGroup label="Assign To *">
            <select className="gym-input" value={assignForm.isTrainer ? 'trainer' : 'member'}
              onChange={(e) => setAssignForm(f => ({ ...f, isTrainer: e.target.value === 'trainer', memberId: '' }))}>
              <option value="member">🏋️ Member</option>
              <option value="trainer">🧑‍🏫 Trainer</option>
            </select>
          </FieldGroup>

          <FieldGroup label={assignForm.isTrainer ? "Select Trainer *" : "Select Member *"}>
            <select className="gym-input" value={assignForm.memberId}
              onChange={(e) => setAssignForm(f => ({ ...f, memberId: e.target.value }))}>
              <option value="">Select {assignForm.isTrainer ? 'trainer' : 'member'}...</option>
              {assignForm.isTrainer 
                ? trainers.map((t) => {
                    const u = users.find((x) => String(x.userId) === String(t.userId));
                    const label = t.username || `${t.firstName || u?.firstName || ''} ${t.lastName || u?.lastName || ''}`.trim() || `Trainer #${t.trainerId}`;
                    return (
                      <option key={t.trainerId} value={t.trainerId}>
                        {label} — #{t.trainerId}
                      </option>
                    );
                  })
                : members.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.firstName} {m.lastName} — #{m.memberId}
                    </option>
                  ))
              }
            </select>
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAssign(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAssign} disabled={assignSaving || !assignForm.memberId}>
            {assignSaving ? 'Assigning...' : 'Assign Tag'}
          </button>
        </div>
      </Modal>
    </div>
  );
}