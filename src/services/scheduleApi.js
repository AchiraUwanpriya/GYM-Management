import { apiClient, toForm } from './_apiClient';

// ── TIMESLOTS ──────────────────────────────────────────────
export const getAllTimeslots  = () => apiClient.get('/TimeSlot/GetAllTimeSlot');
// FIX: TimeslotRequestAPI has no plain "id", only p_timeslot_id.
export const getTimeslotById  = (id) => apiClient.get(`/TimeSlot/GetTimeSlotById?p_timeslot_id=${id}`);
// FIX: needs p_admin_id, not adminId.
export const addTimeslot = (req, adminId) =>
  apiClient.post('/TimeSlot/AddTimeSlot', toForm({ p_starttime: req.p_starttime, p_endtime: req.p_endtime, adminId, p_admin_id: adminId }));
export const editTimeslot  = (req, adminId) => apiClient.post('/TimeSlot/EditTimeSlot', toForm({ ...req, adminId, p_admin_id: adminId }));
export const deleteTimeslot = (id, adminId) => apiClient.post('/TimeSlot/DeleteTimeSlot', toForm({ id, p_timeslot_id: id, adminId, p_admin_id: adminId }));

// ── SCHEDULES ──────────────────────────────────────────────
export const getAllSchedules       = () => apiClient.get('/Schedule/GetAllSchedule');
// FIX: needs p_schedule_id.
export const getScheduleById       = (id) => apiClient.get(`/Schedule/GetScheduleById?p_schedule_id=${id}`);
// FIX: needs p_member_id.
export const getSchedulesByMember  = (memberId)  => apiClient.get(`/Schedule/GetScheduleByMember?p_member_id=${memberId}`);
// FIX: needs p_trainer_id.
export const getSchedulesByTrainer = (trainerId) => apiClient.get(`/Schedule/GetScheduleByTrainer?p_trainer_id=${trainerId}`);
// FIX: needs p_schedule_date.
export const getSchedulesByDate    = (scheduleDate) => apiClient.get(`/Schedule/GetScheduleByDate?p_schedule_date=${scheduleDate}`);
export const addSchedule           = (req, adminId) => apiClient.post('/Schedule/AddSchedule', toForm({ ...req, adminId, p_admin_id: adminId }));
export const editSchedule          = (req, adminId) => apiClient.post('/Schedule/EditSchedule', toForm({ ...req, adminId, p_admin_id: adminId }));
// FIX: needs p_schedule_id / p_status / p_admin_id / p_reason.
export const updateScheduleStatus  = (scheduleId, status, reason, adminId) =>
  apiClient.post('/Schedule/UpdateScheduleStatus', toForm({
    scheduleId, status, adminId,
    p_schedule_id: scheduleId, p_status: status, p_admin_id: adminId,
    ...(reason ? { reason, p_reason: reason } : {}),
  }));
export const deleteSchedule        = (id, adminId) => apiClient.post('/Schedule/DeleteSchedule', toForm({ id, p_schedule_id: id, adminId, p_admin_id: adminId }));

// ── TRAINER TIME SLOTS ─────────────────────────────────────
// NOTE: these are also defined in trainerApi.js. Both files used to export
// the exact same names — since api.js does `export * from './scheduleApi'`
// AND `export * from './trainerApi'`, that made every one of these names
// ambiguous and JS silently drops ambiguous bindings from an `export *`
// barrel, so `api.approveTrainerTimeslot` etc. were likely undefined at the
// call site. This copy (with corrected p_ param names) is now the only one —
// the duplicates were removed from trainerApi.js.
export const getAllTrainerTimeslots = () => apiClient.get('/TrainerTimeSlot/GetAllTrainerTimeSlot');
export const getTrainerTimeslots   = (trainerId) => apiClient.get(`/TrainerTimeSlot/GetTrainerTimeSlotByTrainer?p_trainer_id=${trainerId}`);
export const addTrainerTimeslot = (req) => apiClient.post('/TrainerTimeSlot/AddTrainerTimeSlot', toForm(req));
export const approveTrainerTimeslot = (p_trainer_timeslot_id, p_is_active, p_admin_id) =>
  apiClient.post('/TrainerTimeSlot/ApproveOrRejectTrainerTimeSlot', toForm({ p_trainer_timeslot_id, p_is_active, p_admin_id }));
export const deleteTrainerTimeslot = (p_trainer_timeslot_id, p_admin_id) => 
  apiClient.post('/TrainerTimeSlot/DeleteTrainerTimeSlot', toForm({ p_trainer_timeslot_id, p_admin_id }));