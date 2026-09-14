// ============================================================
//  Users.jsx — Admin user management
//  FIXES:
//    1. Delete button now visible for all non-pending users
//       (was restricted to 'active'|'approved' only — missed
//        'inactive', 'rejected', 'suspended' users)
//    2. Status dropdown options now include all valid statuses:
//       active | approved | inactive | pending | rejected | suspended
//    3. Gmail-only email validation (@gmail.com) with real-time
//       inline error message in Add User modal
//    4. formatDate imported from utils (was used but not imported)
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, editUserAction, deleteUser } from '../actions/usersAction';
import { showToast } from '../actions/uiAction';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { getErrorMsg, getImgUrl, isSuccess, formatDate, formatDateTime } from '../utils';
import * as api from '../services/api';
import { approveUser as approveUserRequest, changeUserStatus as changeUserStatusRequest } from '../services/userApi';
import { PHONE_ERROR_MESSAGE, getPhoneError, normalizePhoneInput } from '../utils/phoneValidation';

const ROLE_LABELS = { 1: 'Admin', 2: 'Trainer', 3: 'Member' };
const ROLE_COLORS = { 1: 'var(--gym-accent)', 2: 'var(--gym-accent3)', 3: 'var(--gym-success)' };
const MAX_BYTES   = 5 * 1024 * 1024; // 5 MB

// ── Gmail validation helpers ──────────────────────────────────
// Requirement: email must end with @gmail.com (case-insensitive)
const GMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i;

const getEmailError = (email) => {
  if (!email || !email.trim()) return '';
  if (!GMAIL_REGEX.test(email.trim())) return 'Only @gmail.com addresses are accepted.';
  return '';
};

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

const initEdit = {
  p_user_id: '', p_email: '', p_phone: '',
  p_first_name: '', p_last_name: '',
  p_gender: '', p_role_id: '3', p_status: 'active',
  p_image_path: '',
};

const initAdd = {
  email: '', phone: '', firstName: '', lastName: '',
  gender: '', password: '', role_id: '3',
};

