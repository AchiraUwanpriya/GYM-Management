import { FETCH_PARQ_REQUEST}from '../constants/ParqConstant';
import { FETCH_PARQ_SUCCESS}from '../constants/ParqConstant';
import { FETCH_PARQ_FAILURE}from '../constants/ParqConstant';
import { FETCH_MY_PARQ_REQUEST}from '../constants/ParqConstant';
import { FETCH_MY_PARQ_SUCCESS}from '../constants/ParqConstant';
import{FETCH_MY_PARQ_FAILURE}from '../constants/ParqConstant';
import { FETCH_TRAINER_PARQ_REQUEST}from '../constants/ParqConstant';
import { FETCH_TRAINER_PARQ_SUCCESS}from '../constants/ParqConstant';
import { FETCH_TRAINER_PARQ_FAILURE}from '../constants/ParqConstant';
import * as api    from '../services/parqApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

let fetchAllParQRequest = null;

// ── Fetch all PAR-Q records  (Admin) ───────────────────────────
export const fetchAllParQ = () => (dispatch) => {
  if (fetchAllParQRequest) return fetchAllParQRequest;

  dispatch({ type: FETCH_PARQ_REQUEST });

  fetchAllParQRequest = api.getAllParQ()
    .then((res) => {
      dispatch({
        type:    FETCH_PARQ_SUCCESS,
        payload: res.data?.ResultSet || [],
      });
    })
    .catch(() => {
      dispatch({ type: FETCH_PARQ_FAILURE });
      dispatch(showToast('Failed to load PAR-Q records', 'error'));
    })
    .finally(() => {
      fetchAllParQRequest = null;
    });

  return fetchAllParQRequest;
};

// ── Fetch own PAR-Q  (Member) ──────────────────────────────────
export const fetchMyParQ = (userId) => async (dispatch) => {
  dispatch({ type: FETCH_MY_PARQ_REQUEST });
  try {
    const res = await api.getParQByUserId(userId);
    const resultSet = res.data?.ResultSet;
    dispatch({
      type:    FETCH_MY_PARQ_SUCCESS,
      payload: (Array.isArray(resultSet) ? resultSet[0] : resultSet) || null,
    });
  } catch {
    dispatch({ type: FETCH_MY_PARQ_FAILURE });
  }
};

// ── Fetch PAR-Q for trainer's members  (Trainer) ───────────────
export const fetchTrainerMembersParQ = (trainerId) => async (dispatch) => {
  dispatch({ type: FETCH_TRAINER_PARQ_REQUEST });
  try {
    const res = await api.getParQByTrainerId(trainerId);
    dispatch({
      type:    FETCH_TRAINER_PARQ_SUCCESS,
      payload: res.data?.ResultSet || [],
    });
  } catch {
    dispatch({ type: FETCH_TRAINER_PARQ_FAILURE });
    dispatch(showToast('Failed to load member health records', 'error'));
  }
};

// ── Update PAR-Q status  (Admin: active / inactive / deleted) ──
export const updateParQStatus = (userId, status) => async (dispatch) => {
  try {
    const res = await api.updateParQStatus(userId, status);
    if (isSuccess(res.data)) {
      dispatch(showToast(res.data?.Message || res.data?.Result || `Status updated to ${status}`, 'success'));
      dispatch(fetchAllParQ());
      return true;
    } else {
      dispatch(showToast(res.data?.Message || res.data?.Result || 'Failed to update status', 'error'));
    }
  } catch (err) {
    dispatch(showToast('Failed to update status: ' + (err.response?.data?.Message || err.message || 'Unknown error'), 'error'));
  }
  return false;
};

// ── Save PAR-Q  (Member submits / updates) ─────────────────────
export const saveParQ = (userId, answers, isEdit = false) => async (dispatch) => {
  try {
    console.log('Sending PAR-Q data:', { userId, answers, isEdit });
    const res = isEdit
      ? await api.editParQ(userId, answers)
      : await api.saveParQ(userId, answers);
    console.log('Full PAR-Q Response:', res);
    console.log('Response Data:', res.data);
    
    if (isSuccess(res.data)) {
      dispatch(showToast('Health questionnaire saved ✓', 'success'));
      dispatch(fetchMyParQ(userId));
      return true;
    } else {
      const errorMsg = res.data?.Message || res.data?.message || 'Backend returned: ' + JSON.stringify(res.data);
      console.error('PAR-Q Save Error - Full Response:', res.data);
      console.error('PAR-Q Save Error Message:', errorMsg);
      dispatch(showToast(errorMsg, 'error'));
    }
  } catch (err) {
    console.error('PAR-Q Save Exception:', err);
    console.error('Exception Details:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    dispatch(showToast('Failed to save PAR-Q: ' + (err.response?.data?.Message || err.message || 'Unknown error'), 'error'));
  }
  return false;
};
