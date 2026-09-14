import { apiClient, toForm } from './_apiClient';

// ── IMAGE UPLOAD ───────────────────────────────────────────────────────────
export const uploadUserImage = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return apiClient.post('/User/UploadUserImage', fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// ── SIGN IN ────────────────────────────────────────────────────────────────
export const loginUser = (emailOrPhone, password) => {
  const isEmail = emailOrPhone.includes('@');
  return apiClient.post('/User/UserLogin', toForm(isEmail 
    ? { p_email: emailOrPhone, p_password_hash: password }
    : { p_phone: emailOrPhone, p_password_hash: password }
  ));
};

// ── OAUTH ──────────────────────────────────────────────────────────────────
// FIX: backend's OAuthLogin action binds to GoogleOAuthRequest, which has a
// single field: IdToken. It re-verifies that raw Google ID token itself
// against Google's tokeninfo endpoint (GoogleOauth.VerifyIdToken) and reads
// email/name/sub from THAT — it never reads providerName/providerUserId/
// email/name from the request body, so the old signature silently sent
// data the backend simply ignores, then failed with 401 because IdToken
// was never included at all.
export const oauthLogin = (idToken) =>
  apiClient.post('/User/UserOAuthLogin', toForm({ IdToken: idToken }));

// ── REGISTER ───────────────────────────────────────────────────────────────
export const registerUser = (payload) =>
  apiClient.post('/User/UserRegister', toForm(payload));

// ── CHECK USER EXISTS ──────────────────────────────────────────────────────
export const checkUserExists = (identifier) => {
  const isEmail = identifier.includes('@');
  const param = isEmail ? `p_email=${encodeURIComponent(identifier)}` : `p_phone=${encodeURIComponent(identifier)}`;
  return apiClient.get(`/User/GetUserPhoneOrEmail?${param}`);
};

// ── FORGOT PASSWORD — 3-step ───────────────────────────────────────────────
export const forgotPassword = (identifier, deliveryMethod = 'sms') => {
  const isEmail = identifier.includes('@');
  return apiClient.post('/User/UserForgotPassword', toForm({
    [isEmail ? 'p_email' : 'p_phone']: identifier,
    deliveryMethod
  }));
};

export const verifyResetCode = (identifier, code) => {
  const isEmail = identifier.includes('@');
  return apiClient.post('/User/UserVerifyResetCode', toForm({
    [isEmail ? 'p_email' : 'p_phone']: identifier,
    p_otp_code: code
  }));
};

export const resetPassword = (identifier, code, newPassword) => {
  const isEmail = identifier.includes('@');
  return apiClient.post('/User/UserResetPassword', toForm({
    [isEmail ? 'p_email' : 'p_phone']: identifier,
    p_otp_code: code,
    p_new_password: newPassword
  }));
};

// ── PHONE OTP — Registration ───────────────────────────────────────────────
export const sendPhoneOtp = (phone) =>
  apiClient.post('/User/SendPhoneOtp', toForm({ p_phone: phone }));

export const sendEmailOtp = (email) =>
  apiClient.post('/User/SendEmailOtp', toForm({ p_user_id: 3, p_email: email }));

// NOTE: /User/VerifyPhoneOtp is commented out on the backend (UserController.cs) —
// there is no live route for it anymore. Registration OTP matching is done
// entirely client-side against the code SendPhoneOtp returns, same pattern
// as forgot-password. Keeping this here would just 404; call sites should
// compare the code locally instead of calling this.
// export const verifyPhoneOtp = (phone, code) => ...

// ── EMAIL OTP — Edit Profile / Account Actions ────────────────────────────
// NOTE: requires a logged-in JWT ([JwtAuthorize] on the backend) — only use
// this for an already-authenticated user editing their own email/phone,
// never for the anonymous forgot-password flow (use forgotPassword() there).
export const sendEditOtp = (userId, email) =>
  apiClient.post('/User/SendEmailOtp', toForm({ p_user_id: userId, p_email: email }));