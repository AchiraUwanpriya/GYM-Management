import{FETCH_TRAINER_TIMESLOTS_REQUEST}from '../constants/TrainerTimeslotConstant';
import{FETCH_TRAINER_TIMESLOTS_SUCCESS}from'../constants/TrainerTimeslotConstant';
import{FETCH_TRAINER_TIMESLOTS_FAILURE}from '../constants/TrainerTimeslotConstant';
import * as api from '../services/scheduleApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

const fetchTrainerTimeslotsRequests = new Map();

export const fetchTrainerTimeslots = (trainerId) => (dispatch) => {
  const requestKey = String(trainerId || 'all');
  if (fetchTrainerTimeslotsRequests.has(requestKey)) return fetchTrainerTimeslotsRequests.get(requestKey);

  dispatch({ type: FETCH_TRAINER_TIMESLOTS_REQUEST });

  const request = (trainerId
    ? api.getTrainerTimeslots(trainerId)
    : api.getAllTrainerTimeslots())
    .then((res) => {
      dispatch({ type: FETCH_TRAINER_TIMESLOTS_SUCCESS, payload: res.data?.ResultSet || [] });
    })
    .catch(() => {
      dispatch({ type: FETCH_TRAINER_TIMESLOTS_FAILURE });
    })
    .finally(() => {
      fetchTrainerTimeslotsRequests.delete(requestKey);
    });

  fetchTrainerTimeslotsRequests.set(requestKey, request);
  return request;
};

export const addTrainerTimeslot = (req) => async (dispatch) => {
  try {
    const res = await api.addTrainerTimeslot(req);
    if (isSuccess(res.data)) {
      dispatch(showToast('Timeslot request submitted!', 'success'));
      dispatch(fetchTrainerTimeslots());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to request timeslot', 'error')); }
  return false;
};


export const approveTrainerTimeslot = (p_trainer_timeslot_id, p_is_active, p_admin_id) => async (dispatch) => {
  try {
    const res = await api.approveTrainerTimeslot(p_trainer_timeslot_id, p_is_active, p_admin_id);
    if (isSuccess(res.data)) {
      dispatch(showToast(p_is_active === 1 ? 'Timeslot approved!' : 'Timeslot rejected', 'success'));
      dispatch(fetchTrainerTimeslots());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to update timeslot', 'error')); }
  return false;
};

export const deleteTrainerTimeslot = (p_trainer_timeslot_id, p_admin_id) => async (dispatch) => {
  try {
    const res = await api.deleteTrainerTimeslot(p_trainer_timeslot_id, p_admin_id);
    if (isSuccess(res.data)) {
      dispatch(showToast('Timeslot deleted!', 'success'));
      dispatch(fetchTrainerTimeslots());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to delete timeslot', 'error')); }
  return false;
};


// FIX: this used to re-declare FETCH_TRAINER_TIMESLOTS_REQUEST/SUCCESS/FAILURE
// with `export const`, even though the exact same names were already
// imported at the top of this file from TrainerTimeslotConstant. Two
// declarations of the same identifier in one module is a SyntaxError
// ("Identifier has already been declared"), which broke the whole file at
// build time. On top of that, this function called `apiClient.get(...)`
// but `apiClient` was never imported here — only `api` (from
// services/scheduleApi) was. Both bugs together meant the Trainer Time
// Slots report tab could never load data, which is why the report only
// ever showed the master Time Slots and not the trainer-specific ones.
// This is now just a plain alias onto the already-working fetcher above,
// matching the exact name Reports.jsx imports.
export const fetchTrainerTimeSlots = () => fetchTrainerTimeslots();