export default function Users() {
  const dispatch = useDispatch();
  const { data, loading } = useSelector((s) => s.users);
  const adminId = useSelector((s) => s.ui.currentUserId);

  const [showEdit,   setShowEdit]   = useState(false);
  const [showCard,   setShowCard]   = useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [cardData,   setCardData]   = useState(null);
  const [editForm,   setEditForm]   = useState(initEdit);
  const [addForm,    setAddForm]    = useState(initAdd);
  const [saving,     setSaving]     = useState(false);
  const [addSaving,  setAddSaving]  = useState(false);
  const [addError,   setAddError]   = useState('');
  const [addFieldErrors, setAddFieldErrors] = useState({});
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statFilter, setStatFilter] = useState('all');
  const [showAddPass,setShowAddPass]= useState(false);
  const [statusBusyId, setStatusBusyId] = useState(null);
  const [statusErrors, setStatusErrors] = useState({});
  const [zoomImage, setZoomImage] = useState(null);

  // ── Add modal image state ──────────────────────────────────
  const [addImagePreview,   setAddImagePreview]   = useState('');
  const [addImagePath,      setAddImagePath]      = useState('');
  const [addImageError,     setAddImageError]     = useState('');
  const [addImageUploading, setAddImageUploading] = useState(false);
  const [editImagePreview,   setEditImagePreview]   = useState('');
  const [editImagePath,      setEditImagePath]      = useState('');
  const [editImageError,     setEditImageError]     = useState('');
  const [editImageUploading, setEditImageUploading] = useState(false);
  const addFileRef = useRef(null);
  const editFileRef = useRef(null);

  useEffect(() => { dispatch(fetchUsers()); }, [dispatch]);

  const setAddFieldError = (field, message) => {
    setAddFieldErrors((current) => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const handleChange    = (e) => {
    const { name, value } = e.target;
    let filtered = value;
    if (name === 'p_first_name' || name === 'p_last_name') {
      filtered = value.replace(/[^a-zA-Z\s\-\']/g, '');
    }
    setEditForm((f) => ({ ...f, [name]: filtered }));
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    let filtered = value;

    if (name === 'firstName' || name === 'lastName') {
      filtered = value.replace(/[^a-zA-Z\s\-\']/g, '');
      setAddFieldError(name, filtered !== value ? 'Name must not contain numbers.' : '');
    }
    if (name === 'phone') {
      filtered = normalizePhoneInput(value);
      setAddFieldError('phone', getPhoneError(filtered));
    }
    // ── Real-time Gmail validation ─────────────────────────
    if (name === 'email') {
      setAddFieldError('email', getEmailError(value));
    }

    setAddError('');
    if (name !== 'firstName' && name !== 'lastName' && name !== 'phone' && name !== 'email') {
      setAddFieldError(name, '');
    }
    setAddForm((f) => ({ ...f, [name]: filtered }));
  };

  const handleNameKeyDown = (e) => {
    if (/\d/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleNamePaste = (field, e, isEdit = false) => {
    const pasted = e.clipboardData.getData('text') || '';
    const sanitized = pasted.replace(/\d/g, '');
    if (sanitized !== pasted) {
      e.preventDefault();
      const target = e.target;
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const nextValue = `${target.value.slice(0, start)}${sanitized}${target.value.slice(end)}`;
      if (isEdit) {
        setEditForm((current) => ({ ...current, [field]: nextValue }));
      } else {
        setAddForm((current) => ({ ...current, [field]: nextValue }));
        setAddFieldError(field, 'Name must not contain numbers.');
      }
    }
  };

  const validateImageFile = (file) => {
    if (!file) return 'No file selected.';
    if (file.size > MAX_BYTES) return `Max ${MAX_BYTES / 1024 / 1024} MB.`;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) return 'JPG, PNG or WebP only.';
    return '';
  };

  const setImagePreview = (file, setter) => {
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result || '');
    reader.readAsDataURL(file);
  };

  // ── Add modal image handlers ───────────────────────────────
  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddImageError('');
    const validationError = validateImageFile(file);
    if (validationError) { setAddImageError(validationError); addFileRef.current.value=''; return; }
    setImagePreview(file, setAddImagePreview);
    setAddImageUploading(true);
    try {
      const res  = await api.uploadUserImage(file);
      const d    = res.data;
      if (d?.StatusCode === 200) { setAddImagePath(d.imagePath); }
      else { setAddImageError(d?.Result || 'Upload failed.'); setAddImagePreview(''); }
    } catch { setAddImageError('Upload failed.'); setAddImagePreview(''); }
    setAddImageUploading(false);
  };

  const removeAddImage = () => {
    setAddImagePreview(''); setAddImagePath(''); setAddImageError('');
    if (addFileRef.current) addFileRef.current.value = '';
  };

  const handleEditImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageError('');
    const validationError = validateImageFile(file);
    if (validationError) { setEditImageError(validationError); editFileRef.current.value=''; return; }
    setImagePreview(file, setEditImagePreview);
    setEditImageUploading(true);
    try {
      const res = await api.uploadUserImage(file);
      const d = res.data;
      if (d?.StatusCode === 200 && d.imagePath) {
        setEditImagePath(d.imagePath);
        setEditForm((f) => ({ ...f, p_image_path: d.imagePath }));
      } else {
        setEditImageError(d?.Result || 'Upload failed.');
      }
    } catch {
      setEditImageError('Upload failed.');
    }
    setEditImageUploading(false);
  };

  const removeEditImage = () => {
    setEditImagePreview('');
    setEditImagePath('');
    setEditImageError('');
    setEditForm((f) => ({ ...f, p_image_path: '' }));
    if (editFileRef.current) editFileRef.current.value = '';
  };

  // ── Edit open ──────────────────────────────────────────────
  const handleEditOpen = (row) => {
    const existingImagePath = row.profile_image || '';
    setEditForm({
      p_user_id:    row.userId,
      p_email:      row.email      || '',
      p_phone:      row.phone      || '',
      p_first_name: row.firstName  || '',
      p_last_name:  row.lastName   || '',
      p_gender:     row.gender     || '',
      p_role_id:    String(row.roleId || 3),
      p_status:     row.status     || 'active',
      p_image_path: existingImagePath,
    });
    setEditImagePath(existingImagePath);
    setEditImagePreview(existingImagePath ? getImgUrl(existingImagePath) : '');
    setEditImageError('');
    if (editFileRef.current) editFileRef.current.value = '';
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    setSaving(true);
    const ok = await dispatch(editUserAction(editForm, adminId));
    setSaving(false);
    if (ok) setShowEdit(false);
  };

  // Soft-delete: dispatches deleteUser which calls POST /User/Delete
  // The PROC (action '005') now does UPDATE status='deleted' instead of hard DELETE.
  const handleDelete = (id, name) => {
    if (window.confirm(`Soft-delete "${name}"?\n\nThis sets their status to "Deleted" and locks the account.\nThe record is NOT removed from the database.`))
      dispatch(deleteUser(id, adminId));
  };

  // Approve = set to "active", Reject = set to "rejected"
  const updateUserStatus = async (row, nextStatus) => {
    setStatusBusyId(row.userId);
    setStatusErrors((current) => ({ ...current, [row.userId]: '' }));
    try {
      const isPending = (row.status || '').toLowerCase() === 'pending';
      const res = isPending
        ? await approveUserRequest(
            row.userId,
            adminId,
            nextStatus,
            row.roleId,
            row.firstName || '',
            row.lastName || ''
          )
        : await changeUserStatusRequest(
            row.userId,
            adminId,
            nextStatus
          );

      if (isSuccess(res.data)) {
        dispatch(showToast(`User ${nextStatus}`, 'success'));
        await dispatch(fetchUsers());
      } else {
        const message = getErrorMsg(res.data);
        setStatusErrors((current) => ({ ...current, [row.userId]: message }));
        dispatch(showToast(message, 'error'));
      }
    } catch {
      const message = 'Failed to update user status';
      setStatusErrors((current) => ({ ...current, [row.userId]: message }));
      dispatch(showToast(message, 'error'));
    }
    setStatusBusyId(null);
  };

  const handleApprove = (row) => updateUserStatus(row, 'active');
  const handleReject  = (row) => updateUserStatus(row, 'rejected');

  // ── Add User submit ────────────────────────────────────────
  const handleAddUser = async () => {
    const { email, phone, firstName, lastName, gender, password, role_id } = addForm;
    if (!firstName.trim()) { setAddError('First name is required.'); return; }
    if (!lastName.trim())  { setAddError('Last name is required.'); return; }
    if (!email.trim())     { setAddError('Email is required.'); return; }

    // Gmail validation
    const emailErr = getEmailError(email);
    if (emailErr) { setAddFieldError('email', emailErr); setAddError(emailErr); return; }

    if (!gender)           { setAddError('Please select gender.'); return; }
    if (!password)         { setAddError('Password is required.'); return; }
    if (password.length < 6) { setAddError('Password must be at least 6 characters.'); return; }

    const nameRegex = /^[a-zA-Z\s\-\']+$/;
    if (!nameRegex.test(firstName.trim())) { setAddError('First name can only contain letters, spaces, hyphens, and apostrophes.'); return; }
    if (!nameRegex.test(lastName.trim())) { setAddError('Last name can only contain letters, spaces, hyphens, and apostrophes.'); return; }

    const phoneError = getPhoneError(phone);
    if (phoneError) {
      setAddFieldError('phone', phoneError);
      setAddError(PHONE_ERROR_MESSAGE);
      return;
    }

    setAddSaving(true); setAddError('');
    try {
  const emailCheck = await api.checkUserExists(email.trim());
  if (emailCheck?.data?.StatusCode === 200 && emailCheck?.data?.ResultSet) {
    setAddFieldError('email', 'This email is already registered.');
    setAddError('This email is already registered.');
    setAddSaving(false);
    return;
  }
  const phoneCheck = phone.trim() ? await api.checkUserExists(phone.trim()) : null;
  if (phoneCheck?.data?.StatusCode === 200 && phoneCheck?.data?.ResultSet) {
    setAddFieldError('phone', 'This phone number is already registered.');
    setAddError('This phone number is already registered.');
    setAddSaving(false);
    return;
  }
} catch { /* fall through — backend still validates */ }
    try {
      const res  = await api.registerUser({
        p_first_name:    firstName.trim(),
        p_last_name:     lastName.trim(),
        p_email:         email.trim(),
        p_phone:         phone.trim() || '',
        p_gender:        gender,
        p_password_hash: password,
        p_role_id:       parseInt(role_id, 10),
        p_image_path:    addImagePath || '',
      });
      const d = res.data;
      if (d?.StatusCode === 200 || d?.StatusCode === 201) {
        dispatch({ type:'SHOW_TOAST', payload:{ message:'User created!', type:'success', id:Date.now() } });
        dispatch(fetchUsers());
        setShowAdd(false);
        setAddForm(initAdd);
        setAddFieldErrors({});
        removeAddImage();
      } else {
        setAddError(d?.Result || d?.Message || 'Failed to create user.');
      }
    } catch { setAddError('Could not connect to server.'); }
    setAddSaving(false);
  };

  const openAddModal = () => {
    setAddForm(initAdd); setAddError(''); setAddFieldErrors({}); removeAddImage(); setShowAdd(true);
  };

  // ── Avatar helper ──────────────────────────────────────────
  const Avatar = ({ row, size = 8 }) => {
    const color = ROLE_COLORS[row.roleId] || 'var(--gym-accent)';
    const initials = ((row.firstName || row.username || '?').charAt(0)).toUpperCase();
    if (row.profile_image) {
      return (
        <img src={getImgUrl(row.profile_image)} alt={initials}
             className={`w-${size} h-${size} rounded-lg object-cover flex-shrink-0`} />
      );
    }
    return (
      <div className={`w-${size} h-${size} rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0`}
           style={{ background: color+'22', color }}>
        {initials}
      </div>
    );
  };

  // ── Filters ────────────────────────────────────────────────
  let filtered = data;
  if (search) filtered = filtered.filter((u) =>
    (u.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.lastName  || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email     || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username  || '').toLowerCase().includes(search.toLowerCase())
  );
  if (roleFilter !== 'all') filtered = filtered.filter((u) => String(u.roleId) === roleFilter);
  if (statFilter !== 'all') filtered = filtered.filter((u) => (u.status||'').toLowerCase() === statFilter);

  const pendingCount = data.filter((u) => (u.status||'').toLowerCase() === 'pending').length;

  // Each status gets its OWN distinct colour — not grouped together.
  // active    = green  | approved  = teal  | pending   = amber
  // inactive  = red    | rejected  = purple| suspended = orange
  // deleted   = grey
  const statusVariant = (s='') => {
    switch ((s||'').toLowerCase()) {
      case 'active':    return 'active';
      case 'approved':  return 'approved';
      case 'pending':   return 'pending';
      case 'inactive':  return 'inactive';
      case 'rejected':  return 'rejected';
      case 'suspended': return 'suspended';
      case 'deleted':   return 'deleted';
      default:          return 'info';
    }
  };

  const columns = [
    { key:'userId', label:'ID', width:60, render:(v) => <span className="id-chip">#{v}</span> },
    { key:'firstName', label:'Name', render:(v, row) => (
      // Clicking anywhere on this cell opens the profile card modal.
      // The avatar itself also supports zoom — click the avatar inside
      // the card modal to zoom the image (avoids z-index conflict with
      // the table row lightbox that was causing the black-screen bug).
      <button
        className="flex items-center gap-2 text-left"
        onClick={() => { setCardData(row); setShowCard(true); }}
        style={{ background:'none', border:'none', cursor:'pointer' }}
      >
        <div className="flex-shrink-0">
          <Avatar row={row} size={8} />
        </div>
        <div>
          <div className="font-medium text-sm" style={{ color:'var(--gym-text)' }}>
            {row.firstName || ''} {row.lastName || ''}
          </div>
          <div className="text-xs" style={{ color:'var(--gym-muted)' }}>@{row.username}</div>
        </div>
      </button>
    )},
    { key:'email',  label:'Email', render:(v) => <span className="text-xs" style={{ color:'var(--gym-muted)' }}>{v}</span> },
    { key:'phone',  label:'Phone', render:(v) => v || '—' },
    { key:'gender', label:'Gender', render:(v) => v ? (
      <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background:v==='Male'?'rgba(71,147,255,.12)':'rgba(255,71,200,.12)',
                     color:v==='Male'?'#4793ff':'#ff47c8' }}>
        {v==='Male'?'♂':'♀'} {v}
      </span>
    ) : '—' },
    { key:'roleId', label:'Role', render:(v) => (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background:(ROLE_COLORS[v]||'var(--gym-muted)')+'22', color:ROLE_COLORS[v]||'var(--gym-muted)' }}>
        {ROLE_LABELS[v]||'Unknown'}
      </span>
    )},
    { key:'status', label:'Status', render:(v, row) => (
      <div className="space-y-1">
        <Badge variant={statusVariant(v)}>{v||'active'}</Badge>
        {statusErrors[row.userId] && (
          <div className="text-[11px]" style={{ color:'var(--gym-accent2)' }}>{statusErrors[row.userId]}</div>
        )}
      </div>
    )},
    // FIX: replaced custom inline formatter (caused "NaN undefined NaN, 12:NaN AM")
    // with the shared formatDateTime utility which handles all C# date string formats.
    { key:'created_date', label:'Joined', render:(v) =>
      <span className="text-xs" style={{ color:'var(--gym-muted)' }}>{formatDateTime(v) || '—'}</span>
    },
    { key:'_actions', label:'Actions', render:(_, row) => {
      const st = (row.status||'').toLowerCase();
      const busy = statusBusyId === row.userId;
      return (
        <div className="flex gap-1 flex-wrap">
          {st === 'pending' && <>
            <button className="btn btn-secondary btn-sm flex items-center gap-1" style={{ color:'var(--gym-success)' }}
                    disabled={busy}
                    onClick={() => handleApprove(row)}>
              {busy ? 'Saving...' : (
                <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Approve</>
              )}
            </button>
            <button className="btn btn-danger btn-sm flex items-center gap-1"
                    disabled={busy}
                    onClick={() => handleReject(row)}>
              {busy ? 'Saving...' : (
                <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Reject</>
              )}
            </button>
          </>}

          {/* Status dropdown — only statuses valid for [User] table CHK constraint.
               'deleted' is NOT in this dropdown because it is set exclusively
               by the Delete button (soft-delete), not by manual status change.
               'approved' is also excluded: User.status CHECK = active|inactive|
               pending|rejected|suspended — 'approved' belongs to Member/Trainer only. */}
          <select className="gym-input text-xs py-1 px-2" style={{ width:120 }}
                  value={row.status||'active'}
                  disabled={busy || (row.status||'').toLowerCase() === 'deleted'}
                  onChange={(e) => updateUserStatus(row, e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            {/* Show 'deleted' only as a disabled read-only option when already deleted */}
            {(row.status||'').toLowerCase() === 'deleted' && (
              <option value="deleted" disabled>Deleted</option>
            )}
          </select>

          <button className="btn btn-secondary btn-sm flex items-center gap-1" onClick={() => handleEditOpen(row)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Edit
          </button>

          {/* Delete button — triggers SOFT delete (status → 'deleted').
               Hidden if the user is already deleted.
               The delete icon is the ONLY way to set 'deleted' status. */}
          {st !== 'deleted' && (
            <button className="btn btn-danger btn-sm flex items-center justify-center p-1.5"
                    title="Soft-delete user (sets status to Deleted)"
                    onClick={() => handleDelete(row.userId, row.firstName||row.username)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          )}
        </div>
      );
    }},
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Users</div>
          <div className="page-sub">
            {data.length} users registered
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background:'rgba(255,179,71,.15)', color:'var(--gym-warning)' }}>
                ⏳ {pendingCount} pending approval
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={openAddModal}
                  style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add User
          </button>
          <button className="btn btn-secondary" onClick={() => dispatch(fetchUsers())}>↺ Refresh</button>
        </div>
      </div>

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-xl flex items-center gap-3"
             style={{ background:'rgba(255,179,71,.08)', border:'1px solid rgba(255,179,71,.2)' }}>
          <span className="text-2xl">⏳</span>
          <div>
            <div className="font-semibold text-sm" style={{ color:'var(--gym-warning)' }}>
              {pendingCount} user{pendingCount>1?'s':''} waiting for approval
            </div>
            <div className="text-xs mt-0.5" style={{ color:'var(--gym-muted)' }}>
              Filter by "Pending" status to review and approve/reject registrations.
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color:'var(--gym-muted)' }}>🔍</span>
          <input className="gym-input pl-8 w-52"
                 placeholder="Search name, email..."
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="gym-input w-32" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="1">Admin</option>
          <option value="2">Trainer</option>
          <option value="3">Member</option>
        </select>
        <select className="gym-input w-36" value={statFilter} onChange={(e) => setStatFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} rowKey="userId" />

      {/* ── Add User Modal ── */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="+ ADD USER" maxWidth={500}>
        <div className="modal-body space-y-4">

          {/* Profile image */}
          <div>
            <label className="gym-label">Profile Photo <span style={{ color:'var(--gym-muted)' }}>(optional, max 5 MB)</span></label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                   style={{ background:'var(--gym-surface2)', border:'2px dashed var(--gym-border)', cursor:'pointer' }}
                   onClick={() => !addImageUploading && addFileRef.current?.click()}>
                {addImagePreview
                  ? <img src={addImagePreview} alt="preview" className="w-full h-full object-cover" />
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20" style={{ color:'var(--gym-muted)' }}>
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>}
              </div>
              <div>
                <input ref={addFileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleAddImage} />
                {!addImagePreview
                  ? <button type="button" className="btn btn-secondary text-sm"
                             onClick={() => addFileRef.current?.click()} disabled={addImageUploading}>
                      {addImageUploading ? 'Uploading…' : '📷 Choose'}
                    </button>
                  : <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: addImageUploading?'var(--gym-muted)':'var(--gym-success)' }}>
                        {addImageUploading?'⏳ Uploading…':'✓ Ready'}
                      </span>
                      <button type="button" className="btn btn-danger btn-sm text-xs" onClick={removeAddImage}>✕</button>
                    </div>}
                <p className="text-xs mt-1" style={{ color:'var(--gym-muted)' }}>JPG, PNG or WebP · max 5 MB</p>
              </div>
            </div>
            {addImageError && <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>⚠ {addImageError}</p>}
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="First Name *">
              <input
                className="gym-input"
                name="firstName"
                value={addForm.firstName}
                onChange={handleAddChange}
                onKeyDown={handleNameKeyDown}
                onPaste={(e) => handleNamePaste('firstName', e)}
                placeholder="First name"
              />
              {addFieldErrors.firstName && (
                <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>{addFieldErrors.firstName}</p>
              )}
            </FieldGroup>
            <FieldGroup label="Last Name *">
              <input
                className="gym-input"
                name="lastName"
                value={addForm.lastName}
                onChange={handleAddChange}
                onKeyDown={handleNameKeyDown}
                onPaste={(e) => handleNamePaste('lastName', e)}
                placeholder="Last name"
              />
              {addFieldErrors.lastName && (
                <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>{addFieldErrors.lastName}</p>
              )}
            </FieldGroup>
          </div>

          {/* Gender */}
          <FieldGroup label="Gender *">
            <div className="flex gap-3">
              {['Male','Female'].map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer flex-1 px-3 py-2 rounded-xl transition-all"
                       style={{ border:`1px solid ${addForm.gender===g?'var(--gym-accent)':'var(--gym-border)'}`,
                                background: addForm.gender===g?'rgba(232,255,71,.08)':'var(--gym-surface)' }}>
                  <input type="radio" name="gender" value={g} checked={addForm.gender===g} onChange={handleAddChange} className="hidden" />
                  <span style={{ fontSize:14 }}>{g==='Male'?'♂':'♀'}</span>
                  <span className="text-sm" style={{ color:addForm.gender===g?'var(--gym-accent)':'var(--gym-text)' }}>{g}</span>
                </label>
              ))}
            </div>
          </FieldGroup>

          {/* Email — Gmail only with real-time validation */}
          <FieldGroup label="Email * (Gmail only)">
            <input
              className="gym-input"
              name="email"
              type="email"
              value={addForm.email}
              onChange={handleAddChange}
              placeholder="yourname@gmail.com"
              style={addFieldErrors.email ? { borderColor:'var(--gym-accent2)' } : {}}
            />
            {addFieldErrors.email
              ? <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>⚠ {addFieldErrors.email}</p>
              : addForm.email && GMAIL_REGEX.test(addForm.email.trim())
                ? <p className="text-xs mt-1" style={{ color:'var(--gym-success)' }}>✓ Valid Gmail address</p>
                : <p className="text-xs mt-1" style={{ color:'var(--gym-muted)' }}>Must end with @gmail.com</p>
            }
          </FieldGroup>

          {/* Phone */}
          <FieldGroup label="Phone">
            <input className="gym-input" name="phone" type="tel"
                   value={addForm.phone}
                   onChange={handleAddChange}
                   placeholder="0771234567 or +94771234567" />
            {addFieldErrors.phone && (
              <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>{addFieldErrors.phone}</p>
            )}
          </FieldGroup>

          {/* Password */}
          <FieldGroup label="Password *">
            <div className="relative">
              <input className="gym-input pr-10" name="password"
                     type={showAddPass?'text':'password'}
                     value={addForm.password} onChange={handleAddChange}
                     placeholder="Min. 6 characters" />
              <button type="button" onClick={() => setShowAddPass((p)=>!p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ background:'none',border:'none',color:'var(--gym-muted)',cursor:'pointer' }}>
                {showAddPass
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </FieldGroup>

          {/* Role */}
          <FieldGroup label="Role">
            <select className="gym-input" name="role_id" value={addForm.role_id} onChange={handleAddChange}>
              <option value="1">Admin</option>
              <option value="2">Trainer</option>
              <option value="3">Member</option>
            </select>
          </FieldGroup>

          {addError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                 style={{ background:'rgba(255,71,71,.08)',border:'1px solid rgba(255,71,71,.22)',color:'var(--gym-accent2)' }}>
              <span>⚠</span> {addError}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddUser} disabled={addSaving||addImageUploading}>
            {addSaving ? 'Creating…' : '+ Create User'}
          </button>
        </div>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="EDIT USER" maxWidth={460}>
        <div className="modal-body space-y-4">
          <div>
            <label className="gym-label">Profile Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                   style={{ background:'var(--gym-surface2)', border:'2px dashed var(--gym-border)', cursor:'pointer' }}
                   onClick={() => !editImageUploading && editFileRef.current?.click()}>
                {editImagePreview
                  ? <img src={editImagePreview} alt="preview" className="w-full h-full object-cover" />
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20" style={{ color:'var(--gym-muted)' }}>
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>}
              </div>
              <div>
                <input ref={editFileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleEditImage} />
                {!editImagePreview
                  ? <button type="button" className="btn btn-secondary text-sm"
                             onClick={() => editFileRef.current?.click()} disabled={editImageUploading}>
                      {editImageUploading ? 'Uploading...' : 'Choose Photo'}
                    </button>
                  : <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: editImageUploading ? 'var(--gym-muted)' : 'var(--gym-success)' }}>
                        {editImageUploading ? 'Uploading...' : 'Ready'}
                      </span>
                      <button type="button" className="btn btn-danger btn-sm text-xs" onClick={removeEditImage}>Remove</button>
                    </div>}
                <p className="text-xs mt-1" style={{ color:'var(--gym-muted)' }}>JPG, PNG or WebP · max 5 MB</p>
              </div>
            </div>
            {editImageError && <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>{editImageError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="First Name">
              <input className="gym-input" name="p_first_name" value={editForm.p_first_name} onChange={handleChange} onKeyDown={handleNameKeyDown} onPaste={(e) => handleNamePaste('p_first_name', e, true)} />
            </FieldGroup>
            <FieldGroup label="Last Name">
              <input className="gym-input" name="p_last_name" value={editForm.p_last_name} onChange={handleChange} onKeyDown={handleNameKeyDown} onPaste={(e) => handleNamePaste('p_last_name', e, true)} />
            </FieldGroup>
          </div>
          <FieldGroup label="Gender">
            <div className="flex gap-3">
              {['Male','Female'].map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer flex-1 px-3 py-2 rounded-xl"
                       style={{ border:`1px solid ${editForm.p_gender===g?'var(--gym-accent)':'var(--gym-border)'}`,
                                background:editForm.p_gender===g?'rgba(232,255,71,.08)':'var(--gym-surface)' }}>
                  <input type="radio" name="p_gender" value={g} checked={editForm.p_gender===g} onChange={handleChange} className="hidden" />
                  <span style={{ fontSize:14 }}>{g==='Male'?'♂':'♀'}</span>
                  <span className="text-sm" style={{ color:editForm.p_gender===g?'var(--gym-accent)':'var(--gym-text)' }}>{g}</span>
                </label>
              ))}
            </div>
          </FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Phone">
              <input className="gym-input" name="p_phone" value={editForm.p_phone} onChange={handleChange} />
            </FieldGroup>
            <FieldGroup label="Email">
              <input className="gym-input" name="p_email" type="email" value={editForm.p_email} onChange={handleChange} />
            </FieldGroup>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Role">
              <select className="gym-input" name="p_role_id" value={editForm.p_role_id} onChange={handleChange}>
                <option value="1">Admin</option>
                <option value="2">Trainer</option>
                <option value="3">Member</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Status">
              {/* Only statuses valid for User.status CHECK constraint.
                  'deleted' can only be set via the Delete button, not here. */}
              <select className="gym-input" name="p_status" value={editForm.p_status} onChange={handleChange}
                      disabled={(editForm.p_status||'').toLowerCase() === 'deleted'}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
                {(editForm.p_status||'').toLowerCase() === 'deleted' && (
                  <option value="deleted" disabled>Deleted (use Delete button)</option>
                )}
              </select>
            </FieldGroup>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEditSave} disabled={saving || editImageUploading}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* ── View Card ── */}
      <Modal isOpen={showCard} onClose={() => setShowCard(false)} title="USER PROFILE" maxWidth={420}>
        {cardData && (
          <div className="modal-body">
            <div className="flex items-center gap-4 mb-5">
              {/* Clicking the avatar inside the card modal zooms it.
                  This is intentional and safe — the lightbox uses z-[200]
                  which is above the modal overlay (z-50). */}
              <div
                className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 cursor-zoom-in transition-transform duration-200 hover:scale-105"
                style={{ background:(ROLE_COLORS[cardData.roleId]||'var(--gym-accent)')+'22' }}
                onClick={() => {
                  const initials = ((cardData.firstName || cardData.username || '?').charAt(0)).toUpperCase();
                  const color = ROLE_COLORS[cardData.roleId] || 'var(--gym-accent)';
                  setZoomImage({
                    url: cardData.profile_image ? getImgUrl(cardData.profile_image) : null,
                    initials,
                    color,
                    name: `${cardData.firstName || ''} ${cardData.lastName || ''}`
                  });
                }}
              >
                {cardData.profile_image
                  ? <img src={getImgUrl(cardData.profile_image)} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold" style={{ color:ROLE_COLORS[cardData.roleId]||'var(--gym-accent)', fontFamily:"'Space Mono', monospace" }}>
                      {(cardData.firstName||cardData.username||'?').charAt(0).toUpperCase()}
                    </span>}
              </div>
              <div>
                <div className="text-xl font-bold" style={{ color:'var(--gym-text)' }}>
                  {cardData.firstName} {cardData.lastName}
                </div>
                <div className="text-xs" style={{ color:'var(--gym-muted)' }}>@{cardData.username}</div>
                <div className="text-sm mt-0.5" style={{ color:ROLE_COLORS[cardData.roleId]||'var(--gym-muted)' }}>
                  {ROLE_LABELS[cardData.roleId]||'Unknown'} · <Badge variant={statusVariant(cardData.status)}>{cardData.status}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Email',   cardData.email],
                ['Phone',   cardData.phone],
                ['Gender',  cardData.gender],
                ['Role ID', cardData.roleId],
                ['User ID', cardData.userId],
                ['Joined',  formatDate(cardData.created_date)],
                ['Updated', formatDate(cardData.updated_date)],
              ].map(([k,v]) => (
                <div key={k} className="p-3 rounded-xl" style={{ background:'var(--gym-surface2)' }}>
                  <div className="text-xs mb-0.5" style={{ color:'var(--gym-muted)' }}>{k}</div>
                  <div className="text-sm font-medium truncate" style={{ color:'var(--gym-text)' }}>{v||'—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowCard(false)}>Close</button>
          {cardData && (
            <button className="btn btn-primary" onClick={() => { handleEditOpen(cardData); setShowCard(false); }}>
              Edit User
            </button>
          )}
        </div>
      </Modal>

      {/* ── Image/Avatar Zoom Lightbox ──
           z-[200] ensures this renders above Modal overlay (z-50).
           Only triggered from inside the card modal avatar click —
           never from the table row — to avoid black screen bug. */}
      {zoomImage && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          style={{ zIndex: 200, cursor: 'zoom-out', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-w-full max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center p-2 bg-neutral-900/50"
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'default', animation: 'slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {zoomImage.url ? (
              <img
                src={zoomImage.url}
                alt="Profile Zoom"
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl select-none"
                onError={() => setZoomImage((prev) => ({ ...prev, url: null }))}
              />
            ) : (
              <div
                className="w-64 h-64 rounded-2xl flex flex-col items-center justify-center select-none"
                style={{ background: zoomImage.color + '22', border: `2px solid ${zoomImage.color}` }}
              >
                <span className="text-7xl font-bold mb-4" style={{ color: zoomImage.color, fontFamily: "'Space Mono', monospace" }}>
                  {zoomImage.initials}
                </span>
                <span className="text-sm font-semibold opacity-85 px-3 py-1 rounded-full" style={{ background: zoomImage.color + '15', color: zoomImage.color }}>
                  {zoomImage.name || 'User'}
                </span>
              </div>
            )}
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-colors duration-150"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}