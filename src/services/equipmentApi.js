import { apiClient, toForm } from './_apiClient';

// ── EQUIPMENT ─────────────────────────────────────────────
export const getAllEquipment  = () => apiClient.get('/Equipment/GetAllEquipment');
// FIX: EquipmentRequestAPI has no plain "id", only p_equipment_Id.
export const getEquipmentById  = (id) => apiClient.get(`/Equipment/GetEquipmentById?p_equipment_Id=${id}`);
export const addEquipment      = (req, adminId) => apiClient.post('/Equipment/AddEquipment', toForm({ ...req, adminId, p_admin_Id: adminId }));
export const editEquipment     = (req, adminId) => apiClient.post('/Equipment/EditEquipment', toForm({ ...req, adminId, p_admin_Id: adminId }));
export const deleteEquipment   = (id, adminId)  => apiClient.post('/Equipment/DeleteEquipment', toForm({ id, p_equipment_Id: id, adminId, p_admin_Id: adminId }));

// FIX (missing): confirmed working in Postman —
// POST /Equipment/UpdateStatus { p_equipment_Id, p_status, p_admin_Id }
export const updateEquipmentStatus = (equipmentId, status, adminId) =>
  apiClient.post('/Equipment/UpdateStatusEquipment', toForm({
    p_equipment_Id: equipmentId,
    p_status: status,
    p_admin_Id: adminId,
  }));

// NOTE (backend gap, not fixable from the frontend alone): EquipmentRequestAPI
// has p_rfid_id / p_ea_id / p_device_id / p_member_id / p_starttime / p_endtime /
// p_actual_mins all commented out in the model — Tag/TagIn/TagOut have nothing
// to bind equipmentId/rfidId/memberId into no matter what key names are sent.
// These need those properties un-commented on the backend model before any
// frontend fix can take effect.
export const tagEquipmentRfid  = (equipmentId, rfidId) => apiClient.post('/Equipment/Tag', toForm({ equipmentId, rfidId, p_equipment_Id: equipmentId }));
export const tagEquipmentIn    = (equipmentId, memberId) => apiClient.post('/Equipment/TagInEquipment', toForm({ equipmentId, memberId, p_equipment_Id: equipmentId }));
export const tagEquipmentOut   = (equipmentId, memberId) => apiClient.post('/Equipment/TagOutEquipment', toForm({ equipmentId, memberId, p_equipment_Id: equipmentId }));
// FIX: needs p_member_id.
export const getMemberActiveSessions = (memberId) => apiClient.get(`/Equipment/MemberActiveSessionsEquipment?p_member_id=${memberId}`);

// ── EQUIPMENT ASSIGNMENTS ─────────────────────────────────
export const getAllEquipmentAssignments           = () => apiClient.get('/EquipmentAssignment/GetAllEquipmentAssignment');
// FIX: EquipmentAssignmentRequestAPI needs p_schedule_id / p_member_id.
export const getEquipmentAssignmentsBySchedule    = (scheduleId) => apiClient.get(`/EquipmentAssignment/GetEquipmentAssignmentBySchedule?p_schedule_id=${scheduleId}`);
export const getEquipmentAssignmentsByMember      = (memberId)   => apiClient.get(`/EquipmentAssignment/GetEquipmentAssignmentByMember?p_member_id=${memberId}`);
export const addEquipmentAssignment               = (req, adminId) => apiClient.post('/EquipmentAssignment/AddEquipmentAssignment', toForm({ ...req, adminId, p_admin_id: adminId }));
export const editEquipmentAssignment              = (req, adminId) => apiClient.post('/EquipmentAssignment/EditEquipmentAssignment', toForm({ ...req, adminId, p_admin_id: adminId }));
export const deleteEquipmentAssignment            = (id, adminId)  => apiClient.post('/EquipmentAssignment/DeleteEquipmentAssignment', toForm({ id, p_ea_id: id, adminId, p_admin_id: adminId }));

// ── EQUIPMENT USAGE LOG (Live RFID Tracking) ──────────────
export const getAllEquipmentUsageLogs  = () => apiClient.get('/EquipmentUsageLog/GetAllEquipmentUsageLog');
// FIX: needs p_member_id.
export const getEquipmentUsageByMember = (memberId) => apiClient.get(`/EquipmentUsageLog/GetEquipmentUsageLogByMember?p_member_id=${memberId}`);
export const getLiveEquipmentUsage     = () => apiClient.get('/EquipmentUsageLog/ActiveLogsEquipmentUsageLog');
export const startEquipmentUsage       = (req) => apiClient.post('/EquipmentUsageLog/StartEquipmentUsageLog', toForm(req));
// FIX: EquipmentUsageLogRequestAPI needs p_log_id / p_endtime / p_actual_mins,
// not logId/endtime/actualMins.
// FIX: GYM_EQUIPMENT_USAGE_LOG_PROC ActionType '7' (End Usage) looks the active
// session up by p_rfid_id, not p_log_id — p_log_id is accepted but unused by
// the proc. Always send rfid so the end-usage call actually finds the session.
export const endEquipmentUsage         = (logId, endtime, actualMins, rfidId) =>
  apiClient.post('/EquipmentUsageLog/EndEquipmentUsageLog', toForm({ p_log_id: logId, p_endtime: endtime, p_actual_mins: actualMins, p_rfid_id: rfidId }));

// ── EXERCISE CATALOG ──────────────────────────────────────
export const getExerciseCatalog  = () => apiClient.get('/Exercise/GetAllExercise');
// FIX: needs p_exercise_id.
export const getExerciseById     = (id) => apiClient.get(`/Exercise/GetExerciseById?p_exercise_id=${id}`);
export const addExercise         = (req, adminId) => apiClient.post('/Exercise/AddExercise', toForm({ ...req, adminId, p_admin_id: adminId }));
export const editExercise        = (req, adminId) => apiClient.post('/Exercise/EditExercise', toForm({ ...req, adminId, p_admin_id: adminId }));
export const deleteExercise      = (id, adminId)  => apiClient.post('/Exercise/DeleteExercise', toForm({ id, p_exercise_id: id, adminId, p_admin_id: adminId }));

// FIX (missing): confirmed working in Postman —
// POST /Exercise/UpdateStatus { p_status, p_exercise_id, p_admin_id }
export const updateExerciseStatus = (exerciseId, status, adminId) =>
  apiClient.post('/Exercise/UpdateStatusExercise', toForm({
    p_status: status,
    p_exercise_id: exerciseId,
    p_admin_id: adminId,
  }));

// ── DEVICES ───────────────────────────────────────────────
export const getDevices    = () => apiClient.get('/Device/GetAllDevice');
export const addDevice     = (req, adminId) => apiClient.post('/Device/AddDevice', toForm({ ...req, adminId, p_admin_id: adminId }));
export const editDevice    = (req, adminId) => apiClient.post('/Device/EditDevice', toForm({ ...req, adminId, p_admin_id: adminId }));
export const deleteDevice  = (id, adminId)  => apiClient.post('/Device/DeleteDevice', toForm({ id, p_device_id: id, adminId, p_admin_id: adminId }));

// ── NOTIFICATIONS ─────────────────────────────────────────
// NotificationController takes plain (int adminId) method params, not a
// RequestAPI model, so "adminId" binds directly — these two are fine as-is.
export const runExpiryCheck        = (adminId) => apiClient.get(`/Notification/RunExpiryCheck?adminId=${adminId}`);
export const runIncompleteSchedule = (adminId) => apiClient.get(`/Notification/RunIncompleteSchedule?adminId=${adminId}`);