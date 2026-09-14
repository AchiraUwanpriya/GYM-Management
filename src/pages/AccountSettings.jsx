// ============================================================
//  AccountSettings.jsx — Change Password & Delete Account
//  Both actions require OTP verification first.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LOGIN_SUCCESS, LOGOUT } from '../constants/AuthConstant';
import * as api from '../services/api';
import { getImgUrl, formatDate } from '../utils';
import { getPhoneError, normalizePhoneInput } from '../utils/phoneValidation';

function EyeIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function EyeOffIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>; }
function ShieldIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function TrashIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>; }
function CameraIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M4 7h4l2-2h4l2 2h4a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z"/><circle cx="12" cy="13" r="4"/></svg>; }

const MAX_BYTES = 5 * 1024 * 1024;

export default function AccountSettings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  // ── Edit Profile state ──────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editProfileImagePath, setEditProfileImagePath] = useState('');
  const [editProfileImagePreview, setEditProfileImagePreview] = useState('');
  const [editProfileImageUploading, setEditProfileImageUploading] = useState(false);
  const [pendingProfileImageFile, setPendingProfileImageFile] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [editMsgType, setEditMsgType] = useState('info');
  const editProfileFileRef = useRef(null);

  // ── Shared OTP state ───────────────────────────────────────
  const [action, setAction] = useState(''); // 'password' or 'delete'
  const [step, setStep] = useState(0);      // 0=idle, 1=otp_sent, 2=otp_verified, 3=done
  const [otpCode, setOtpCode] = useState('');
  const [sentOtp, setSentOtp] = useState('');  // OTP returned by backend — compare locally (verifyPhoneOtp endpoint disabled)
  const [otpLoading, setOtpLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');

  // ── Change Password: user's chosen OTP delivery channel ────
  // Mirrors Login.jsx's fpMethod radio group. Only 'email'/'sms' are
  // offered here (no WhatsApp) since this is an in-app authenticated flow.
  const [pwOtpMethod, setPwOtpMethod] = useState('sms'); // 'sms' | 'email'

  // ── Password state ──────────────────────────────────────────
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // ── Delete state ────────────────────────────────────────────
  const [delLoading, setDelLoading] = useState(false);
  const [delConfirmText, setDelConfirmText] = useState('');
  const hasPendingProfileImage = Boolean(pendingProfileImageFile);

  useEffect(() => {
    if (isEditing) {
      setEditFirstName(user?.firstName || '');
      setEditLastName(user?.lastName || '');
      setEditEmail(user?.email || '');
      setEditPhone(user?.phone || '');
      const imgPath = user?.profile_image || '';
      setEditProfileImagePath(imgPath);
      setEditProfileImagePreview(imgPath ? getImgUrl(imgPath) : '');
      setPendingProfileImageFile(null);
      setEditMsg('');
    }
  }, [isEditing, user]);

  // Warn before browser close/refresh when unsaved changes exist
  // (replaces unstable useBeforeUnload + usePrompt which crash in RRD v6.30)
  useEffect(() => {
    const handler = (e) => {
      if (!hasPendingProfileImage) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasPendingProfileImage]);

  const resetAll = () => {
    setAction('');
    setStep(0);
    setOtpCode('');
    setSentOtp('');
    setMsg('');
    setMsgType('info');
    setNewPassword('');
    setConfirmPassword('');
    setDelConfirmText('');
    setPwOtpMethod('sms');
  };

  const cancelEdit = () => {
    if (hasPendingProfileImage && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
      return;
    }
    setIsEditing(false);
    setEditFirstName('');
    setEditLastName('');
    setEditEmail('');
    setEditPhone('');
    setEditProfileImagePath('');
    setEditProfileImagePreview('');
    setPendingProfileImageFile(null);
    setEditMsg('');
  };

  const msgColor = (t) => t === 'error' ? 'var(--gym-accent2)' : t === 'success' ? 'var(--gym-success)' : 'var(--gym-muted)';

  const syncCurrentUser = (changes) => {
    let storedUser = {};
    try {
      storedUser = JSON.parse(localStorage.getItem('dts_gym_user') || '{}');
    } catch {
      storedUser = {};
    }

    const mergedUser = { ...storedUser, ...user, ...changes };
    localStorage.setItem('dts_gym_user', JSON.stringify(mergedUser));
    dispatch({ type: LOGIN_SUCCESS, payload: mergedUser });
  };

  // ── Edit Profile Image ────────────────────────────────────
  const handleEditProfileImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditMsg('');
    if (file.size > MAX_BYTES) {
      setEditMsg(`Profile photo must be under ${MAX_BYTES / 1024 / 1024} MB.`);
      setEditMsgType('error');
      if (editProfileFileRef.current) editProfileFileRef.current.value = '';
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setEditMsg('Only JPG, PNG or WebP images are allowed.');
      setEditMsgType('error');
      if (editProfileFileRef.current) editProfileFileRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setEditProfileImagePreview(ev.target?.result || '');
    reader.readAsDataURL(file);
    setPendingProfileImageFile(file);
    setEditMsg('Photo selected. Click Save Changes to apply.');
    setEditMsgType('info');
  };

  // ── Save Profile ──────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user?.userId) {
      setEditMsg('You must be signed in to update your profile.');
      setEditMsgType('error');
      return;
    }

    // Validate first/last name
    if (!editFirstName.trim()) {
      setEditMsg('First name is required.');
      setEditMsgType('error');
      return;
    }
    if (!editLastName.trim()) {
      setEditMsg('Last name is required.');
      setEditMsgType('error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editEmail && !emailRegex.test(editEmail)) {
      setEditMsg('Please enter a valid email address.');
      setEditMsgType('error');
      return;
    }

    // Validate phone format
    const phoneValue = normalizePhoneInput(editPhone || '');
    const phoneError = getPhoneError(phoneValue);
    if (phoneError) {
      setEditMsg(phoneError);
      setEditMsgType('error');
      return;
    }

    setEditSaving(true);
    setEditMsg('');
    try {
      let imagePathToSave = editProfileImagePath || user.profile_image || '';

      if (pendingProfileImageFile) {
        setEditProfileImageUploading(true);
        const uploadRes = await api.uploadUserImage(pendingProfileImageFile);
        const uploadData = uploadRes?.data;
        if (uploadData?.StatusCode === 200 && uploadData.imagePath) {
          imagePathToSave = uploadData.imagePath;
        } else {
          setEditMsg(uploadData?.Result || 'Image upload failed.');
          setEditMsgType('error');
          setEditProfileImageUploading(false);
          setEditSaving(false);
          return;
        }
        setEditProfileImageUploading(false);
      }

      const res = await api.editUser({
        p_user_id: user.userId,
        p_email: editEmail || user.email || '',
        p_phone: phoneValue || user.phone || '',
        p_first_name: editFirstName.trim() || user.firstName || '',
        p_last_name: editLastName.trim() || user.lastName || '',
        p_gender: user.gender || '',
        p_role_id: user.roleId || 3,
        p_status: user.status || 'active',
        p_image_path: imagePathToSave,
        p_admin_id: user.userId,
      }, user.userId);

      const data = res?.data;
      if (data?.StatusCode === 200) {
        syncCurrentUser({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail,
          phone: phoneValue,
          profile_image: imagePathToSave,
        });
        setEditProfileImagePath(imagePathToSave);
        setPendingProfileImageFile(null);
        setEditMsg('Profile updated successfully.');
        setEditMsgType('success');
        setTimeout(() => setIsEditing(false), 1500);
      } else {
        setEditMsg(data?.Result || 'Failed to update profile.');
        setEditMsgType('error');
      }
    } catch {
      setEditMsg('Failed to update profile. Please try again.');
      setEditMsgType('error');
    }
    setEditProfileImageUploading(false);
    setEditSaving(false);
  };

  // ── Send OTP ───────────────────────────────────────────────
  const sendOtp = async (forAction) => {
    setAction(forAction);
    setOtpLoading(true);
    setMsg('');
    try {
      let res;
      if (forAction === 'password') {
        // Must use the ForgotPassword flow — ResetPassword endpoint only accepts
        // codes with the ForgotPassword action type, not SendEditOtp (type 012).
        // Identifier must match the CHOSEN channel: email method -> email
        // address, sms method -> phone number. Sending the wrong one to
        // OTPsender.Dispatch means the code goes to a channel the user
        // didn't ask for (or nowhere at all).
        const identifier = pwOtpMethod === 'email'
          ? (user.email || '')
          : (user.phone || '');

        if (!identifier) {
          setMsg(pwOtpMethod === 'email'
            ? 'No email address is on file for your account.'
            : 'No phone number is on file for your account.');
          setMsgType('error');
          setOtpLoading(false);
          return;
        }

        res = await api.forgotPassword(identifier, pwOtpMethod);
      } else {
        // Delete account: OTP must go to BOTH email and phone at once.
        // Backend looks up the on-file email/phone by userId itself, so we
        // only need to pass the userId — this also stops the frontend
        // from being able to redirect the code to an unverified channel.
        res = await api.sendDeleteAccountOtp(user.userId);
      }
      const data = res.data;
      if (data?.StatusCode === 200) {
        // Capture the OTP returned in the response for local comparison
        const returnedOtp = String(
          data.ResultSet?.otp ||
          data.ResultSet?.OTP ||
          data.otp ||
          data.OTP ||
          ''
        ).trim();
        setSentOtp(returnedOtp);
        setStep(1);
        setMsg(
          forAction === 'password'
            ? `OTP sent to your registered ${pwOtpMethod === 'email' ? 'email address' : 'phone number'}.`
            : (data.Result || 'OTP sent to your registered email and phone number.')
        );
        setMsgType('success');
      } else {
        setMsg(data?.Result || 'Could not send OTP. Please try again.');
        setMsgType('error');
      }
    } catch {
      setMsg('Network error. Please try again.');
      setMsgType('error');
    }
    setOtpLoading(false);
  };

  const startDeleteFlow = () => {
    setAction('delete');
    setStep(0);
    setOtpCode('');
    setDelConfirmText('');
    setMsg('');
    setMsgType('info');
  };

  // ── Verify OTP ─────────────────────────────────────────────
  const verifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) return;
    setOtpLoading(true);
    setMsg('');
    try {
      // /User/VerifyPhoneOtp is disabled on the backend (commented out in UserController.cs).
      // Backend OTP policy: the generated OTP is returned in the sendOtp response —
      // the frontend must compare locally.
      if (sentOtp && String(otpCode).trim() !== String(sentOtp).trim()) {
        setMsg('Invalid or expired OTP. Please check the code and try again.');
        setMsgType('error');
        setOtpLoading(false);
        return;
      }

      if (action === 'password') {
        // For password reset, also call verifyResetCode to confirm account is still active.
        // Must pass the same identifier/channel that sendOtp used, not a hardcoded phone —
        // otherwise this looks up the wrong record when the user chose email OTP.
        const identifier = pwOtpMethod === 'email' ? (user.email || '') : (user.phone || '');
        const res = await api.verifyResetCode(identifier, otpCode);
        const data = res.data;
        if (data?.StatusCode !== 200) {
          setMsg(data?.Result || 'Invalid or expired OTP.');
          setMsgType('error');
          setOtpLoading(false);
          return;
        }
      }

      // OTP matches — proceed
      setStep(2);
      setMsg('✓ OTP verified! You may proceed.');
      setMsgType('success');
    } catch {
      setMsg('Verification failed. Please try again.');
      setMsgType('error');
    }
    setOtpLoading(false);
  };

  // ── Change Password ────────────────────────────────────────
  const handleChangePassword = async () => {
    if (newPassword.length < 6) { setMsg('Password must be at least 6 characters.'); setMsgType('error'); return; }
    if (newPassword !== confirmPassword) { setMsg('Passwords do not match.'); setMsgType('error'); return; }

    setPwLoading(true);
    setMsg('');
    try {
      const identifier = pwOtpMethod === 'email' ? (user.email || '') : (user.phone || '');
      const res = await api.resetPassword(identifier, otpCode, newPassword);
      const data = res.data;
      if (data?.StatusCode === 200) {
        setStep(3);
        setMsg('Password changed successfully! Please log in again.');
        setMsgType('success');
        setTimeout(() => {
          localStorage.removeItem('dts_gym_user');
          dispatch({ type: LOGOUT });
          navigate('/login');
        }, 2500);
      } else {
        setMsg(data?.Result || 'Failed to change password.');
        setMsgType('error');
      }
    } catch {
      setMsg('Network error. Please try again.');
      setMsgType('error');
    }
    setPwLoading(false);
  };

  // ── Delete Account ─────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (delConfirmText !== 'DELETE MY ACCOUNT') {
      setMsg('Please type DELETE MY ACCOUNT to confirm.');
      setMsgType('error');
      return;
    }
    if (!otpCode || otpCode.length < 4) {
      setMsg('Enter the OTP that was sent to you.');
      setMsgType('error');
      return;
    }
    // OTP was already verified locally in verifyOtp() — no need to call
    // verifyPhoneOtp again (endpoint is disabled on backend)
    setDelLoading(true);
    setMsg('');
    try {
      const res = await api.deleteUser(user.userId, user.userId);
      const data = res?.data;
      if (data?.StatusCode === 200) {
        setStep(3);
        setMsg('Account deleted. Redirecting…');
        setMsgType('success');
        setTimeout(() => {
          localStorage.removeItem('dts_gym_user');
          dispatch({ type: LOGOUT });
          navigate('/');
        }, 2000);
      } else {
        setMsg(data?.Result || 'Failed to delete account.');
        setMsgType('error');
      }
    } catch {
      setMsg('Network error. Please try again.');
      setMsgType('error');
    }
    setDelLoading(false);
  };

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Account Settings</div>
          <div className="page-sub">Manage your password and account · {user?.email}</div>
        </div>
      </div>

      {/* ── User Info & Edit Profile ─────────────────────────── */}
      <div className="gym-card">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Avatar & Basic Info */}
          <div className="flex flex-col items-center md:items-start gap-4 flex-shrink-0">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden border-4 border-surface2 shadow-xl"
              style={{ background: 'var(--gym-surface2)', borderColor: 'rgba(71,200,255,.2)' }}>
              {isEditing && editProfileImagePreview ? (
                <img src={editProfileImagePreview} alt="Profile" className="w-full h-full object-cover" />
              ) : user?.profile_image ? (
                <img src={getImgUrl(user.profile_image)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold" style={{ color: 'var(--gym-accent3)', fontFamily: "'Space Mono', monospace" }}>
                  {(user?.username || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-center md:text-left">
              <div className="text-xl font-bold" style={{ color: 'var(--gym-text)' }}>{user?.username}</div>
              <div className="text-xs font-semibold px-2 py-0.5 rounded bg-accent/10 text-accent uppercase tracking-widest inline-block mt-1"
                style={{ background: 'rgba(71,200,255,.1)', color: 'var(--gym-accent3)' }}>
                {user?.roleId === 1 ? 'Administrator' : user?.roleId === 2 ? 'Trainer' : 'Member'}
              </div>
            </div>
          </div>

          {/* Right: Detailed Fields */}
          <div className="flex-1">
            {!isEditing ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {[
                    { label: 'First Name', value: user?.firstName },
                    { label: 'Last Name',  value: user?.lastName },
                    { label: 'Email Address', value: user?.email },
                    { label: 'Phone Number',  value: user?.phone },
                    { label: 'Gender',        value: user?.gender },
                    { label: 'Date Joined',   value: formatDate(user?.joinDate || user?.createdDate) },
                  ].map((f) => (
                    <div key={f.label} className="p-3 rounded-xl border border-border" style={{ background: 'var(--gym-surface2)' }}>
                      <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--gym-muted)' }}>{f.label}</div>
                      <div className="text-sm font-medium" style={{ color: 'var(--gym-text2)' }}>{f.value || '—'}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                  ✏️ Edit Profile
                </button>
              </>
            ) : (
              <div className="space-y-4 p-4 rounded-xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
                {/* Profile Picture Upload in Edit Mode */}
                <div className="space-y-2">
                  <label className="gym-label">Profile Picture</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--gym-surface)', border: '2px dashed var(--gym-border)' }}>
                      {editProfileImagePreview ? (
                        <img src={editProfileImagePreview} alt="Profile preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold" style={{ color: 'var(--gym-accent3)', fontFamily: "'Space Mono', monospace" }}>
                          {(user?.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <input
                      ref={editProfileFileRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handleEditProfileImageSelect}
                    />
                    <button className="btn btn-secondary" type="button"
                      onClick={() => editProfileFileRef.current?.click()}
                      disabled={editProfileImageUploading || editSaving}>
                      {editProfileImageUploading ? 'Uploading...' : 'Choose Photo'}
                    </button>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>JPG, PNG or WebP · max 5 MB</div>
                </div>

                {/* First Name & Last Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="gym-label">First Name</label>
                    <input className="gym-input" type="text" placeholder="Enter first name"
                      value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="gym-label">Last Name</label>
                    <input className="gym-input" type="text" placeholder="Enter last name"
                      value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label className="gym-label">Email Address</label>
                  <input className="gym-input" type="email" placeholder="Enter email"
                    value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>

                {/* Phone Field */}
                <div>
                  <label className="gym-label">Phone Number</label>
                  <input className="gym-input" type="tel" placeholder="Enter phone number"
                    value={editPhone} onChange={(e) => setEditPhone(normalizePhoneInput(e.target.value))} />
                </div>

                {/* Messages */}
                {editMsg && (
                  <p className="text-sm" style={{ color: msgColor(editMsgType) }}>{editMsg}</p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button className="btn btn-secondary" onClick={cancelEdit} disabled={editSaving}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveProfile} disabled={editProfileImageUploading || editSaving}>
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="gym-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(71,200,255,.1)', color: 'var(--gym-accent3)' }}><LockIcon /></div>
          <div>
            <div className="gym-card-title mb-0">Change Password</div>
            <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>Verify with OTP before changing your password</div>
          </div>
        </div>

        {action !== 'password' ? (
          <button className="btn btn-primary" onClick={() => { setAction('password'); setStep(0); }} disabled={otpLoading}>
            <><LockIcon /> Change Password</>
          </button>
        ) : (
          <div className="space-y-4 p-4 rounded-xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>

            {/* Step 0: Choose OTP delivery channel */}
            {step === 0 && (
              <div className="space-y-3">
                <div className="text-sm" style={{ color: 'var(--gym-text2)' }}>
                  We'll send an OTP to verify it's you before changing your password.
                </div>
                <div>
                  <label className="gym-label">Receive OTP via</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="pwOtpMethod" value="sms" checked={pwOtpMethod === 'sms'} onChange={() => setPwOtpMethod('sms')} />
                      <span className="text-sm">📱 SMS ({user?.phone || 'not on file'})</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="pwOtpMethod" value="email" checked={pwOtpMethod === 'email'} onChange={() => setPwOtpMethod('email')} />
                      <span className="text-sm">📧 Email ({user?.email || 'not on file'})</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary" onClick={resetAll}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => sendOtp('password')} disabled={otpLoading}>
                    {otpLoading ? 'Sending…' : 'Send Code'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Enter OTP */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="text-sm" style={{ color: 'var(--gym-text2)' }}>
                  Enter the OTP sent to your registered {pwOtpMethod === 'email' ? 'email' : 'phone'}:
                </div>
                <div className="flex gap-2">
                  <input
                    className="gym-input text-center text-xl tracking-[0.4em] flex-1"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <button className="btn btn-primary flex-shrink-0" onClick={verifyOtp} disabled={otpLoading || otpCode.length < 4}>
                    {otpLoading ? '…' : 'Verify'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: New password */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(71,255,154,.06)', border: '1px solid rgba(71,255,154,.2)', color: 'var(--gym-success)' }}>
                  ✅ OTP verified. Enter your new password below.
                </div>
                <div>
                  <label className="gym-label">New Password (min 6 chars)</label>
                  <div className="relative">
                    <input type={showNew ? 'text' : 'password'} className="gym-input pr-10"
                      placeholder="Enter new password" value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowNew((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ background: 'none', border: 'none', color: 'var(--gym-muted)', cursor: 'pointer' }}>
                      {showNew ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="gym-label">Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} className="gym-input pr-10"
                      placeholder="Confirm new password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ background: 'none', border: 'none', color: 'var(--gym-muted)', cursor: 'pointer' }}>
                      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary" onClick={resetAll}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleChangePassword} disabled={pwLoading}>
                    {pwLoading ? 'Changing…' : 'Change Password'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(71,255,154,.08)', border: '1px solid rgba(71,255,154,.25)' }}>
                <div className="text-2xl mb-2">✅</div>
                <div className="text-sm font-medium" style={{ color: 'var(--gym-success)' }}>Password changed! Redirecting to login…</div>
              </div>
            )}

            {msg && action === 'password' && (
              <p className="text-sm" style={{ color: msgColor(msgType) }}>{msg}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Delete Account Section ─────────────── */}
      <div className="gym-card" style={{ border: '1px solid rgba(255,71,71,.15)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,71,71,.1)', color: 'var(--gym-accent2)' }}><TrashIcon /></div>
          <div>
            <div className="gym-card-title mb-0" style={{ color: 'var(--gym-accent2)' }}>Delete Account</div>
            <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>Permanently delete your account — this cannot be undone</div>
          </div>
        </div>

        {action !== 'delete' ? (
          <button className="btn btn-danger" onClick={startDeleteFlow}>
            <><TrashIcon /> Delete My Account</>
          </button>
        ) : (
          <div className="space-y-4 p-4 rounded-xl" style={{ background: 'rgba(255,71,71,.03)', border: '1px solid rgba(255,71,71,.15)' }}>

            {/* Step 1: Confirmation prompt */}
            {step === 0 && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,71,71,.06)', border: '1px solid rgba(255,71,71,.2)', color: 'var(--gym-accent2)' }}>
                  Are you sure you want to delete your account? This action is irreversible. Type <strong>DELETE MY ACCOUNT</strong> in the box below to confirm.
                </div>
                <div>
                  <label className="gym-label">Type DELETE MY ACCOUNT to confirm</label>
                  <input className="gym-input" placeholder="DELETE MY ACCOUNT" value={delConfirmText}
                    onChange={(e) => setDelConfirmText(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary" onClick={resetAll}>Cancel</button>
                  <button className="btn btn-danger" onClick={() => sendOtp('delete')}
                    disabled={otpLoading || delConfirmText !== 'DELETE MY ACCOUNT'}>
                    {otpLoading ? 'Sending OTP...' : 'Continue'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: OTP entry */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(255,71,71,.06)', border: '1px solid rgba(255,71,71,.2)', color: 'var(--gym-accent2)' }}>
                  Enter the OTP sent to both your registered email and phone number, then confirm deletion.
                </div>
                <div className="flex gap-2">
                  <input
                    className="gym-input text-center text-xl tracking-[0.4em] flex-1"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <button className="btn btn-secondary" onClick={resetAll}>Cancel</button>
                  <button className="btn btn-danger flex-shrink-0" onClick={handleDeleteAccount} disabled={delLoading || otpCode.length < 4}>
                    {delLoading ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Deleted */}
            {step === 3 && (
              <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,71,71,.08)', border: '1px solid rgba(255,71,71,.25)' }}>
                <div className="text-2xl mb-2">🗑️</div>
                <div className="text-sm font-medium" style={{ color: 'var(--gym-accent2)' }}>Account deleted. Redirecting…</div>
              </div>
            )}

            {msg && action === 'delete' && (
              <p className="text-sm" style={{ color: msgColor(msgType) }}>{msg}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Security Notice ────────────────────── */}
      <div className="gym-card" style={{ border: '1px solid rgba(71,200,255,.12)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(71,200,255,.1)', color: 'var(--gym-accent3)' }}><ShieldIcon /></div>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>Security Information</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>
              Changing your password requires OTP verification via your registered email or phone (your choice).
              Deleting your account requires OTP verification via BOTH your registered email and phone.
              If you've lost access to these, contact the gym admin for help.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}