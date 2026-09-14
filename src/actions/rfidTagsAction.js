import{FETCH_RFID_REQUEST}from '../constants/RfidConstant';
import{FETCH_RFID_SUCCESS}from '../constants/RfidConstant';
import{FETCH_RFID_FAILURE}from '../constants/RfidConstant';
import * as api from '../services/rfidApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

export const fetchRfidTags = () => async (dispatch) => {
  dispatch({ type: FETCH_RFID_REQUEST });
  try {
    const res = await api.getAllRfidTags();
    if (isSuccess(res.data)) {
      dispatch({ type: FETCH_RFID_SUCCESS, payload: res.data?.ResultSet || [] });
    } else {
      dispatch({ type: FETCH_RFID_FAILURE });
      dispatch(showToast(getErrorMsg(res.data), 'error'));
    }
  } catch (err) {
    dispatch({ type: FETCH_RFID_FAILURE });
    dispatch(showToast('Failed to load RFID tags', 'error'));
  }
};

export const addRfidTag = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.addRfidTag(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('RFID tag added!', 'success'));
      dispatch(fetchRfidTags());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to add RFID tag', 'error')); }
  return false;
};

export const assignRfidToMember = (rfidId, memberId, adminId) => async (dispatch) => {
  try {
    const res = await api.assignRfidToMember(rfidId, memberId, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('RFID assigned to member!', 'success'));
      dispatch(fetchRfidTags());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to assign RFID', 'error')); }
  return false;
};

export const deleteRfidTag = (id, adminId) => async (dispatch) => {
  try {
    const res = await api.deleteRfidTag(id, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('RFID tag deleted', 'success'));
      dispatch(fetchRfidTags());
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to delete RFID tag', 'error')); }
};

export const toggleRfidStatus = (rfidId, adminId) => async (dispatch) => {
  try {
    const res = await api.toggleRfidStatus(rfidId, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('RFID status toggled!', 'success'));
      dispatch(fetchRfidTags());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to toggle RFID status', 'error')); }
  return false;
};
