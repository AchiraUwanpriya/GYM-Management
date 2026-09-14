import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import * as api from '../services/api';
import { getPhoneError, isValidPhone, normalizePhoneInput, PHONE_ERROR_MESSAGE } from '../utils/phoneValidation';

// ── Gmail-only email validation ────────────────────────────────
// Requirement: must be a valid @gmail.com address (case-insensitive)
const GMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i;
const getEmailError = (email) => {
  if (!email || !email.trim()) return '';
  return GMAIL_REGEX.test(email.trim()) ? '' : 'Only @gmail.com addresses are accepted.';
};

const MAX_MB = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

export default function AddUser() {
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const theme = useSelector((s) => s.ui.theme);

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  const [form, setForm] = useState({
    firstName: '', lastName: '',
    email: '', phone: '',
    gender: '', role_id: '3',
    password: '', confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [genUsername, setGenUsername] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const fileRef = useRef(null);

  const [otpStep, setOtpStep] = useState(0);
  const [otpCode, setOtpCode] = useState('');
  const [sentOtp, setSentOtp] = useState('');  // OTP returned by backend — must compare locally (VerifyPhoneOtp endpoint is disabled on backend)
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState('');
  const [otpMsgType, setOtpMsgType] = useState('info');

  const [emailOtpStep, setEmailOtpStep] = useState(0);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [sentEmailOtp, setSentEmailOtp] = useState('');
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailOtpMsg, setEmailOtpMsg] = useState('');
  const [emailOtpMsgType, setEmailOtpMsgType] = useState('info');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError('');

    // ── Real-time Gmail validation ─────────────────────────
    if (name === 'email') {
      setFieldErrors((prev) => ({ ...prev, email: getEmailError(value) }));
      setEmailOtpStep(0);
      setEmailOtpCode('');
      setSentEmailOtp('');
      setEmailOtpMsg('');
    } else {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'phone') {
      setOtpStep(0);
      setOtpCode('');
      setSentOtp('');
      setOtpMsg('');
    }
  };

  const handleNameChange = (e) => {
    const { name, value } = e.target;
    const filtered = value.replace(/[^a-zA-Z\s\-\']/g, '');
    setError('');
    setFieldErrors((prev) => ({
      ...prev,
      [name]: filtered !== value ? 'Name must not contain numbers.' : '',
    }));
    setForm((prev) => ({ ...prev, [name]: filtered }));
  };

  const handleNameKeyDown = (e) => {
    if (/\d/.test(e.key)) {
      e.preventDefault();
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: 'Name must not contain numbers.' }));
    }
  };

  const handleNamePaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    const filtered = pasted.replace(/[^a-zA-Z\s\-\']/g, '');
    if (filtered !== pasted) {
      e.preventDefault();
      const { name, selectionStart = 0, selectionEnd = 0, value } = e.target;
      const nextValue = `${value.slice(0, selectionStart)}${filtered}${value.slice(selectionEnd)}`;
      setForm((prev) => ({ ...prev, [name]: nextValue }));
      setFieldErrors((prev) => ({ ...prev, [name]: 'Name must not contain numbers.' }));
    }
  };

  const handlePhoneChange = (e) => {
    const raw = normalizePhoneInput(e.target.value);
    setError('');
    setFieldErrors((prev) => ({ ...prev, phone: getPhoneError(raw) }));
    setForm((prev) => ({ ...prev, phone: raw }));
    setOtpStep(0);
    setOtpCode('');
    setOtpMsg('');
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
    setImagePath('');
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImagePath('');
    setImageError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const sendOtp = async () => {
    const phone = form.phone.trim();
    if (!phone) {
      setError('Enter your phone number first.');
      return;
    }
    if (!isValidPhone(phone)) {
      setError(PHONE_ERROR_MESSAGE);
      return;
    }

    setOtpLoading(true);
    setOtpMsg('');
    try {
      const res = await api.sendPhoneOtp(phone);
      const data = res.data;
      if (data?.StatusCode === 200) {
        setOtpStep(1);
        setOtpMsg('OTP sent to your phone via SMS.');
        setOtpMsgType('success');
      } else {
        setOtpMsg(data?.Result || 'Could not send OTP.');
        setOtpMsgType('error');
      }
    } catch {
      setOtpMsg('Could not send OTP.');
      setOtpMsgType('error');
    }
    setOtpLoading(false);
  };

  const verifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) return;

    setOtpLoading(true);
    setOtpMsg('');
    try {
      if (sentOtp && String(otpCode).trim() !== String(sentOtp).trim()) {
        setOtpMsg('Invalid or expired OTP. Please check the code and try again.');
        setOtpMsgType('error');
        setOtpLoading(false);
        return;
      }
      setOtpStep(2);
      setOtpMsg('Phone verified.');
      setOtpMsgType('success');
    } catch {
      setOtpMsg('Could not verify.');
      setOtpMsgType('error');
    }
    setOtpLoading(false);
  };

  const sendEmailOtp = async () => {
    const email = form.email.trim();
    if (!email) {
      setError('Enter your email first.');
      return;
    }
    if (getEmailError(email)) {
      setError(getEmailError(email));
      return;
    }

    setEmailOtpLoading(true);
    setEmailOtpMsg('');
    try {
      const res = await api.sendEmailOtp(email);
      const data = res.data;
      if (data?.StatusCode === 200) {
        const receivedOtp = String(data.ResultSet?.otp || data.ResultSet?.OTP || data.otp || '').trim();
        setSentEmailOtp(receivedOtp);
        setEmailOtpStep(1);
        setEmailOtpMsg('OTP sent to your email.');
        setEmailOtpMsgType('success');
      } else {
        setEmailOtpMsg(data?.Result || 'Could not send OTP.');
        setEmailOtpMsgType('error');
      }
    } catch {
      setEmailOtpMsg('Could not send OTP.');
      setEmailOtpMsgType('error');
    }
    setEmailOtpLoading(false);
  };

  const verifyEmailOtp = async () => {
    if (!emailOtpCode || emailOtpCode.length < 4) return;

    setEmailOtpLoading(true);
    setEmailOtpMsg('');
    try {
      if (sentEmailOtp && String(emailOtpCode).trim() !== String(sentEmailOtp).trim()) {
        setEmailOtpMsg('Invalid or expired OTP. Please check the code and try again.');
        setEmailOtpMsgType('error');
        setEmailOtpLoading(false);
        return;
      }
      setEmailOtpStep(2);
      setEmailOtpMsg('Email verified successfully.');
      setEmailOtpMsgType('success');
    } catch {
      setEmailOtpMsg('Could not verify.');
      setEmailOtpMsgType('error');
    }
    setEmailOtpLoading(false);
  };

  const validate = () => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    
    const nameRegex = /^[a-zA-Z\s\-\']+$/;
    if (!nameRegex.test(form.firstName.trim())) return 'First name can only contain letters, spaces, hyphens, and apostrophes.';
    if (!nameRegex.test(form.lastName.trim())) return 'Last name can only contain letters, spaces, hyphens, and apostrophes.';

    if (!form.email.trim()) return 'Email is required.';
    if (!GMAIL_REGEX.test(form.email.trim())) return 'Only @gmail.com addresses are accepted.';
    if (emailOtpStep !== 2) return 'Please verify your email address with OTP first.';
    if (!form.gender) return 'Please select your gender.';
    if (!form.phone.trim()) return 'Phone number is required for OTP verification.';
    if (!isValidPhone(form.phone)) return PHONE_ERROR_MESSAGE;
    if (otpStep !== 2) return 'Please verify your phone number with OTP first.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      let uploadedImagePath = imagePath || '';

      if (imageFile && !uploadedImagePath) {
        setImageUploading(true);
        const uploadRes = await api.uploadUserImage(imageFile);
        const uploadData = uploadRes.data;

        if (uploadData?.StatusCode === 200 && uploadData?.imagePath) {
          uploadedImagePath = uploadData.imagePath;
          setImagePath(uploadedImagePath);
        } else {
          throw new Error(uploadData?.Result || 'Profile photo upload failed.');
        }
      }

      const payload = {
        p_first_name: form.firstName.trim(),
        p_last_name: form.lastName.trim(),
        p_email: form.email.trim(),
        p_phone: form.phone.trim(),
        p_gender: form.gender,
        p_password_hash: form.password,
        p_role_id: parseInt(form.role_id, 10),
        p_image_path: uploadedImagePath || '',
      };

      const res = await api.registerUser(payload);
      const data = res.data;
      if (data?.StatusCode === 200 || data?.StatusCode === 201) {
        const generatedUsername = data?.ResultSet?.generatedUsername;
        setGenUsername(generatedUsername || '');
        setSuccess('Registration successful! Your account is pending admin approval.');
        setForm({
          firstName: '', lastName: '',
          email: '', phone: '',
          gender: '', role_id: '3',
          password: '', confirmPassword: '',
        });
        setImagePreview('');
        setImageFile(null);
        setImagePath('');
        setImageError('');
        setOtpStep(0);
        setOtpCode('');
        setOtpMsg('');
        if (fileRef.current) fileRef.current.value = '';
      } else {
        const errorMsg = data?.Result || data?.Message || 'Registration failed. Please try again.';
        if (errorMsg.toLowerCase().includes('email address is already registered')) {
          setFieldErrors((prev) => ({ ...prev, email: errorMsg }));
        } else if (errorMsg.toLowerCase().includes('phone number is already registered') || errorMsg.toLowerCase().includes('valid phone number')) {
          setFieldErrors((prev) => ({ ...prev, phone: errorMsg }));
        } else {
          setError(errorMsg);
        }
      }
    } catch (submitErr) {
      setError(submitErr?.message || 'Could not connect to server. Please try again.');
    } finally {
      setImageUploading(false);
      setLoading(false);
    }
  };

  const msgColor = (type) =>
    type === 'success' ? 'var(--gym-success)' :
    type === 'error' ? 'var(--gym-accent2)' :
    'var(--gym-muted)';

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
         style={{ background: 'var(--gym-bg)', color: 'var(--gym-text)' }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1600&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.09,
          filter: 'grayscale(50%)',
        }}
      />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute rounded-full" style={{ width: 500, height: 500, top: '-150px', right: '-100px', background: 'radial-gradient(circle, rgba(232,255,71,0.06) 0%, transparent 70%)' }} />
        <div className="absolute rounded-full" style={{ width: 400, height: 400, bottom: '-100px', left: '-80px', background: 'radial-gradient(circle, rgba(71,200,255,0.05) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(var(--gym-border) 1px, transparent 1px), linear-gradient(90deg, var(--gym-border) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div
        className="relative w-full max-w-md rounded-2xl p-8 mx-4 my-8"
        style={{ background: 'rgba(18,18,18,0.92)', border: '1px solid var(--gym-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.55)', backdropFilter: 'blur(18px)' }}
      >
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div style={{ color: 'var(--gym-accent)' }}>
              <svg viewBox="0 0 40 40" fill="none" width="34" height="34">
                <rect x="4" y="15" width="6" height="10" rx="2" fill="currentColor" opacity="0.9" />
                <rect x="2" y="13" width="4" height="14" rx="2" fill="currentColor" />
                <rect x="30" y="15" width="6" height="10" rx="2" fill="currentColor" opacity="0.9" />
                <rect x="34" y="13" width="4" height="14" rx="2" fill="currentColor" />
                <rect x="10" y="18" width="20" height="4" rx="2" fill="currentColor" opacity="0.7" />
              </svg>
            </div>
            <div>
              <div className="text-3xl leading-none tracking-widest" style={{ fontFamily: "'Bebas Neue', cursive", color: 'var(--gym-accent)' }}>DTS GYM</div>
              <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>Elite Fitness Management</div>
            </div>
          </div>
          <h1 className="text-2xl tracking-widest leading-none mb-1" style={{ fontFamily: "'Bebas Neue', cursive", color: 'var(--gym-text)' }}>Create Account</h1>
          <p className="text-sm" style={{ color: 'var(--gym-muted)' }}>Register to join DTS Gym</p>
        </div>

        {success ? (
          <div className="space-y-5">
            <div className="p-5 rounded-xl text-center" style={{ background: 'rgba(71,255,154,.08)', border: '1px solid rgba(71,255,154,.25)' }}>
              <div className="text-3xl mb-2">OK</div>
              <p className="text-sm font-medium" style={{ color: 'var(--gym-success)' }}>{success}</p>
              {genUsername && (
                <p className="text-xs mt-2" style={{ color: 'var(--gym-muted)' }}>
                  Your username: <strong style={{ color: 'var(--gym-accent)' }}>@{genUsername}</strong>
                </p>
              )}
            </div>
            <Link
              to="/login"
              className="btn btn-primary w-full justify-center py-3"
              style={{ fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.1em', fontSize: '1.05rem', display: 'flex', textDecoration: 'none' }}
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="gym-label">Profile Photo <span style={{ color: 'var(--gym-muted)' }}>(optional, max {MAX_MB} MB)</span></label>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: 'var(--gym-surface2)', border: '2px dashed var(--gym-border)', cursor: 'pointer' }}
                  onClick={() => !loading && !imageUploading && fileRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24" style={{ color: 'var(--gym-muted)' }}>
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleImageSelect} />
                  {!imagePreview ? (
                    <button type="button" className="btn btn-secondary text-sm" onClick={() => fileRef.current?.click()} disabled={loading || imageUploading}>
                      Choose Photo
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: imageUploading ? 'var(--gym-muted)' : 'var(--gym-success)' }}>
                        {imageUploading ? 'Uploading during registration...' : 'Photo selected'}
                      </span>
                      <button type="button" className="btn btn-danger btn-sm text-xs" onClick={removeImage} disabled={loading || imageUploading}>
                        Remove
                      </button>
                    </div>
                  )}
                  <p className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>JPG, PNG or WebP · max {MAX_MB} MB</p>
                </div>
              </div>
              {imageError && <p className="text-xs mt-1" style={{ color: 'var(--gym-accent2)' }}>Warning: {imageError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="gym-label">First Name *</label>
                <input name="firstName" value={form.firstName} onChange={handleNameChange} onKeyDown={handleNameKeyDown} onPaste={handleNamePaste} className="gym-input" placeholder="First name" required />
                {fieldErrors.firstName && <p className="text-xs mt-1" style={{ color: 'var(--gym-accent2)' }}>{fieldErrors.firstName}</p>}
              </div>
              <div>
                <label className="gym-label">Last Name *</label>
                <input name="lastName" value={form.lastName} onChange={handleNameChange} onKeyDown={handleNameKeyDown} onPaste={handleNamePaste} className="gym-input" placeholder="Last name" required />
                {fieldErrors.lastName && <p className="text-xs mt-1" style={{ color: 'var(--gym-accent2)' }}>{fieldErrors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="gym-label">Gender *</label>
              <div className="flex gap-3">
                {['Male', 'Female'].map((gender) => (
                  <label
                    key={gender}
                    className="flex items-center gap-2 cursor-pointer flex-1 px-4 py-2.5 rounded-xl transition-all"
                    style={{
                      border: `1px solid ${form.gender === gender ? 'var(--gym-accent)' : 'var(--gym-border)'}`,
                      background: form.gender === gender ? 'rgba(232,255,71,.08)' : 'var(--gym-surface)',
                    }}
                  >
                    <input type="radio" name="gender" value={gender} checked={form.gender === gender} onChange={handleChange} className="hidden" />
                    <span className="text-sm font-medium" style={{ color: form.gender === gender ? 'var(--gym-accent)' : 'var(--gym-text)' }}>{gender}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="gym-label">
                Email Address *
                {emailOtpStep === 2 && <span className="ml-2 text-xs font-bold" style={{ color: 'var(--gym-success)' }}>Verified</span>}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--gym-muted)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="gym-input pl-9"
                    placeholder="yourname@gmail.com"
                    required
                    autoComplete="email"
                    disabled={emailOtpStep === 2}
                    style={fieldErrors.email ? { borderColor: 'var(--gym-accent2)' } : (emailOtpStep === 2 ? { opacity: 0.7 } : {})}
                  />
                </div>
                {emailOtpStep !== 2 && (
                  <button type="button" className="btn btn-secondary text-sm flex-shrink-0" onClick={emailOtpStep === 0 ? sendEmailOtp : verifyEmailOtp} disabled={emailOtpLoading || (emailOtpStep === 0 && !form.email)}>
                    {emailOtpLoading ? '...' : emailOtpStep === 0 ? 'Send OTP' : 'Verify'}
                  </button>
                )}
              </div>
              {emailOtpStep === 1 && (
                <div className="mt-2 flex gap-2 items-center">
                  <input
                    className="gym-input text-center tracking-[0.4em] text-lg flex-1"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    value={emailOtpCode}
                    onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <button type="button" className="btn btn-primary text-sm flex-shrink-0" onClick={verifyEmailOtp} disabled={emailOtpLoading || emailOtpCode.length < 4}>
                    {emailOtpLoading ? '...' : 'Confirm'}
                  </button>
                </div>
              )}
              {emailOtpMsg && <p className="text-xs mt-1" style={{ color: msgColor(emailOtpMsgType) }}>{emailOtpMsg}</p>}
              {fieldErrors.email
                ? <p className="text-xs mt-1" style={{ color: 'var(--gym-accent2)' }}>⚠ {fieldErrors.email}</p>
                : form.email && GMAIL_REGEX.test(form.email.trim())
                  ? <p className="text-xs mt-1" style={{ color: 'var(--gym-success)' }}>✓ Valid Gmail address</p>
                  : form.email
                    ? <p className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>Must end with @gmail.com</p>
                    : null
              }
            </div>

            <div>
              <label className="gym-label">
                Phone Number *
                {otpStep === 2 && <span className="ml-2 text-xs font-bold" style={{ color: 'var(--gym-success)' }}>Verified</span>}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--gym-muted)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012.18 0h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.85.58 2.81.7A2 2 0 0122 14.92z" />
                    </svg>
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    className="gym-input pl-9"
                    placeholder="0771234567"
                    disabled={otpStep === 2}
                    style={otpStep === 2 ? { opacity: 0.7 } : {}}
                  />
                </div>
                {otpStep !== 2 && (
                  <button type="button" className="btn btn-secondary text-sm flex-shrink-0" onClick={otpStep === 0 ? sendOtp : verifyOtp} disabled={otpLoading || (otpStep === 0 && !form.phone)}>
                    {otpLoading ? '...' : otpStep === 0 ? 'Send OTP' : 'Verify'}
                  </button>
                )}
              </div>
              {otpStep === 1 && (
                <div className="mt-2 flex gap-2 items-center">
                  <input
                    className="gym-input text-center tracking-[0.4em] text-lg flex-1"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <button type="button" className="btn btn-primary text-sm flex-shrink-0" onClick={verifyOtp} disabled={otpLoading || otpCode.length < 4}>
                    {otpLoading ? '...' : 'Confirm'}
                  </button>
                </div>
              )}
              {otpMsg && <p className="text-xs mt-1" style={{ color: msgColor(otpMsgType) }}>{otpMsg}</p>}
              {fieldErrors.phone && (
                <p className="text-xs mt-1" style={{ color: 'var(--gym-accent2)' }}>{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="gym-label">Register As</label>
              <select name="role_id" value={form.role_id} onChange={handleChange} className="gym-input w-full">
                <option value="3">Member</option>
                <option value="2">Trainer</option>
              </select>
            </div>

            <div>
              <label className="gym-label">Password *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--gym-muted)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
                <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} className="gym-input pl-9 pr-10" placeholder="Min. 6 characters" required autoComplete="new-password" />
                <button type="button" onClick={() => setShowPass((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ background: 'none', border: 'none', color: 'var(--gym-muted)', cursor: 'pointer' }}>
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div>
              <label className="gym-label">Confirm Password *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--gym-muted)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className="gym-input pl-9 pr-10" placeholder="Re-enter password" required autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirm((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ background: 'none', border: 'none', color: 'var(--gym-muted)', cursor: 'pointer' }}>
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,71,71,.08)', border: '1px solid rgba(255,71,71,.22)', color: 'var(--gym-accent2)' }}>
                <span>Warning</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || imageUploading}
              className="btn btn-primary w-full justify-center py-3"
              style={{ fontFamily: "'Bebas Neue', cursive", letterSpacing: '0.1em', fontSize: '1.1rem' }}
            >
              {loading ? (
                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <>
                  <span>Create Account</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <p className="text-sm" style={{ color: 'var(--gym-muted)' }}>
                Already have an account?{' '}
                <Link to="/login" className="font-semibold hover:opacity-80" style={{ color: 'var(--gym-accent)', textDecoration: 'none' }}>
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}