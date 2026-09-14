// ============================================================
//  Attendance.jsx — Member & Trainer Attendance Management
//  APIs: /Attendance/* and /TrainerAttendance/*
// ============================================================
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import { formatDateTime, formatDate } from '../utils';
import * as api from '../services/api';
import { ROLES } from '../../index';

const TABS = ['Member Attendance', 'Trainer Attendance'];

export default function Attendance() {
  const { user } = useSelector((s) => s.auth);
  const adminId  = useSelector((s) => s.ui.currentUserId);
  const isAdmin   = user?.roleName === ROLES.ADMIN;
  const isTrainer = user?.roleName === ROLES.TRAINER;

  const [tab,         setTab]         = useState(0);
  const [records,     setRecords]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [rfidInput,   setRfidInput]   = useState('');
  const [rfidMsg,     setRfidMsg]     = useState('');
  const [rfidMsgType, setRfidMsgType] = useState('info');
  const [trainerRecords, setTrainerRecords] = useState([]);
  const [trainerLoading, setTrainerLoading] = useState(false);
  const [trainerSearch,  setTrainerSearch]  = useState('');
  const [tDateFrom,  setTDateFrom]  = useState('');
  const [tDateTo,    setTDateTo]    = useState('');
  const [tCheckMsg,  setTCheckMsg]  = useState('');
  const [tMsgType,   setTMsgType]   = useState('info');

  const loadMemberAttendance = async () => {
    setLoading(true);
    try {
      let res;
      if (dateFrom && dateTo) {
        res = await api.getAttendanceByDateRange(dateFrom, dateTo);
      } else if (!isAdmin && user?.userId) {
        let actualMemberId = user.memberId;
        if (!actualMemberId) {
          const memRes = await api.getMemberByUserId(user.userId);
          const payload = memRes?.data?.ResultSet ?? memRes?.data;
          const member = Array.isArray(payload) ? payload[0] : payload;
          actualMemberId = member?.memberId;
        }
        res = await api.getMemberAttendance(actualMemberId || user.userId);
      } else {
        res = await api.getAllAttendance();
      }
      const data = res?.data?.ResultSet || res?.data || [];
      setRecords(Array.isArray(data) ? data : []);
    } catch { setRecords([]); }
    setLoading(false);
  };

  const loadTrainerAttendance = async () => {
    setTrainerLoading(true);
    try {
      let res;
      if (tDateFrom && tDateTo) {
        res = await api.getTrainerAttendanceByDateRange(tDateFrom, tDateTo);
      } else if (isTrainer && user?.userId) {
        res = await api.getTrainerAttendanceByTrainer(user.userId);
      } else {
        res = await api.getAllTrainerAttendance();
      }
      const data = res?.data?.ResultSet || res?.data || [];
      setTrainerRecords(Array.isArray(data) ? data : []);
    } catch { setTrainerRecords([]); }
    setTrainerLoading(false);
  };

  useEffect(() => { loadMemberAttendance(); }, [dateFrom, dateTo]);
  useEffect(() => { loadTrainerAttendance(); }, [tDateFrom, tDateTo]);

  // ── RFID Listener (Global Keyboard Hook) ──────────────────
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const now = Date.now();
      if (now - lastKeyTime > 100) buffer = ''; // Clear if slow typing (human)
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          handleAutoRfidScan(buffer);
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAutoRfidScan = async (tagNumber) => {
    setRfidMsg(`Scanning Tag: ${tagNumber}...`);
    setRfidMsgType('info');
    try {
      const tagRes = await api.getAllRfidTags();
      const tags = tagRes?.data?.ResultSet || [];
      const foundTag = (Array.isArray(tags) ? tags : [tags]).find(t => String(t.rfid_number).toLowerCase() === String(tagNumber).toLowerCase());
      
      if (!foundTag) {
         setRfidMsg('Tag not registered in system.');
         setRfidMsgType('error');
         setTimeout(() => setRfidMsg(''), 5000);
         return;
      }
      
      // FIX: the backend matches on the physical tag string (rfid_number),
      // not the RfidTag table's internal primary key (rfId_Id). Passing
      // rfId_Id here made every check-in/out call fail to find the tag.
      const rfidId = foundTag.rfid_number;

      // First try to find if they are already checked in to decide IN/OUT
      // For simplicity, we just trigger the check-in endpoint which handles toggle in some systems
      // OR we fetch the record. Here we use the existing handleRfidCheckIn logic
      const res = await api.checkIn(rfidId);
      const data = res?.data;
      if (data?.StatusCode === 200) {
        setRfidMsg(`SUCCESS: ${data.Result || 'Entry Recorded'}`);
        setRfidMsgType('success');
      } else {
        // Try check-out if check-in fails (already in)
        const resOut = await api.checkOut(rfidId);
        const dataOut = resOut?.data;
        setRfidMsg(dataOut?.Result || dataOut?.Message || 'Action Recorded');
        setRfidMsgType(dataOut?.StatusCode === 200 ? 'success' : 'error');
      }
      loadMemberAttendance();
      loadTrainerAttendance();
    } catch (err) {
      setRfidMsg('Scan Error: ' + err.message);
      setRfidMsgType('error');
    }
    setTimeout(() => setRfidMsg(''), 5000);
  };

  // ── RFID Manual Check-in/out ──────────────────────────────
  const handleRfidCheckIn = async () => {
    if (!rfidInput.trim()) return;
    try {
      const tagRes = await api.getAllRfidTags();
      const tags = tagRes?.data?.ResultSet || [];
      const foundTag = (Array.isArray(tags) ? tags : [tags]).find(t => String(t.rfid_number).toLowerCase() === String(rfidInput.trim()).toLowerCase() || String(t.rfId_Id) === String(rfidInput.trim()));
      
      if (!foundTag) {
         setRfidMsg('Tag not registered in system.');
         setRfidMsgType('error');
         setTimeout(() => setRfidMsg(''), 4000);
         return;
      }
      // FIX: pass the tag's rfid_number (what the backend matches on), not rfId_Id
      const res = await api.checkIn(foundTag.rfid_number);
      const data = res?.data;
      setRfidMsg(data?.Result || data?.Message || 'Check-in recorded successfully!');
      setRfidMsgType(data?.StatusCode === 200 ? 'success' : 'error');
      setRfidInput('');
      loadMemberAttendance();
    } catch { setRfidMsg('Check-in failed. Check RFID ID.'); setRfidMsgType('error'); }
    setTimeout(() => setRfidMsg(''), 4000);
  };

  const handleRfidCheckOut = async () => {
    if (!rfidInput.trim()) return;
    try {
      const tagRes = await api.getAllRfidTags();
      const tags = tagRes?.data?.ResultSet || [];
      const foundTag = (Array.isArray(tags) ? tags : [tags]).find(t => String(t.rfid_number).toLowerCase() === String(rfidInput.trim()).toLowerCase() || String(t.rfId_Id) === String(rfidInput.trim()));
      
      if (!foundTag) {
         setRfidMsg('Tag not registered in system.');
         setRfidMsgType('error');
         setTimeout(() => setRfidMsg(''), 4000);
         return;
      }
      // FIX: pass the tag's rfid_number (what the backend matches on), not rfId_Id
      const res = await api.checkOut(foundTag.rfid_number);
      const data = res?.data;
      setRfidMsg(data?.Result || data?.Message || 'Check-out recorded successfully!');
      setRfidMsgType(data?.StatusCode === 200 ? 'success' : 'error');
      setRfidInput('');
      loadMemberAttendance();
    } catch { setRfidMsg('Check-out failed. Check RFID ID.'); setRfidMsgType('error'); }
    setTimeout(() => setRfidMsg(''), 4000);
  };

  // ── Trainer Check-in/out ──────────────────────────────────
  const handleTrainerCheckIn = async () => {
    const tid = user?.trainerId || user?.userId;
    if (!tid) { setTCheckMsg('No trainer ID found.'); setTMsgType('error'); return; }
    try {
      const res = await api.trainerCheckIn(tid);
      const data = res?.data;
      setTCheckMsg(data?.Result || 'Trainer check-in recorded!');
      setTMsgType(data?.StatusCode === 200 ? 'success' : 'error');
      loadTrainerAttendance();
    } catch { setTCheckMsg('Check-in failed.'); setTMsgType('error'); }
    setTimeout(() => setTCheckMsg(''), 4000);
  };

  const handleSelfCheck = async (mode) => {
    if (!user?.userId) { alert('System Error: User ID not found in current session. Please log in again.'); return; }
    
    setLoading(true);
    try {
      // Resolve memberId/trainerId if missing in current session object
      let mid = user.memberId;
      let tid = user.trainerId;

      if (!mid && !isTrainer && !isAdmin) {
        const memRes = await api.getMemberByUserId(user.userId);
        const payload = memRes?.data?.ResultSet ?? memRes?.data;
        const member = Array.isArray(payload) ? payload[0] : payload;
        mid = member?.memberId;
      }
      if (!tid && isTrainer) {
        const trRes = await api.getTrainerByUserId(user.userId);
        const payload = trRes?.data?.ResultSet ?? trRes?.data;
        const trainer = Array.isArray(payload) ? payload[0] : payload;
        tid = trainer?.trainerId;
      }

      const searchIds = [String(user.userId)];
      if (mid) searchIds.push(String(mid));
      if (tid) searchIds.push(String(tid));
      
      // Fetch ALL tags to find the one assigned to this user
      const tagRes = await api.getAllRfidTags();
      const rs = tagRes?.data?.ResultSet;
      const tags = Array.isArray(rs) ? rs : (rs ? [rs] : []);
      
      // FIX: isActive from the backend may come through as a string ("1")
      // rather than a boolean/number, depending on how the DataAccess layer
      // mapped the reader value. A strict `=== true || === 1` check silently
      // failed for that case, so myTag was never found even for a genuinely
      // active tag — which is why IN/OUT dead-ended with no network call.
      // C#'s bool.ToString() (used in DARfidTag.cs) produces "True"/"False"
      // (capitalized), which the earlier lowercase-only check missed.
      const isActiveFlag = (v) => v === true || v === 1 || String(v).toLowerCase() === '1' || String(v).toLowerCase() === 'true';

      // Find ANY tag assigned to this user first (ignoring active status),
      // so we can tell "no tag assigned" apart from "tag assigned but inactive".
      const assignedTag = tags.find(t =>
        searchIds.includes(String(t.memberId)) || searchIds.includes(String(t.trainerId))
      );

      if (!assignedTag) {
        alert(`NO TAG ASSIGNED.\n\nSearched for IDs: ${searchIds.join(', ')}\n\nNo RFID tag in the system is linked to your account yet — ask an admin to assign one.`);
        setLoading(false); return;
      }

      if (!isActiveFlag(assignedTag.isActive)) {
        alert(`TAG FOUND BUT INACTIVE.\n\nRFID ${assignedTag.rfid_number} is assigned to you but marked inactive (isActive="${assignedTag.isActive}").\n\nAsk an admin to reactivate it.`);
        setLoading(false); return;
      }

      const myTag = assignedTag;
      
      // FIX: this is what the IN/OUT buttons call — was sending myTag.rfId_Id
      // (the RfidTag table's internal PK) instead of myTag.rfid_number (the
      // physical tag string the backend actually matches on), so check-in
      // and check-out silently failed to find the tag.
      const rfidId = myTag.rfid_number;
      const res = mode === 'in' ? await api.checkIn(rfidId) : await api.checkOut(rfidId);
      
      if (res?.data?.StatusCode === 200) {
        alert(`SUCCESS: ${mode === 'in' ? 'CHECKED IN' : 'CHECKED OUT'} ✅\nUser: ${myTag.memberName || 'You'}`);
        if (isTrainer) loadTrainerAttendance();
        else loadMemberAttendance();
      } else {
        alert('ERROR: ' + (res?.data?.Result || 'Action failed.'));
      }
    } catch (err) {
      alert('CONNECTION ERROR: ' + err.message);
    }
    setLoading(false);
  };

  const handleTrainerCheckOut = async () => {
    const tid = user?.trainerId || user?.userId;
    if (!tid) { setTCheckMsg('No trainer ID found.'); setTMsgType('error'); return; }
    try {
      const res = await api.trainerCheckOut(tid);
      const data = res?.data;
      setTCheckMsg(data?.Result || 'Trainer check-out recorded!');
      setTMsgType(data?.StatusCode === 200 ? 'success' : 'error');
      loadTrainerAttendance();
    } catch { setTCheckMsg('Check-out failed.'); setTMsgType('error'); }
    setTimeout(() => setTCheckMsg(''), 4000);
  };

  const filtered = search
    ? records.filter((r) =>
        String(r.memberId || '').includes(search) ||
        (r.memberName || r.username || '').toLowerCase().includes(search.toLowerCase()) ||
        String(r.rfidId || r.rfidNumber || '').toLowerCase().includes(search.toLowerCase())
      )
    : records;

  const filteredTrainer = trainerSearch
    ? trainerRecords.filter((r) =>
        String(r.trainerId || '').includes(trainerSearch) ||
        (r.trainerName || r.username || '').toLowerCase().includes(trainerSearch.toLowerCase())
      )
    : trainerRecords;

  const memberColumns = [
    { key: 'attendanceId', label: 'ID', width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'memberId',  label: 'Member ID', render: (v) => <span className="font-mono text-xs">{v || '—'}</span> },
    { key: 'memberName', label: 'Name', render: (v, row) => <span style={{ color: 'var(--gym-text)' }}>{v || row.username || '—'}</span> },
    { key: 'rfidId',    label: 'RFID',   render: (v, row) => <span className="font-mono text-xs" style={{ color: 'var(--gym-accent3)' }}>{v || row.rfidNumber || '—'}</span> },
    { key: 'checkInTime',  label: 'Check In',  render: (v) => <span className="text-xs">{formatDateTime(v)}</span> },
    { key: 'checkOutTime', label: 'Check Out', render: (v) => v ? <span className="text-xs">{formatDateTime(v)}</span> : <Badge variant="pending">Still In</Badge> },
    { key: 'attendanceDate', label: 'Date', render: (v, row) => <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(v || row.date)}</span> },
  ];

  const trainerColumns = [
    { key: 'attendanceId', label: 'ID', width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'trainerId', label: 'Trainer ID', render: (v) => <span className="font-mono text-xs">{v || '—'}</span> },
    { key: 'trainerName', label: 'Name', render: (v, row) => <span style={{ color: 'var(--gym-text)' }}>{v || row.username || '—'}</span> },
    { key: 'checkInTime',  label: 'Check In',  render: (v) => <span className="text-xs">{formatDateTime(v)}</span> },
    { key: 'checkOutTime', label: 'Check Out', render: (v) => v ? <span className="text-xs">{formatDateTime(v)}</span> : <Badge variant="pending">Still In</Badge> },
    { key: 'attendanceDate', label: 'Date', render: (v, row) => <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>{formatDate(v || row.date)}</span> },
  ];

  const msgColor = (t) => t === 'error' ? 'var(--gym-accent2)' : t === 'success' ? 'var(--gym-success)' : 'var(--gym-accent3)';
  const msgBg   = (t) => t === 'error' ? 'rgba(255,71,71,.08)' : t === 'success' ? 'rgba(71,255,154,.08)' : 'rgba(71,200,255,.08)';

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">Attendance</div>
          <div className="page-sub">Track member & trainer check-in/out records</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => { loadMemberAttendance(); loadTrainerAttendance(); }}>↺ Refresh</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
        {(isAdmin ? TABS : isTrainer ? ['Trainer Attendance'] : ['Member Attendance']).map((t, i) => {
          const idx = isAdmin ? i : isTrainer ? 1 : 0;
          return (
            <button key={t} onClick={() => setTab(idx)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: tab === idx ? 'var(--gym-surface)' : 'transparent', color: tab === idx ? 'var(--gym-accent)' : 'var(--gym-muted)', border: tab === idx ? '1px solid var(--gym-border2)' : '1px solid transparent' }}>
              {t}
            </button>
          );
        })}
      </div>



      {/* ── Member Attendance Tab ── */}
      {tab === 0 && (
        <div className="space-y-5">

          {/* Date Range Filter */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--gym-muted)' }}>🔍</span>
              <input className="gym-input pl-8 w-52" placeholder="Search member, RFID..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div>
              <label className="gym-label">From</label>
              <input type="date" className="gym-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="gym-label">To</label>
              <input type="date" className="gym-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            {(dateFrom || dateTo) && (
              <button className="btn btn-secondary" onClick={() => { setDateFrom(''); setDateTo(''); }}>✕ Clear</button>
            )}
            
            {/* IN and OUT Buttons for Members */}
            {!isAdmin && !isTrainer && (
              <>
                <button className="btn btn-success" onClick={() => handleSelfCheck('in')}>✓ IN</button>
                <button className="btn btn-danger" onClick={() => handleSelfCheck('out')} style={{ background: 'rgba(255,71,71,0.1)', color: 'var(--gym-accent2)', border: '1px solid rgba(255,71,71,0.3)' }}>⬡ OUT</button>
              </>
            )}

            <div className="ml-auto text-sm" style={{ color: 'var(--gym-muted)' }}>
              {filtered.length} records
            </div>
          </div>

          <DataTable columns={memberColumns} data={filtered} loading={loading} rowKey="attendanceId" />
        </div>
      )}

      {/* ── Trainer Attendance Tab ── */}
      {tab === 1 && (
        <div className="space-y-5">
          {/* Trainer self check-in */}
          {isTrainer && (
            <div className="gym-card">
              <div className="gym-card-title">My Attendance</div>
              <div className="flex flex-wrap gap-3">
                <button className="btn btn-success" onClick={() => handleSelfCheck('in')}>✓ RFID IN</button>
                <button className="btn btn-secondary" onClick={() => handleSelfCheck('out')}>⬡ RFID OUT</button>
                <div style={{ width: '1px', background: 'var(--gym-border)', margin: '0 10px' }} />
                <button className="btn btn-success" onClick={handleTrainerCheckIn}>✓ MANUAL IN</button>
                <button className="btn btn-secondary" onClick={handleTrainerCheckOut}>⬡ MANUAL OUT</button>
              </div>
              {tCheckMsg && (
                <div className="mt-3 px-4 py-2 rounded-xl text-sm" style={{ background: msgBg(tMsgType), border: `1px solid ${msgColor(tMsgType)}33`, color: msgColor(tMsgType) }}>
                  {tCheckMsg}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--gym-muted)' }}>🔍</span>
              <input className="gym-input pl-8 w-52" placeholder="Search trainer..." value={trainerSearch} onChange={(e) => setTrainerSearch(e.target.value)} />
            </div>
            <div>
              <label className="gym-label">From</label>
              <input type="date" className="gym-input" value={tDateFrom} onChange={(e) => setTDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="gym-label">To</label>
              <input type="date" className="gym-input" value={tDateTo} onChange={(e) => setTDateTo(e.target.value)} />
            </div>
            {(tDateFrom || tDateTo) && (
              <button className="btn btn-secondary" onClick={() => { setTDateFrom(''); setTDateTo(''); }}>✕ Clear</button>
            )}
            <div className="ml-auto text-sm" style={{ color: 'var(--gym-muted)' }}>
              {filteredTrainer.length} records
            </div>
          </div>

          <DataTable columns={trainerColumns} data={filteredTrainer} loading={trainerLoading} rowKey="attendanceId" />
        </div>
      )}
    </div>
  );
}