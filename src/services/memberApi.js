import { apiClient, toForm } from './_apiClient';

// GET /Member/GetAll
export const getAllMembers = () => apiClient.get('/Member/GetAllMember');

// FIX: MemberRequestAPI has no plain "id", only p_member_id.
export const getMemberById = (id) => apiClient.get(`/Member/GetMemberById?p_member_id=${id}`);

// FIX: needs p_user_id, not userId.
export const getMemberByUserId = (userId) => apiClient.get(`/Member/GetMemberByUserId?p_user_id=${userId}`);

// ── NEW: Check if an email or phone is already registered on the User table.
// Pass exactly one of { email } or { phone }.
// GET /User/GetPhoneOrEmail?p_email=... or ?p_phone=...
export const checkPhoneOrEmail = ({ email, phone } = {}) => {
  const qs = email
    ? `p_email=${encodeURIComponent(email)}`
    : `p_phone=${encodeURIComponent(phone)}`;
  return apiClient.get(`/User/GetUserPhoneOrEmail?${qs}`);
};

// ── NEW: Admin-side "create the parent User row for a new Member".
// role_id is hard-locked to 3 (Member) and status to 'active' — admin-added
// members skip OTP/pending entirely. Returns the raw axios response; caller
// must pull the new userId out of res.data (see Members.jsx for the exact keys checked).
// FIX: '/User/Add' is not a real route — UserController has no "Add" action
// at all. The only endpoint that creates a User row is UserRegister, which
// calls the same _user.AddUser(requestAPI) business method, so this now
// posts through /User/UserRegister instead. (Whether the backend actually
// honors an admin-supplied p_status/p_role_id here, vs. always defaulting to
// the public pending/OTP flow, depends on IUser.AddUser's implementation,
// which isn't in the Controllers zip — verify server-side if admin-added
// members still show up as "pending".)
// POST /User/UserRegister → USER_PROC ActionType '4'
export const registerMemberUser = (payload, adminId) => {
  return apiClient.post('/User/UserRegister', toForm({
    p_first_name: payload.p_first_name,
    p_last_name: payload.p_last_name,
    p_email: payload.p_email,
    p_phone: payload.p_phone,
    p_gender: payload.p_gender || null,
    p_password_hash: payload.p_password_hash,
    p_role_id: 3, // Member
    p_image_path: payload.p_image_path || '',
    p_status: 'active', // admin-created — no OTP / no pending approval on the User row
    p_admin_id: adminId,
  }));
};

// POST /Member/Add → GYM_MEMBER_PROC action 3 (ADD).
// FIX: This procedure ONLY inserts into the Member table for an EXISTING
// user — it does not create a User row. It requires p_user_id and will
// return "p_user_id is required to add a member." if that's missing.
// The old version sent p_username/p_email/p_phone/p_password_hash, which
// this procedure has no parameters for at all, and never sent p_user_id.
//
// Correct flow: create the User first (registerMemberUser above), get back
// the new userId, then call addMember({ p_user_id: newUserId, ... }, adminId).
export const addMember = (req, adminId) => {
  if (!req?.p_user_id) {
    console.warn('addMember: p_user_id is required — create the User first via registerMemberUser().');
  }
  return apiClient.post('/Member/AddMember', toForm({
    p_user_id: req.p_user_id,
    p_first_name: req.p_first_name ?? req.firstName,
    p_last_name: req.p_last_name ?? req.lastName,
    p_join_date: req.p_join_date ?? req.joinDate,
    p_blood_group: req.p_blood_group ?? req.blood_group,
    p_height: req.p_height ?? req.height,
    p_weight: req.p_weight ?? req.weight,
    p_fitness_goal: req.p_fitness_goal ?? req.fitness_goal,
    p_rfid_id: req.p_rfid_id ?? req.rfId_Id,
    p_admin_id: adminId,
  }));
};

export const editMember = (req, adminId) =>
  apiClient.post('/Member/EditMember', toForm({ ...req, p_admin_id: adminId }));

// FIX: needs p_member_id / p_admin_id.
export const deleteMember = (id, adminId) =>
  apiClient.post('/Member/DeleteMember', toForm({ id, p_member_id: id, adminId, p_admin_id: adminId }));