import { apiClient, toForm } from './_apiClient';

// ── RFID Tags ─────────────────────────────────────────────
export const getAllRfidTags     = () => apiClient.get('/RfidTag/GetAllRfid');
// FIX: RfidTagRequestAPI has no plain "id", only p_rfid_id.
export const getRfidTagById     = (id) => apiClient.get(`/RfidTag/GetRfidById?p_rfid_id=${id}`);
export const getRfidByNumber    = (rfidNumber) => apiClient.get(`/RfidTag/GetByRfidNumber?p_rfid_number=${encodeURIComponent(rfidNumber)}`);

export const addRfidTag = (req, adminId) =>
  apiClient.post('/RfidTag/AddRfid', toForm({
    p_issue_date:  req.p_issue_date,
    p_is_active:   req.p_is_active ?? 1,
    p_rfid_number: req.p_rfid_number || '',
    p_admin_id:    adminId,
  }));
export const editRfidTag        = (req, adminId) => apiClient.post('/RfidTag/EditRfid', toForm({ ...req, adminId, p_admin_id: adminId }));
export const deleteRfidTag      = (id, adminId)  => apiClient.post('/RfidTag/DeleteRfid', toForm({ id, p_rfid_id: id, adminId, p_admin_id: adminId }));
// FIX: needs p_rfid_id / p_admin_id, and the real action name is
// ToggleRfidStatus, not the bare ToggleStatus this used to call (404).
export const toggleRfidStatus  = (rfidId, adminId) => apiClient.post('/RfidTag/ToggleRfidStatus', toForm({ rfidId, adminId, p_rfid_id: rfidId, p_admin_id: adminId }));
// FIX: needs p_rfid_id / p_member_id / p_admin_id. Also the backend exposes
// two SEPARATE actions — AssignRfidToMember and AssignRfidToTrainer — each
// calling a different business-layer method (_rfidTag.AssignToMember vs
// _rfidTag.AssignToTrainer). The old URL '/RfidTag/AssignToMember' doesn't
// exist at all (real name is AssignRfidToMember), and isTrainer=true never
// reached the trainer logic since there's no such branch server-side under
// that action — it needs the dedicated AssignRfidToTrainer endpoint.
export const assignRfidToMember = (rfidId, memberId, adminId, isTrainer = false) =>
  apiClient.post(isTrainer ? '/RfidTag/AssignRfidToTrainer' : '/RfidTag/AssignRfidToMember', toForm({
    rfidId, memberId, adminId,
    p_rfid_id: rfidId,
    [isTrainer ? 'p_trainer_id' : 'p_member_id']: memberId,
    p_admin_id: adminId,
  }));

// ── Attendance ────────────────────────────────────────────
export const getAllAttendance         = () => apiClient.get('/Attendance/GetAllAttendance');
// FIX: needs p_member_id.
export const getMemberAttendance     = (memberId) => apiClient.get(`/Attendance/GetAttendanceByMember?p_member_id=${memberId}`);
export const getTodayAttendance      = () => apiClient.get('/Attendance/TodayAttendance');
// FIX: needs p_date_from / p_date_to.
export const getAttendanceByDateRange = (dateFrom, dateTo) =>
  apiClient.get(`/Attendance/GetAttendanceByDateRange?p_date_from=${dateFrom}&p_date_to=${dateTo}`);
// FIX: needs p_rfid_id.
export const checkIn  = (rfidId) => apiClient.post('/Attendance/CheckInAttendance', toForm({ rfidId, p_rfid_id: rfidId }));
export const checkOut = (rfidId) => apiClient.post('/Attendance/CheckOutAttendance', toForm({ rfidId, p_rfid_id: rfidId }));
export const tapRFID  = (rfidId) => checkIn(rfidId);