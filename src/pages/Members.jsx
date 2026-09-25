// ============================================================
//  Members.jsx — Full CRUD
//  Endpoints: /Member/*
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMembers, addMember, editMember, deleteMember } from '../actions/memberAction';
import { fetchUsers } from '../actions/usersAction';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { formatDate, getImgUrl } from '../utils';
import { ROLES } from '../../index';
import * as api from '../services/api';
import { checkPhoneOrEmail, registerMemberUser } from '../services/memberApi';

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

const initUser   = { p_email: '', p_phone: '', p_password_hash: '', p_gender: '' };
const initMember = { p_first_name: '', p_last_name: '', p_blood_group: '', p_weight: '', p_height: '', p_fitness_goal: '', p_join_date: '' };

const MAX_MB = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

const PHONE_10_REGEX = /^[0-9]{10}$/;
const validatePhone = (v) => {
  if (!v) return 'Phone is required.';
  if (!PHONE_10_REGEX.test(v)) return 'Phone number must be exactly 10 digits.';
  return '';
};
const validateEmail = (v) => {
  if (!v) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
  return '';
};

export default function Members() {
  const dispatch  = useDispatch();
  const { data, loading } = useSelector((s) => s.members);
  const adminId   = useSelector((s) => s.ui.currentUserId);
  const user      = useSelector((s) => s.auth.user);
  const isAdmin   = user?.roleName === ROLES.ADMIN;
  const users     = useSelector((s) => s.users?.data || []);

  const [showAdd,    setShowAdd]    = useState(false);
  const [showEdit,   setShowEdit]   = useState(false);
  const [showCard,   setShowCard]   = useState(false);
  const [cardData,   setCardData]   = useState(null);
  const [userForm,   setUserForm]   = useState(initUser);
  const [memForm,    setMemForm]    = useState(initMember);
  const [editForm,   setEditForm]   = useState({});
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState('');
  const [statusTab,  setStatusTab]  = useState('approved');
  const [viewMode,   setViewMode]   = useState('table');
  const [zoomImage, setZoomImage] = useState(null);
  const [addErrors, setAddErrors] = useState({});
  const [addChecking, setAddChecking] = useState(false);

  // ── NEW: profile image upload for the Add-Member modal ──
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { dispatch(fetchMembers()); dispatch(fetchUsers()); }, [dispatch]);

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setUserForm(f => ({ ...f, p_phone: digits }));
    setAddErrors(er => ({ ...er, p_phone: validatePhone(digits) }));
  };
  const handleEmailChange = (e) => {
    const v = e.target.value;
    setUserForm(f => ({ ...f, p_email: v }));
    setAddErrors(er => ({ ...er, p_email: validateEmail(v) }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');

    if (file.size > MAX_BYTES) {
      setImageError(`Max ${MAX_MB} MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setImageError('Only JPG, PNG, or WebP images are allowed.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    setImageFile(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleAdd = async () => {
    const phoneErr = validatePhone(userForm.p_phone);
    const emailErr = validateEmail(userForm.p_email);
    if (phoneErr || emailErr || !memForm.p_first_name || !userForm.p_password_hash) {
      setAddErrors({ p_phone: phoneErr, p_email: emailErr });
      return;
    }

    // 1) Duplicate check — admin flow needs no OTP, just "does this exist already"
    setAddChecking(true);
    try {
      const emailCheck = await checkPhoneOrEmail({ email: userForm.p_email });
      if (emailCheck?.data?.StatusCode === 200 && emailCheck?.data?.ResultSet) {
        setAddErrors(er => ({ ...er, p_email: 'This email is already registered.' }));
        setAddChecking(false);
        return;
      }
      const phoneCheck = await checkPhoneOrEmail({ phone: userForm.p_phone });
      if (phoneCheck?.data?.StatusCode === 200 && phoneCheck?.data?.ResultSet) {
        setAddErrors(er => ({ ...er, p_phone: 'This phone number is already registered.' }));
        setAddChecking(false);
        return;
      }
    } catch { /* fall through — backend still validates duplicates */ }
    setAddChecking(false);

    setSaving(true);
    try {
      // 2) Upload profile image first (if any), so we have a path to store on the User row
      let uploadedImagePath = '';
      if (imageFile) {
        const uploadRes = await api.uploadUserImage(imageFile);
        if (uploadRes?.data?.StatusCode === 200 && uploadRes?.data?.imagePath) {
          uploadedImagePath = uploadRes.data.imagePath;
        } else {
          setAddErrors(er => ({ ...er, p_email: uploadRes?.data?.Result || 'Profile photo upload failed.' }));
          setSaving(false);
          return;
        }
      }

      // 3) Create the parent User row (role_id = 3 → Member, status = 'active', no OTP)
      const userRes = await registerMemberUser({ ...userForm, p_image_path: uploadedImagePath }, adminId);
      const userData = userRes?.data;
      // NOTE: adjust this line if your /User/Add response puts the new id somewhere else
      const newUserId = userData?.ResultSet?.userId ?? userData?.ResultSet?.VGIdParam ?? userData?.VGIdParam;

      if (!(userData?.StatusCode === 200 || userData?.StatusCode === 201) || !newUserId) {
        setAddErrors(er => ({ ...er, p_email: userData?.Result || 'Could not create the user account.' }));
        setSaving(false);
        return;
      }

      // 4) Create the Member row linked to that new user
      const ok = await dispatch(addMember({ ...memForm, p_user_id: newUserId }, adminId));
      setSaving(false);
      if (ok) {
        setShowAdd(false);
        setUserForm(initUser);
        setMemForm(initMember);
        setAddErrors({});
        removeImage();
      }
    } catch {
      setSaving(false);
      setAddErrors(er => ({ ...er, p_email: 'Failed to add member. Please try again.' }));
    }
  };

  const handleEditOpen = (row) => {
    setEditForm({
      p_member_id:    row.memberId,
      p_first_name:   row.firstName  || '',
      p_last_name:    row.lastName   || '',
      p_blood_group:  row.blood_group|| '',
      p_weight:       row.weight     || '',
      p_height:       row.height     || '',
      p_fitness_goal: row.fitness_goal|| '',
      p_status:       row.status     || '',
    });
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    setSaving(true);
    const ok = await dispatch(editMember(editForm, adminId));
    setSaving(false);
    if (ok) setShowEdit(false);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete member "${name}"? This sets them inactive.`))
      dispatch(deleteMember(id, adminId));
  };

  // Enrich members with email, phone & profile image from the users store
  // FIX: profile_image now falls back to the linked User row, same as email/phone already did.
  const enriched = data.map(m => {
    const u = users.find(u => String(u.userId) === String(m.userId));
    return {
      ...m,
      email: m.email || u?.email || '—',
      phone: m.phone || u?.phone || '—',
      profile_image: m.profile_image || u?.profile_image || '',
    };
  });

  const statusCounts = {
    all: enriched.length,
    approved: enriched.filter(m => {
      const s = (m.status || 'pending').toLowerCase();
      return s === 'approved' || s === 'active';
    }).length,
    pending: enriched.filter(m => {
      const s = (m.status || 'pending').toLowerCase();
      return s === 'pending';
    }).length,
    rejected: enriched.filter(m => {
      const s = (m.status || 'pending').toLowerCase();
      return s === 'rejected';
    }).length,
    inactive: enriched.filter(m => {
      const s = (m.status || 'pending').toLowerCase();
      return s === 'inactive' || s === 'suspended';
    }).length,
  };

  const filtered = enriched.filter((m) => {
    const s = (m.status || 'pending').toLowerCase();
    if (statusTab === 'approved' && !(s === 'approved' || s === 'active')) return false;
    if (statusTab === 'pending' && s !== 'pending') return false;
    if (statusTab === 'rejected' && s !== 'rejected') return false;
    if (statusTab === 'inactive' && !(s === 'inactive' || s === 'suspended')) return false;

    if (search) {
      const q = search.toLowerCase();
      const nameMatch = (m.firstName + ' ' + m.lastName).toLowerCase().includes(q);
      const emailMatch = (m.email || '').toLowerCase().includes(q);
      const phoneMatch = (m.phone || '').toLowerCase().includes(q);
      const idMatch = String(m.memberId).includes(q);
      return nameMatch || emailMatch || phoneMatch || idMatch;
    }
    return true;
  });

  const statusVariant = (s = '') => {
    const l = (s || '').toLowerCase();
    if (l === 'approved') return 'active';
    if (l === 'pending') return 'pending';
    if (l === 'inactive' || l === 'rejected' || l === 'suspended') return 'inactive';
    return 'pending';
  };

  const handleStatusChange = async (memberId, newStatus) => {
    if (!window.confirm(`Change member status to "${newStatus}"?`)) return;
    await dispatch(editMember({ p_member_id: memberId, p_status: newStatus }, adminId));
  };

  const formatJoinedDate = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
  };

  const columns = [
    { key: 'memberId',    label: 'ID',       width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'firstName',   label: 'Name',     render: (v, row) => (
      <button className="flex items-center gap-2 text-left" style={{ background:'none', border:'none', cursor:'pointer' }}
        onClick={() => { setCardData(row); setShowCard(true); }}>
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (row.profile_image) {
              setZoomImage(getImgUrl(row.profile_image));
            } else {
              const initials = (v||'M').charAt(0).toUpperCase();
              setZoomImage({ initials, color: 'var(--gym-success)', name: `${v} ${row.lastName}` });
            }
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-110" 
          style={{ background:'rgba(71,255,154,.15)', color:'var(--gym-success)', fontFamily:"'Space Mono',monospace" }}
        >
          {row.profile_image ? (
            <img src={getImgUrl(row.profile_image)} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-xs">{(v||'M').charAt(0).toUpperCase()}</span>
          )}
        </div>
        <span className="font-medium" style={{ color:'var(--gym-text)' }}>{v} {row.lastName}</span>
      </button>
    )},
    { key: 'email',       label: 'Email',    render: (v) => <span className="text-xs" style={{ color:'var(--gym-muted)' }}>{v || '—'}</span> },
    { key: 'phone',       label: 'Phone',    render: (v) => <span className="text-xs">{v || '—'}</span> },
    { key: 'blood_group', label: 'Blood',    render: (v) => v || '—' },
    { key: 'joinDate',    label: 'Joined',   render: (v) => <span className="text-xs" style={{ color:'var(--gym-muted)' }}>{formatJoinedDate(v)}</span> },
    { key: 'status',      label: 'Status',   render: (v) => {
      const displayStatus = v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : 'Pending';
      return <Badge variant={statusVariant(v || 'pending')}>{displayStatus}</Badge>;
    } },
    ...(isAdmin ? [{ key: '_actions', label: 'Actions', render: (_, row) => {
      const s = (row.status || '').toLowerCase();
      return (
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-secondary btn-sm" onClick={() => handleEditOpen(row)}>✏️</button>
          {s !== 'approved' && (
            <button className="btn btn-sm" style={{ background: 'rgba(71,255,154,.15)', color: 'var(--gym-success)', border: '1px solid rgba(71,255,154,.3)', fontSize: '11px' }}
              onClick={() => handleStatusChange(row.memberId, 'approved')}>✓ Approve</button>
          )}
          {s !== 'rejected' && (
            <button className="btn btn-sm" style={{ background: 'rgba(255,71,71,.12)', color: 'var(--gym-accent2)', border: '1px solid rgba(255,71,71,.25)', fontSize: '11px' }}
              onClick={() => handleStatusChange(row.memberId, 'rejected')}>✕ Reject</button>
          )}
          {s !== 'inactive' && (
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.memberId, `${row.firstName} ${row.lastName}`)}>🗑️</button>
          )}
        </div>
      );
    }}] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">Members</div>
          <div className="page-sub">{filtered.length} members</div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color:'var(--gym-muted)' }}>🔍</span>
            <input className="gym-input pl-8 w-48" placeholder="Search name, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}>
            {viewMode === 'table' ? '⊞ Cards' : '☰ Table'}
          </button>
          {isAdmin && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Member</button>}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b pb-3 overflow-x-auto" style={{ borderColor: 'var(--gym-surface2)' }}>
        {[
          // { id: 'all', label: 'All Members', icon: '👥', color: 'var(--gym-accent)' },
          { id: 'approved', label: 'Approved', icon: '✅', color: 'var(--gym-success)' },
          { id: 'pending', label: 'Pending', icon: '⏳', color: '#f59e0b' },
          { id: 'rejected', label: 'Rejected', icon: '✕', color: 'var(--gym-accent2)' },
          { id: 'inactive', label: 'Inactive', icon: '🚫', color: 'var(--gym-muted)' },
        ].map(({ id, label, icon, color }) => {
          const isActive = statusTab === id;
          const count = statusCounts[id];
          return (
            <button
              key={id}
              onClick={() => setStatusTab(id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: isActive ? 'var(--gym-surface2)' : 'transparent',
                color: isActive ? 'var(--gym-text)' : 'var(--gym-muted)',
                border: isActive ? `1px solid ${color}55` : '1px solid transparent',
                boxShadow: isActive ? `0 2px 8px ${color}15` : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                style={{
                  background: isActive ? `${color}22` : 'var(--gym-surface2)',
                  color: isActive ? color : 'var(--gym-muted)',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {viewMode === 'table' ? (
        <DataTable columns={columns} data={filtered} loading={loading} rowKey="memberId" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div key={m.memberId} className="card p-5 space-y-3 cursor-pointer" onClick={() => { setCardData(m); setShowCard(true); }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (m.profile_image) {
                        setZoomImage(getImgUrl(m.profile_image));
                      } else {
                        const initials = (m.firstName||'M').charAt(0).toUpperCase();
                        setZoomImage({ initials, color: 'var(--gym-success)', name: `${m.firstName} ${m.lastName}` });
                      }
                    }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-110" 
                    style={{ background:'rgba(71,255,154,.15)', color:'var(--gym-success)', fontFamily:"'Space Mono',monospace" }}
                  >
                    {m.profile_image ? (
                      <img src={getImgUrl(m.profile_image)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-xl">{(m.firstName||'M').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color:'var(--gym-text)' }}>{m.firstName} {m.lastName}</div>
                    <div className="text-xs" style={{ color:'var(--gym-muted)' }}>{m.email}</div>
                  </div>
                </div>
                <Badge variant={statusVariant(m.status || 'pending')}>
                  {m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1).toLowerCase() : 'Pending'}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[['Blood', m.blood_group], ['Weight', m.weight ? `${m.weight}kg` : '—'], ['Height', m.height ? `${m.height}cm` : '—']].map(([k, v]) => (
                  <div key={k} className="p-2 rounded-lg" style={{ background:'var(--gym-surface2)' }}>
                    <div style={{ color:'var(--gym-muted)' }}>{k}</div>
                    <div className="font-medium" style={{ color:'var(--gym-text)' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="ADD MEMBER" maxWidth={520}>
        <div className="modal-body space-y-4">
          <div className="text-xs font-semibold tracking-widest" style={{ color:'var(--gym-muted)' }}>USER ACCOUNT</div>

          {/* NEW: profile image upload */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background:'rgba(71,255,154,.15)', color:'var(--gym-success)' }}>
              {imagePreview ? (
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-xl">{(memForm.p_first_name||'M').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" id="member-add-image" />
              <div className="flex gap-2">
                <label htmlFor="member-add-image" className="btn btn-secondary btn-sm" style={{ cursor:'pointer' }}>Choose Photo</label>
                {imageFile && <button type="button" className="btn btn-sm" onClick={removeImage}>Remove</button>}
              </div>
              {imageError && <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>{imageError}</p>}
            </div>
          </div>

          <div className="text-xs font-semibold tracking-widest mt-2" style={{ color:'var(--gym-muted)' }}>MEMBER DETAILS</div>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="First Name *"><input className="gym-input" value={memForm.p_first_name} onChange={(e) => setMemForm(f => ({ ...f, p_first_name: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Last Name *"><input className="gym-input" value={memForm.p_last_name} onChange={(e) => setMemForm(f => ({ ...f, p_last_name: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Join Date">
              <input
                className="gym-input"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={memForm.p_join_date}
                onChange={(e) => setMemForm(f => ({ ...f, p_join_date: e.target.value }))}
              />
            </FieldGroup>
            <FieldGroup label="Blood Group">
              <select className="gym-input" value={memForm.p_blood_group} onChange={(e) => setMemForm(f => ({ ...f, p_blood_group: e.target.value }))}>
                <option value="">Select...</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup label="Weight (kg)"><input className="gym-input" type="number" value={memForm.p_weight} onChange={(e) => setMemForm(f => ({ ...f, p_weight: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Height (cm)"><input className="gym-input" type="number" value={memForm.p_height} onChange={(e) => setMemForm(f => ({ ...f, p_height: e.target.value }))} /></FieldGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Phone * (10 digits)">
              <input className="gym-input" inputMode="numeric" maxLength={10} value={userForm.p_phone} onChange={handlePhoneChange} placeholder="0771234567" />
              {addErrors.p_phone && <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>{addErrors.p_phone}</p>}
            </FieldGroup>
            <FieldGroup label="Email *">
              <input className="gym-input" type="email" value={userForm.p_email} onChange={handleEmailChange} />
              {addErrors.p_email && <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>{addErrors.p_email}</p>}
            </FieldGroup>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Password *"><input className="gym-input" type="password" value={userForm.p_password_hash} onChange={(e) => setUserForm(f => ({ ...f, p_password_hash: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Gender">
              <select className="gym-input" value={userForm.p_gender} onChange={(e) => setUserForm(f => ({ ...f, p_gender: e.target.value }))}>
                <option value="">— Not specified —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </FieldGroup>
          </div>

          
          <FieldGroup label="Fitness Goal">
            <textarea className="gym-input resize-none" rows={2} value={memForm.p_fitness_goal} onChange={(e) => setMemForm(f => ({ ...f, p_fitness_goal: e.target.value }))} placeholder="e.g. Lose weight, Build muscle..." />
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving || addChecking}>{addChecking ? 'Checking...' : saving ? 'Adding...' : 'Add Member'}</button>
        </div>
      </Modal>

      {/* Edit */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="EDIT MEMBER" maxWidth={480}>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="First Name"><input className="gym-input" value={editForm.p_first_name||''} onChange={(e) => setEditForm(f => ({ ...f, p_first_name: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Last Name"><input className="gym-input" value={editForm.p_last_name||''} onChange={(e) => setEditForm(f => ({ ...f, p_last_name: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Weight (kg)"><input className="gym-input" type="number" value={editForm.p_weight||''} onChange={(e) => setEditForm(f => ({ ...f, p_weight: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Height (cm)"><input className="gym-input" type="number" value={editForm.p_height||''} onChange={(e) => setEditForm(f => ({ ...f, p_height: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Blood Group">
              <select className="gym-input" value={editForm.p_blood_group||''} onChange={(e) => setEditForm(f => ({ ...f, p_blood_group: e.target.value }))}>
                <option value="">Select...</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup label="Status">
              <select className="gym-input" value={editForm.p_status||''} onChange={(e) => setEditForm(f => ({ ...f, p_status: e.target.value }))}>
                <option value="">— No change —</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="inactive">Inactive (Deleted)</option>
              </select>
            </FieldGroup>
          </div>
          <FieldGroup label="Fitness Goal">
            <textarea className="gym-input resize-none" rows={2} value={editForm.p_fitness_goal||''} onChange={(e) => setEditForm(f => ({ ...f, p_fitness_goal: e.target.value }))} />
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </Modal>

      {/* Card */}
      <Modal isOpen={showCard} onClose={() => setShowCard(false)} title="MEMBER PROFILE" maxWidth={420}>
        {cardData && (
          <div className="modal-body space-y-4">
            <div className="flex items-center gap-4">
              <div 
                onClick={() => {
                  if (cardData.profile_image) {
                    setZoomImage(getImgUrl(cardData.profile_image));
                  } else {
                    const initials = (cardData.firstName||'M').charAt(0).toUpperCase();
                    setZoomImage({ initials, color: 'var(--gym-success)', name: `${cardData.firstName} ${cardData.lastName}` });
                  }
                }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-110" 
                style={{ background:'rgba(71,255,154,.15)', color:'var(--gym-success)', fontFamily:"'Space Mono',monospace" }}
              >
                {cardData.profile_image ? (
                  <img src={getImgUrl(cardData.profile_image)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-2xl">{(cardData.firstName||'M').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className="text-xl font-bold" style={{ color:'var(--gym-text)' }}>{cardData.firstName} {cardData.lastName}</div>
                <div className="text-sm" style={{ color:'var(--gym-success)' }}>Member #{cardData.memberId}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Email',   cardData.email],
                ['Phone',   cardData.phone],
                ['Joined',  formatDate(cardData.joinDate)],
                ['Blood',   cardData.blood_group],
                ['Weight',  cardData.weight ? `${cardData.weight} kg` : '—'],
                ['Height',  cardData.height ? `${cardData.height} cm` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="p-3 rounded-xl" style={{ background:'var(--gym-surface2)' }}>
                  <div className="text-xs" style={{ color:'var(--gym-muted)' }}>{k}</div>
                  <div className="text-sm font-medium truncate" style={{ color:'var(--gym-text)' }}>{v || '—'}</div>
                </div>
              ))}
            </div>
            {cardData.fitness_goal && (
              <div className="p-3 rounded-xl" style={{ background:'var(--gym-surface2)' }}>
                <div className="text-xs mb-1" style={{ color:'var(--gym-muted)' }}>Fitness Goal</div>
                <div className="text-sm" style={{ color:'var(--gym-text)' }}>💪 {cardData.fitness_goal}</div>
              </div>
            )}
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowCard(false)}>Close</button>
          {isAdmin && cardData && <button className="btn btn-primary" onClick={() => { handleEditOpen(cardData); setShowCard(false); }}>✏️ Edit</button>}
        </div>
      </Modal>

      {/* ── Image/Avatar Zoom Lightbox ── */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setZoomImage(null)}
          style={{ 
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out' 
          }}
        >
          <div 
            className="relative max-w-full max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center p-2 bg-neutral-900/50"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              cursor: 'default',
              animation: 'slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {typeof zoomImage === 'string' ? (
              <img 
                src={zoomImage} 
                alt="Profile Zoom" 
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl select-none" 
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
                  {zoomImage.name || 'Member'}
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
