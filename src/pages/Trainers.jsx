// ============================================================
//  Trainers.jsx — Full CRUD
//  Endpoints: /Trainer/*
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchTrainers, addTrainer, editTrainer, deleteTrainer, 
} from '../actions/trainerAction';
import { fetchTrainerTimeslots } from '../actions/trainerTimeSlotAction';
import {
  addTrainerAssignmentByMember, fetchAssignments, cancelTrainerAssignment,
} from '../actions/trainerAssignmnetAction';
import { fetchUsers } from '../actions/usersAction';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { ROLES } from '../../index';
import TrainerRequestPanel from '../components/member/TrainerRequestPanel';
import { getImgUrl, getProfileImg } from '../utils';
import * as api from '../services/api';
import { checkPhoneOrEmail, registerTrainerUser } from '../services/trainerApi';

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

const initUser    = { p_first_name: '', p_last_name: '', p_email: '', p_phone: '', p_password_hash: '', p_gender: '' };
const initTrainer = { p_experience_years: '', p_bio: '', p_qualifications: '' };

const MAX_MB = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

export default function Trainers() {
  const dispatch = useDispatch();
  const { data, loading } = useSelector((s) => s.trainers);
  const trainerTimeslots = useSelector((s) => s.trainerTimeslots.data);
  const myAssignments     = useSelector((s) => s.assignments.data);
  
  const adminId  = useSelector((s) => s.ui.currentUserId);
  const user     = useSelector((s) => s.auth.user);
  const isAdmin  = user?.roleName === ROLES.ADMIN;
  const isMember = user?.roleName === ROLES.MEMBER;
  const users    = useSelector((s) => s.users?.data || []);

  const [showAdd,  setShowAdd]  = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [cardData, setCardData] = useState(null);
  const [uForm,    setUForm]    = useState(initUser);
  const [tForm,    setTForm]    = useState(initTrainer);
  const [editForm, setEditForm] = useState({});
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [zoomImage, setZoomImage] = useState(null);
  const [addErrors, setAddErrors] = useState({});
  const [addChecking, setAddChecking] = useState(false);

  // ── profile image upload for the Add-Trainer modal ──
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const fileRef = useRef(null);

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

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setUForm(f => ({ ...f, p_phone: digits }));
    setAddErrors(er => ({ ...er, p_phone: validatePhone(digits) }));
  };

  const handleEmailChange = (e) => {
    const v = e.target.value;
    setUForm(f => ({ ...f, p_email: v }));
    setAddErrors(er => ({ ...er, p_email: validateEmail(v) }));
  };

  // First/Last name live on the User row — letters, spaces, hyphens, apostrophes only
  const handleNameChange = (e) => {
    const { name, value } = e.target;
    const filtered = value.replace(/[^a-zA-Z\s\-']/g, '');
    setUForm(f => ({ ...f, [name]: filtered }));
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

  useEffect(() => { 
    dispatch(fetchTrainers());
    dispatch(fetchUsers());
    if (isMember) {
      dispatch(fetchTrainerTimeslots());
      dispatch(fetchAssignments());
    }
  }, [dispatch, isMember]);

  const handleAdd = async () => {
    const phoneErr = validatePhone(uForm.p_phone);
    const emailErr = validateEmail(uForm.p_email);
    if (phoneErr || emailErr || !uForm.p_first_name.trim() || !uForm.p_last_name.trim() || !uForm.p_password_hash) {
      setAddErrors({ p_phone: phoneErr, p_email: emailErr });
      return;
    }

    // 1) Duplicate check — admin flow needs no OTP, just "does this exist already"
    setAddChecking(true);
    try {
      const emailCheck = await checkPhoneOrEmail({ email: uForm.p_email });
      if (emailCheck?.data?.StatusCode === 200 && emailCheck?.data?.ResultSet) {
        setAddErrors(er => ({ ...er, p_email: 'This email is already registered.' }));
        setAddChecking(false);
        return;
      }
      const phoneCheck = await checkPhoneOrEmail({ phone: uForm.p_phone });
      if (phoneCheck?.data?.StatusCode === 200 && phoneCheck?.data?.ResultSet) {
        setAddErrors(er => ({ ...er, p_phone: 'This phone number is already registered.' }));
        setAddChecking(false);
        return;
      }
    } catch { /* if the check endpoint fails, fall through — backend still validates */ }
    setAddChecking(false);

    setSaving(true);
    try {
      // 2) Upload profile image first (if any)
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

      // 3) Create the parent User row (role_id = 2 → Trainer, status = 'active', no OTP)
      const userRes = await registerTrainerUser({ ...uForm, p_image_path: uploadedImagePath }, adminId);
      const userData = userRes?.data;
      // NOTE: adjust this line if your /User/Add response puts the new id somewhere else
      const newUserId = userData?.ResultSet?.userId ?? userData?.ResultSet?.VGIdParam ?? userData?.VGIdParam;

      if (!(userData?.StatusCode === 200 || userData?.StatusCode === 201) || !newUserId) {
        setAddErrors(er => ({ ...er, p_email: userData?.Result || 'Could not create the user account.' }));
        setSaving(false);
        return;
      }

      // 4) Create the Trainer row linked to that new user
      const ok = await dispatch(addTrainer({ ...tForm, p_user_id: newUserId }, adminId));
      setSaving(false);
      if (ok) {
        setShowAdd(false);
        setUForm(initUser);
        setTForm(initTrainer);
        setAddErrors({});
        removeImage();
      }
    } catch {
      setSaving(false);
      setAddErrors(er => ({ ...er, p_email: 'Failed to add trainer. Please try again.' }));
    }
  };

  const handleEditOpen = (row) => {
    setEditForm({
      p_trainer_id:      row.trainerId,
      p_experience_years:row.experience_years || '',
      p_bio:             row.bio || '',
      p_status:          row.status || '',
    });
    setShowEdit(true);
  };

  const handleTrainerStatusChange = async (trainerId, newStatus) => {
    if (!window.confirm(`Change trainer status to "${newStatus}"?`)) return;
    await dispatch(editTrainer({ p_trainer_id: trainerId, p_status: newStatus }, adminId));
  };

  const handleEditSave = async () => {
    setSaving(true);
    const ok = await dispatch(editTrainer(editForm, adminId));
    setSaving(false);
    if (ok) setShowEdit(false);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete trainer "${name}"?`)) dispatch(deleteTrainer(id, adminId));
  };

  // Enrich trainers with email, phone, firstName, lastName & profile image from the users store
  const enriched = data.map(t => {
    const u = users.find(u => String(u.userId) === String(t.userId));
    const imagePath = getProfileImg(t) || getProfileImg(u) || '';
    const name = (t.firstName || u?.firstName || t.lastName || u?.lastName)
      ? `${t.firstName || u?.firstName || ''} ${t.lastName || u?.lastName || ''}`.trim()
      : `Trainer #${t.trainerId}`;
    return {
      ...t,
      username:  t.username || name,
      firstName: t.firstName || u?.firstName || '',
      lastName:  t.lastName  || u?.lastName  || '',
      email:     t.email     || u?.email     || '—',
      phone:     t.phone     || u?.phone     || '—',
      age:       t.age       || u?.age       || '',
      gender:    t.gender    || u?.gender    || '',
      profile_image: imagePath,
    };
  });

  const filtered = search
    ? enriched.filter((t) =>
        (t.username || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.email    || '').toLowerCase().includes(search.toLowerCase()))
    : enriched;

  const columns = [
    { key: 'trainerId',        label: 'ID',         width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'username',         label: 'Trainer',    render: (v, row) => (
      <button className="flex items-center gap-2 text-left" style={{ background:'none', border:'none', cursor:'pointer' }}
        onClick={() => { setCardData(row); setShowCard(true); }}>
        <div 
          onClick={(e) => {
            e.stopPropagation();
            const initials = (v||'T').charAt(0).toUpperCase();
            setZoomImage({
              url: row.profile_image ? getImgUrl(row.profile_image) : null,
              initials,
              color: 'var(--gym-accent3)',
              name: v
            });
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-110" 
          style={{ background:'rgba(71,200,255,.15)', color:'var(--gym-accent3)' }}
        >
          {row.profile_image ? (
            <img
              src={getImgUrl(row.profile_image)}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <span
            className="font-bold text-xs"
            style={{ display: row.profile_image ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
            {(v||'T').charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="font-medium" style={{ color:'var(--gym-text)' }}>{v}</span>
      </button>
    )},
    { key: 'email',            label: 'Email',      render: (v) => <span className="text-xs" style={{ color:'var(--gym-muted)' }}>{v}</span> },
    { key: 'experience_years', label: 'Exp (yrs)',  render: (v) => v || '0' },
    { key: 'status', label: 'Status', render: (v) => {
      const s = (v || 'pending').toLowerCase();
      const variant = s === 'active' ? 'active' : s === 'pending' ? 'pending' : 'inactive';
      const label = s.charAt(0).toUpperCase() + s.slice(1);
      return <Badge variant={variant}>{label}</Badge>;
    }},
    ...(isAdmin ? [{ key: '_actions', label: 'Actions', render: (_, row) => {
      const s = (row.status || 'pending').toLowerCase();
      return (
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-secondary btn-sm" onClick={() => handleEditOpen(row)}>✏️ Edit</button>
          {s !== 'active' && (
            <button className="btn btn-sm" style={{ background: 'rgba(71,255,154,.15)', color: 'var(--gym-success)', border: '1px solid rgba(71,255,154,.3)', fontSize: '11px' }}
              onClick={() => handleTrainerStatusChange(row.trainerId, 'active')}>✓ Activate</button>
          )}
          {s !== 'inactive' && (
            <button className="btn btn-sm" style={{ background: 'rgba(255,71,71,.12)', color: 'var(--gym-accent2)', border: '1px solid rgba(255,71,71,.25)', fontSize: '11px' }}
              onClick={() => handleTrainerStatusChange(row.trainerId, 'inactive')}>⏸ Deactivate</button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(row.trainerId, row.username)}>🗑️</button>
        </div>
      );
    }}] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">Trainers</div>
          <div className="page-sub">{(data || []).length} registered experts</div>
        </div>
        <div className="flex gap-2">
          {!isMember && (
            <div className="flex rounded-lg p-1" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
               {[{ id: 'cards', l: '🎴' }, { id: 'table', l: '📋' }].map(v => (
                 <button key={v.id} onClick={() => setViewMode(v.id)} 
                   className="px-3 py-1 rounded text-sm transition-all"
                   style={{ 
                     background: viewMode === v.id ? 'var(--gym-accent)' : 'transparent',
                     color: viewMode === v.id ? '#000' : 'var(--gym-muted)',
                     fontWeight: viewMode === v.id ? 700 : 400
                   }}>{v.l}</button>
               ))}
            </div>
          )}
          {isAdmin && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Trainer</button>}
        </div>
      </div>

      {!isMember && (
        <div className="flex items-center gap-3">
          <div className="relative w-64">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50">🔍</span>
             <input className="gym-input pl-9" placeholder="Search trainers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      )}

      {isMember ? (
        <TrainerRequestPanel
          trainers={enriched}
          trainerTimeslots={trainerTimeslots}
          trainerRequests={(myAssignments || []).filter(a =>
            String(a.memberId) === String(user?.userId) &&
            (a.status || '').toLowerCase() === 'pending'
          )}
          activeAssignments={(myAssignments || []).filter(a => {
            const s = (a.status || '').toLowerCase();
            return String(a.memberId) === String(user?.userId) &&
              s !== 'pending' && s !== 'cancelled' && s !== 'rejected';
          })}
          onRequestTrainer={(t) => dispatch(addTrainerAssignmentByMember({
            p_trainer_id: t.trainerId,
            p_member_id: user.userId,
            p_assignment_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            p_admin_id: user.userId
          }))}
          onCancelRequest={(id) => dispatch(cancelTrainerAssignment(id, user.userId))}
        />
      ) : viewMode === 'table' ? (
        <DataTable columns={columns} data={filtered} loading={loading} rowKey="trainerId" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(filtered || []).map((t) => (
            <div key={t.trainerId} className="card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      const initials = (t.username||'T').charAt(0).toUpperCase();
                      setZoomImage({
                        url: t.profile_image ? getImgUrl(t.profile_image) : null,
                        initials,
                        color: 'var(--gym-accent3)',
                        name: t.username
                      });
                    }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-110" 
                    style={{ background:'rgba(71,200,255,.15)', color:'var(--gym-accent3)' }}
                  >
                    {t.profile_image ? (
                      <img
                        src={getImgUrl(t.profile_image)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span
                      className="font-bold text-xl"
                      style={{ display: t.profile_image ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {(t.username||'T').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color:'var(--gym-text)' }}>{t.username}</div>
                    <div className="text-xs" style={{ color:'var(--gym-muted)' }}>{t.email}</div>
                  </div>
                </div>
                <Badge variant={(() => { const s = (t.status || 'pending').toLowerCase(); return s === 'active' ? 'active' : s === 'pending' ? 'pending' : 'inactive'; })()}>
                  {(t.status || 'pending').charAt(0).toUpperCase() + (t.status || 'pending').slice(1)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['📞 Phone', t.phone],
                  ['⭐ Experience', `${t.experience_years || 0} years`],
                ].map(([k, v]) => (
                  <div key={k} className="p-2 rounded-lg text-xs" style={{ background:'var(--gym-surface2)' }}>
                    <div style={{ color:'var(--gym-muted)' }}>{k}</div>
                    <div className="font-medium mt-0.5" style={{ color:'var(--gym-text)' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
              {t.bio && <div className="text-xs p-2 rounded-lg" style={{ background:'var(--gym-surface2)', color:'var(--gym-muted)' }}>{t.bio}</div>}
              {isAdmin && (
                <div className="flex gap-2 pt-2 border-t" style={{ borderColor:'var(--gym-border)' }}>
                  <button className="btn btn-secondary btn-sm flex-1" onClick={() => handleEditOpen(t)}>✏️ Edit</button>
                  {(t.status || 'pending').toLowerCase() !== 'active' && (
                    <button className="btn btn-sm" style={{ background: 'rgba(71,255,154,.15)', color: 'var(--gym-success)', border: '1px solid rgba(71,255,154,.3)', fontSize: '11px' }}
                      onClick={() => handleTrainerStatusChange(t.trainerId, 'active')}>✓ Activate</button>
                  )}
                  {(t.status || 'pending').toLowerCase() !== 'inactive' && (
                    <button className="btn btn-sm" style={{ background: 'rgba(255,71,71,.12)', color: 'var(--gym-accent2)', border: '1px solid rgba(255,71,71,.25)', fontSize: '11px' }}
                      onClick={() => handleTrainerStatusChange(t.trainerId, 'inactive')}>⏸ Inactive</button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.trainerId, t.username)}>🗑️</button>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="col-span-3 text-center py-12" style={{ color:'var(--gym-muted)' }}>No trainers found.</div>
          )}
        </div>
      )}

      {/* Add */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="ADD TRAINER" maxWidth={500}>
        <div className="modal-body space-y-4">
          <div className="text-xs font-semibold tracking-widest mb-1" style={{ color:'var(--gym-muted)' }}>USER ACCOUNT</div>

          {/* profile image upload */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background:'rgba(71,200,255,.15)', color:'var(--gym-accent3)' }}>
              {imagePreview ? (
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-xl">{(uForm.p_first_name||'T').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" id="trainer-add-image" />
              <div className="flex gap-2">
                <label htmlFor="trainer-add-image" className="btn btn-secondary btn-sm" style={{ cursor:'pointer' }}>Choose Photo</label>
                {imageFile && <button type="button" className="btn btn-sm" onClick={removeImage}>Remove</button>}
              </div>
              {imageError && <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>{imageError}</p>}
            </div>
          </div>

          {/* First/Last name */}
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="First Name *">
              <input className="gym-input" name="p_first_name" value={uForm.p_first_name} onChange={handleNameChange} />
            </FieldGroup>
            <FieldGroup label="Last Name *">
              <input className="gym-input" name="p_last_name" value={uForm.p_last_name} onChange={handleNameChange} />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Phone * (10 digits)">
              <input className="gym-input" inputMode="numeric" maxLength={10} value={uForm.p_phone} onChange={handlePhoneChange} placeholder="0771234567" />
              {addErrors.p_phone && <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>{addErrors.p_phone}</p>}
            </FieldGroup>
            <FieldGroup label="Email *">
              <input className="gym-input" type="email" value={uForm.p_email} onChange={handleEmailChange} />
              {addErrors.p_email && <p className="text-xs mt-1" style={{ color:'var(--gym-accent2)' }}>{addErrors.p_email}</p>}
            </FieldGroup>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Password *"><input className="gym-input" type="password" value={uForm.p_password_hash} onChange={(e) => setUForm(f => ({ ...f, p_password_hash: e.target.value }))} /></FieldGroup>
            <FieldGroup label="Gender">
              <select className="gym-input" value={uForm.p_gender} onChange={(e) => setUForm(f => ({ ...f, p_gender: e.target.value }))}>
                <option value="">— Not specified —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </FieldGroup>
          </div>

          <div className="text-xs font-semibold tracking-widest mt-2 mb-1" style={{ color:'var(--gym-muted)' }}>TRAINER DETAILS</div>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Experience (years)"><input className="gym-input" type="number" min="0" value={tForm.p_experience_years} onChange={(e) => setTForm(f => ({ ...f, p_experience_years: e.target.value }))} placeholder="0" /></FieldGroup>
            <FieldGroup label="Qualifications"><input className="gym-input" value={tForm.p_qualifications} onChange={(e) => setTForm(f => ({ ...f, p_qualifications: e.target.value }))} placeholder="e.g. NASM-CPT" /></FieldGroup>
          </div>
          <FieldGroup label="Bio"><textarea className="gym-input resize-none" rows={3} value={tForm.p_bio} onChange={(e) => setTForm(f => ({ ...f, p_bio: e.target.value }))} placeholder="Trainer bio..." /></FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving || addChecking}>{addChecking ? 'Checking...' : saving ? 'Adding...' : 'Add Trainer'}</button>
        </div>
      </Modal>

      {/* Edit */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="EDIT TRAINER" maxWidth={440}>
        <div className="modal-body space-y-4">
          <FieldGroup label="Experience (years)">
            <input className="gym-input" type="number" min="0" value={editForm.p_experience_years || ''}
              onChange={(e) => setEditForm(f => ({ ...f, p_experience_years: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label="Bio">
            <textarea className="gym-input resize-none" rows={4} value={editForm.p_bio || ''}
              onChange={(e) => setEditForm(f => ({ ...f, p_bio: e.target.value }))} />
          </FieldGroup>
          <FieldGroup label="Status">
            <select className="gym-input" value={editForm.p_status || ''} onChange={(e) => setEditForm(f => ({ ...f, p_status: e.target.value }))}>
              <option value="">— No change —</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </Modal>

      {/* Card */}
      <Modal isOpen={showCard} onClose={() => setShowCard(false)} title="TRAINER PROFILE" maxWidth={400}>
        {cardData && (
          <div className="modal-body space-y-4">
            <div className="flex items-center gap-4">
              <div 
                onClick={() => {
                  const initials = (cardData.username||'T').charAt(0).toUpperCase();
                  setZoomImage({
                    url: cardData.profile_image ? getImgUrl(cardData.profile_image) : null,
                    initials,
                    color: 'var(--gym-accent3)',
                    name: cardData.username
                  });
                }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-110" 
                style={{ background:'rgba(71,200,255,.15)', color:'var(--gym-accent3)' }}
              >
                {cardData.profile_image ? (
                  <img
                    src={getImgUrl(cardData.profile_image)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  className="font-bold text-2xl"
                  style={{ display: cardData.profile_image ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                >
                  {(cardData.username||'T').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-xl font-bold" style={{ color:'var(--gym-text)' }}>{cardData.username}</div>
                <div className="text-sm" style={{ color:'var(--gym-accent3)' }}>Trainer #{cardData.trainerId}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Email',      cardData.email],
                ['Phone',      cardData.phone],
                ['Experience', `${cardData.experience_years || 0} years`],
                ['Status',     cardData.status],
              ].map(([k, v]) => (
                <div key={k} className="p-3 rounded-xl" style={{ background:'var(--gym-surface2)' }}>
                  <div className="text-xs" style={{ color:'var(--gym-muted)' }}>{k}</div>
                  <div className="text-sm font-medium" style={{ color:'var(--gym-text)' }}>{v || '—'}</div>
                </div>
              ))}
            </div>
            {cardData.bio && <div className="p-3 rounded-xl text-sm" style={{ background:'var(--gym-surface2)', color:'var(--gym-muted)' }}>{cardData.bio}</div>}
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowCard(false)}>Close</button>
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
                  {zoomImage.name || 'Trainer'}
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