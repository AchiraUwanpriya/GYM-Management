import {FETCH_ATTENDANCE_SUCCESS} from "../constants/AttendanceConstant"
import{FETCH_ATTENDANCE_REQUEST} from "../constants/AttendanceConstant"
import{FETCH_ATTENDANCE_FAILURE} from "../constants/AttendanceConstant"
import{FETCH_ALL_ATTENDANCE_REQUEST} from "../constants/AttendanceConstant"
import{FETCH_ALL_ATTENDANCE_SUCCESS} from "../constants/AttendanceConstant"
import{FETCH_ALL_ATTENDANCE_FAILURE} from "../constants/AttendanceConstant"
import * as api from '../services/rfidApi';
import { showToast } from './uiAction';
import { isSuccess } from '../utils';

// Member-scoped (own attendance records)
export const fetchMemberAttendance = (memberId) => async (dispatch) => {
  dispatch({ type: FETCH_ATTENDANCE_REQUEST });
  try {
    const res = await api.getMemberAttendance(memberId);
    dispatch({ type: FETCH_ATTENDANCE_SUCCESS, payload: res.data?.ResultSet || [] });
  } catch { dispatch({ type: FETCH_ATTENDANCE_FAILURE }); }
};

// Full list (admin/trainer) 
export const fetchAttendance = () => async (dispatch) => {
  dispatch({ type: FETCH_ALL_ATTENDANCE_REQUEST });
  try {
    const res = await api.getAllAttendance();
    dispatch({ type: FETCH_ALL_ATTENDANCE_SUCCESS, payload: res.data?.ResultSet || [] });
  } catch { dispatch({ type: FETCH_ALL_ATTENDANCE_FAILURE }); }
};

export const tapRFID = (rfidId) => async (dispatch) => {
  try {
    const res = await api.tapRFID(rfidId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Attendance recorded!', 'success'));
      return res.data;
    } else dispatch(showToast(res.data?.Result || 'RFID not recognised', 'error'));
  } catch { dispatch(showToast('Failed to record attendance', 'error')); }
  return false;
};
