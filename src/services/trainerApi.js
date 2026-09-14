import { apiClient, toForm } from './_apiClient';

// ── TRAINERS ──────────────────────────────────────────────
export const getAllTrainers      = () => apiClient.get('/Trainer/GetAllTrainer');
// FIX: TrainerRequestAPI has no plain "id", only p_trainer_id.
export const getTrainerById = (id) => apiClient.get(`/Trainer/GetTrainerById?p_trainer_id=${id}`);
// FIX: needs p_user_id.
export const getTrainerByUserId  = (userId) => apiClient.get(`/Trainer/GetTrainerByUserId?p_user_id=${userId}`);

// ── NEW: Check if an email or phone is already registered on the User table.
// Pass exactly one of { email } or { phone }.
// GET /User/GetPhoneOrEmail?p_email=... or ?p_phone=...
export const checkPhoneOrEmail = ({ email, phone } = {}) => {
  const qs = email
    ? `p_email=${encodeURIComponent(email)}`
    : `p_phone=${encodeURIComponent(phone)}`;
  return apiClient.get(`/User/GetUserPhoneOrEmail?${qs}`);
};

// ── NEW: Admin-side "create the parent User row for a new Trainer".
// role_id is hard-locked to 2 (Trainer) and status to 'active' — admin-added
// trainers skip OTP/pending entirely on the User row (the Trainer row itself
// still gets created via GYM_TRAINER_PROC with its own 'active' status).
// FIX: '/User/Add' is not a real route — UserController has no "Add" action.
// The only endpoint that creates a User row is UserRegister (same
// _user.AddUser business method), so this now posts through
// /User/UserRegister instead.
// POST /User/UserRegister → USER_PROC ActionType '4'
export const registerTrainerUser = (payload, adminId) => {
  return apiClient.post('/User/UserRegister', toForm({
    p_first_name: payload.p_first_name,
    p_last_name: payload.p_last_name,
    p_email: payload.p_email,
    p_phone: payload.p_phone,
    p_gender: payload.p_gender || null,
    p_password_hash: payload.p_password_hash,
    p_role_id: 2, // Trainer
    p_image_path: payload.p_image_path || '',
    p_status: 'active',
    p_admin_id: adminId,
  }));
};

export const addTrainer          = (req, adminId) => apiClient.post('/Trainer/AddTrainer', toForm({ ...req, adminId, p_admin_id: adminId }));
export const editTrainer         = (req, adminId) => apiClient.post('/Trainer/EditTrainer', toForm({ ...req, adminId, p_admin_id: adminId }));
export const deleteTrainer       = (id, adminId)  => apiClient.post('/Trainer/DeleteTrainer', toForm({ id, p_trainer_id: id, adminId, p_admin_id: adminId }));

// ── TRAINER ASSIGNMENTS ───────────────────────────────────
export const getAllAssignments         = () => apiClient.get('/TrainerAssignment/GetAllTrainerAssignment');
// FIX: needs p_member_id.
export const getAssignmentsByMember   = (memberId)  => apiClient.get(`/TrainerAssignment/GetTrainerAssignmentByMember?p_member_id=${memberId}`);
// FIX: needs p_trainer_id.
export const getAssignmentsByTrainer  = (trainerId) => apiClient.get(`/TrainerAssignment/GetTrainerAssignmentByTrainer?p_trainer_id=${trainerId}`);
export const addAssignment            = (req, adminId) => apiClient.post('/TrainerAssignment/AddTrainerAssignment', toForm({ ...req, adminId, p_admin_id: adminId }));
export const deleteAssignment         = (id, adminId)  => apiClient.post('/TrainerAssignment/DeleteTrainerAssignment', toForm({ id, p_assignment_id: id, adminId, p_admin_id: adminId }));
// FIX: needs p_assignment_id / p_status / p_admin_id.
export const updateAssignmentStatus   = (id, status, adminId) =>
  apiClient.post('/TrainerAssignment/UpdateTrainerAssignmentStatus', toForm({ assignmentId: id, status, adminId, p_assignment_id: id, p_status: status, p_admin_id: adminId }));
// FIX: needs p_assignment_id / p_member_id.
export const cancelAssignment         = (assignmentId, memberId) =>
  apiClient.post('/TrainerAssignment/CancelTrainerAssignment', toForm({ assignmentId, memberId, p_assignment_id: assignmentId, p_member_id: memberId }));

// ── TRAINER TIME SLOTS ────────────────────────────────────
// MOVED: these used to be duplicated here AND in scheduleApi.js. Two modules
// exporting the same name make `export * from ...` in api.js ambiguous for
// that name, and JS drops ambiguous bindings from the barrel — so
// api.getTrainerTimeslots / approveTrainerTimeslot / deleteTrainerTimeslot
// were likely undefined at the call site no matter which file "won".
// scheduleApi.js is now the single source for these — import from there.

// ── TRAINER ATTENDANCE ────────────────────────────────────
export const getAllTrainerAttendance      = () => apiClient.get('/TrainerAttendance/GetAllTrainerAttendance');
// FIX: needs p_trainer_id.
export const getTrainerAttendanceByTrainer = (trainerId) => apiClient.get(`/TrainerAttendance/GetTrainerAttendanceByTrainer?p_trainer_id=${trainerId}`);
export const getTodayTrainerAttendance   = () => apiClient.get('/TrainerAttendance/GetTrainerAttendanceToday');
// FIX: needs p_date_from / p_date_to.
export const getTrainerAttendanceByDateRange = (dateFrom, dateTo) =>
  apiClient.get(`/TrainerAttendance/GetTrainerAttendanceByDateRange?p_date_from=${dateFrom}&p_date_to=${dateTo}`);
// FIX: needs p_trainer_id.
export const trainerCheckIn  = (trainerId) => apiClient.post('/TrainerAttendance/CheckInTrainerAttendance', toForm({ trainerId, p_trainer_id: trainerId }));
export const trainerCheckOut = (trainerId) => apiClient.post('/TrainerAttendance/CheckOutTrainerAttendance', toForm({ trainerId, p_trainer_id: trainerId }));
// Returns array of trainer IDs who are available right now (server-side check)
export const getAvailableNow = () => apiClient.get('/Trainer/GetTrainerAvailableNow');