// ============================================================
//  Devices.jsx — Admin Maintenance for Scanner Machines
//  Requirements: In/Out machine ID, place, type, and status
// ============================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { showToast } from '../actions/uiAction';
import * as api from '../services/api';

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

const initForm = { p_machine_id: '', p_place: '', p_device_type: 'In', p_description: '', p_status: 'active' };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeDevice = (row = {}) => ({
  ...row,
  deviceId: pick(row, 'deviceId', 'DeviceId', 'device_id', 'p_device_id'),
  machineID: pick(row, 'machineID', 'MachineID', 'machineId', 'MachineId', 'p_machine_id'),
  deviceType: pick(row, 'deviceType', 'DeviceType', 'device_type', 'p_device_type'),
  place: pick(row, 'place', 'Place', 'p_place'),
  description: pick(row, 'description', 'Description', 'p_description'),
  Is_Status: pick(row, 'Is_Status', 'is_status', 'status', 'Status', 'p_status'),
});

export default function Devices() {
  const dispatch = useDispatch();
  const adminId = useSelector((s) => s.ui.currentUserId);
  const [devices,   setDevices]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [showEdit,  setShowEdit]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(initForm);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getDevices();
      const data = res?.data?.ResultSet || res?.data || [];
      setDevices(Array.isArray(data) ? data.map(normalizeDevice) : []);
    } catch { setDevices([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.p_machine_id || !form.p_place) {
      dispatch(showToast('Machine ID and Place are required', 'error'));
      return;
    }
    setSaving(true);
    try {
      const res = await api.addDevice(form, adminId);
      if (res.data?.StatusCode === 200) {
        dispatch(showToast('Device added successfully', 'success'));
        load(); setShowAdd(false); setForm(initForm);
      } else { dispatch(showToast(res.data?.Result || 'Add failed', 'error')); }
    } catch { dispatch(showToast('Connection error', 'error')); }
    setSaving(false);
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      const res = await api.editDevice({ ...form, p_device_id: editId }, adminId);
      if (res.data?.StatusCode === 200) {
        dispatch(showToast('Device updated successfully', 'success'));
        load(); setShowEdit(false);
      } else { dispatch(showToast(res.data?.Result || 'Update failed', 'error')); }
    } catch { dispatch(showToast('Connection error', 'error')); }
    setSaving(false);
  };

  const openEdit = (row) => {
    setEditId(row.deviceId);
    setForm({
      p_machine_id:  row.machineID || '',
      p_place:       row.place || '',
      p_device_type: row.deviceType || 'In',
      p_description: row.description || '',
      p_status:      row.Is_Status || 'active',
    });
    setShowEdit(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete device #${id}?`)) return;
    try {
      const res = await api.deleteDevice(id, adminId);
      if (res.data?.StatusCode === 200) {
        dispatch(showToast('Device deleted', 'success'));
        load();
      } else { dispatch(showToast(res.data?.Result || 'Delete failed', 'error')); }
    } catch { dispatch(showToast('Connection error', 'error')); }
  };

  const filtered = search
    ? devices.filter((d) =>
        (d.machineID || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.place || '').toLowerCase().includes(search.toLowerCase())
      )
    : devices;

  const columns = [
    { key: 'deviceId',    label: 'ID',       width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'machineID',   label: 'Machine ID',render: (v) => <span className="font-mono font-bold" style={{ color: 'var(--gym-accent3)' }}>{v || '—'}</span> },
    { key: 'deviceType',  label: 'Direction',render: (v) => <Badge variant={v === 'In' ? 'active' : 'info'}>{v === 'In' ? '📥 ENTRY' : '📤 EXIT'}</Badge> },
    { key: 'place',       label: 'Placement',render: (v) => <span className="font-medium">{v || '—'}</span> },
    { key: 'description', label: 'Notes',     render: (v) => <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>{v || '—'}</span> },
    { key: 'Is_Status',   label: 'Status',    render: (v) => <Badge variant={v === 'active' ? 'active' : 'inactive'}>{v || 'active'}</Badge> },
{ key: '_actions',    label: 'Actions',   render: (_, row) => (
      row.Is_Status === 'deleted' ? (
        <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>—</span>
      ) : (
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.deviceId)}>🗑️</button>
        </div>
      )
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">Scanner Maintenance</div>
          <div className="page-sub">Configure entry/exit RFID scanners for the facility</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Scanner</button>
      </div>

      <div className="relative w-56">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--gym-muted)' }}>🔍</span>
        <input className="gym-input pl-8" placeholder="Search machine ID or place…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} rowKey="deviceId" />

      {/* ADD */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="REGISTER SCANNER" maxWidth={460}>
        <div className="modal-body space-y-4">
          <FieldGroup label="Machine ID *">
            <input className="gym-input font-mono" value={form.p_machine_id} onChange={(e) => setForm(f => ({ ...f, p_machine_id: e.target.value }))} placeholder="e.g. SN-992-IN" />
          </FieldGroup>
          <FieldGroup label="Scanner Direction">
            <select className="gym-input" value={form.p_device_type} onChange={(e) => setForm(f => ({ ...f, p_device_type: e.target.value }))}>
              <option value="In">Entry Scanner (Check-In)</option>
              <option value="Out">Exit Scanner (Check-Out)</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Installation Place *">
            <input className="gym-input" value={form.p_place} onChange={(e) => setForm(f => ({ ...f, p_place: e.target.value }))} placeholder="e.g. Main Lobby Gate 1" />
          </FieldGroup>
          <FieldGroup label="Maintenance Notes">
            <textarea className="gym-input resize-none" rows={2} value={form.p_description} onChange={(e) => setForm(f => ({ ...f, p_description: e.target.value }))} />
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Registering…' : 'Register Device'}</button>
        </div>
      </Modal>

      {/* EDIT */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="EDIT SCANNER CONFIG" maxWidth={460}>
        <div className="modal-body space-y-4">
          <FieldGroup label="Machine ID">
            <input className="gym-input font-mono" value={form.p_machine_id} onChange={(e) => setForm(f => ({ ...f, p_machine_id: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label="Scanner Direction">
            <select className="gym-input" value={form.p_device_type} onChange={(e) => setForm(f => ({ ...f, p_device_type: e.target.value }))}>
              <option value="In">Entry Scanner (Check-In)</option>
              <option value="Out">Exit Scanner (Check-Out)</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Installation Place">
            <input className="gym-input" value={form.p_place} onChange={(e) => setForm(f => ({ ...f, p_place: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label="Status">
            <select className="gym-input" value={form.p_status} onChange={(e) => setForm(f => ({ ...f, p_status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Under Maintenance</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Notes">
            <textarea className="gym-input resize-none" rows={2} value={form.p_description} onChange={(e) => setForm(f => ({ ...f, p_description: e.target.value }))} />
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </Modal>
    </div>
  );
}
