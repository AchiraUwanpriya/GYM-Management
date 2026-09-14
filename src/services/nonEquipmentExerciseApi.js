import { apiClient, toForm } from './_apiClient';

// GET /NonEquipmentExercise/GetAll
export const getAllNonEquipmentExercises = () => apiClient.get('/NonEquipmentExercise/GetAllNonEquipmentExercise');

// FIX: needs p_schedule_id, not scheduleId.
export const getNonEquipmentBySchedule = (scheduleId) =>
  apiClient.get(`/NonEquipmentExercise/GetNonEquipmentExerciseBySchedule?p_schedule_id=${scheduleId}`);

// FIX: needs p_member_id, not memberId.
export const getNonEquipmentByMember = (memberId) =>
  apiClient.get(`/NonEquipmentExercise/GetNonEquipmentExerciseByMember?p_member_id=${memberId}`);

// POST /NonEquipmentExercise/Add — explicit p_ keys for MVC binding
export const addNonEquipmentExercise = (req, adminId) =>
  apiClient.post('/NonEquipmentExercise/AddNonEquipmentExercise', toForm({
    p_schedule_id: req.p_schedule_id,
    p_exercise_id: req.p_exercise_id,
    p_sets:        req.p_sets || '',
    p_reps:        req.p_reps || '',
    p_sub_status:  req.p_sub_status || 'pending',
    p_admin_id:    adminId,
  }));

// POST /NonEquipmentExercise/Edit
export const editNonEquipmentExercise = (req, adminId) =>
  apiClient.post('/NonEquipmentExercise/EditNonEquipmentExercise', toForm({ ...req, adminId, p_admin_id: adminId }));

// POST /NonEquipmentExercise/UpdateStatus → p_use_id, p_sub_status
export const updateNonEquipmentStatus = (useId, status) =>
  apiClient.post('/NonEquipmentExercise/UpdateStatusNonEquipmentExercise', toForm({ p_use_id: useId, p_sub_status: status }));

// FIX: needs p_use_id / p_admin_id, not id/adminId.
export const deleteNonEquipmentExercise = (id, adminId) =>
  apiClient.post('/NonEquipmentExercise/DeleteNonEquipmentExercise', toForm({ id, p_use_id: id, adminId, p_admin_id: adminId }));

// FIX: Approve reads p_use_id / p_approval_status / p_admin_id — the model
// has a separate p_approval_status field from p_sub_status, and none of
// useId/approvalStatus/adminId (no p_ prefix) ever bound.
export const approveNonEquipmentExercise = (useId, approvalStatus, adminId) =>
  apiClient.post('/NonEquipmentExercise/ApproveNonEquipmentExercise', toForm({
    useId, approvalStatus, adminId,
    p_use_id: useId, p_approval_status: approvalStatus, p_admin_id: adminId,
  }));