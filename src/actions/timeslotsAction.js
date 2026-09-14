import {FETCH_TIMESLOTS_REQUEST}from '../constants/TimeslotConstant';
import{FETCH_TIMESLOTS_SUCCESS}from '../constants/TimeslotConstant';
import{FETCH_TIMESLOTS_FAILURE}from '../constants/TimeslotConstant';
import * as api from '../services/scheduleApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

export const fetchTimeslots = () => async (dispatch) => {
  dispatch({ type: FETCH_TIMESLOTS_REQUEST });
  try {
    const res = await api.getAllTimeslots();
    dispatch({ type: FETCH_TIMESLOTS_SUCCESS, payload: res.data?.ResultSet || [] });
  } catch {
    dispatch({ type: FETCH_TIMESLOTS_FAILURE });
    dispatch(showToast('Failed to load timeslots', 'error'));
  }
};

// Alias used in some pages
export const fetchAllTimeslots = fetchTimeslots;

export const addTimeslot = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.addTimeslot(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Timeslot added!', 'success'));
      dispatch(fetchTimeslots());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to add timeslot', 'error')); }
  return false;
};

export const deleteTimeslot = (id, adminId) => async (dispatch) => {
  try {
    const res = await api.deleteTimeslot(id, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Timeslot deleted', 'success'));
      dispatch(fetchTimeslots());
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to delete timeslot', 'error')); }
};
