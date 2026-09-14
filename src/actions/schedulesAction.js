import{FETCH_SCHEDULES_REQUEST}from '../constants/ScheduleConstant';
import{FETCH_SCHEDULES_SUCCESS}from '../constants/ScheduleConstant';
import{FETCH_SCHEDULES_FAILURE}from '../constants/ScheduleConstant';
import * as api from '../services/scheduleApi';
import * as memberApi from '../services/memberApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

const fetchSchedulesRequests = new Map();

export const fetchSchedules = (memberId, trainerId) => (dispatch) => {
  const requestKey = `${memberId || ''}:${trainerId || ''}`;
  if (fetchSchedulesRequests.has(requestKey)) return fetchSchedulesRequests.get(requestKey);

  dispatch({ type: FETCH_SCHEDULES_REQUEST });

  const request = (memberId
    ? api.getSchedulesByMember(memberId)
    : trainerId
      ? api.getSchedulesByTrainer(trainerId)
      : api.getAllSchedules())
    .then((res) => {
      dispatch({ type: FETCH_SCHEDULES_SUCCESS, payload: res.data?.ResultSet || [] });
    })
    .catch(() => {
      dispatch({ type: FETCH_SCHEDULES_FAILURE });
      dispatch(showToast('Failed to load schedules', 'error'));
    })
    .finally(() => {
      fetchSchedulesRequests.delete(requestKey);
    });

  fetchSchedulesRequests.set(requestKey, request);
  return request;
};

export const fetchSchedulesByMember  = (memberId)  => fetchSchedules(memberId, null);
export const fetchSchedulesByTrainer = (trainerId) => fetchSchedules(null, trainerId);

export const addSchedule = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.addSchedule(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Schedule created!', 'success'));
      dispatch(fetchSchedules());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to create schedule', 'error')); }
  return false;
};

export const editSchedule = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.editSchedule(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Schedule updated!', 'success'));
      dispatch(fetchSchedules());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to update schedule', 'error')); }
  return false;
};

export const updateScheduleStatus = (scheduleId, status, reason) => async (dispatch, getState) => {
  const authState = getState().auth;
  const adminId = authState.user?.userId;
  const roleId = String(authState.user?.roleId);

  try {
    const res = await api.updateScheduleStatus(scheduleId, status, reason, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Status updated!', 'success'));
      
      if (roleId === '2') { // 2 = Trainer
        const trainers = getState().trainers?.data || [];
        const trainer = trainers.find(t => String(t.userId) === String(adminId));
        if (trainer) dispatch(fetchSchedulesByTrainer(trainer.trainerId));
        else dispatch(fetchSchedules());
      } else {
        dispatch(fetchSchedules());
      }
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to update status', 'error')); }
};

export const deleteSchedule = (id, adminId) => async (dispatch, getState) => {
  try {
    const authState = getState().auth;
    const effectiveAdminId = adminId || authState.user?.userId;
    const res = await api.deleteSchedule(id, effectiveAdminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Schedule deleted', 'success'));
      dispatch(fetchSchedules());
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to delete schedule', 'error')); }
};
