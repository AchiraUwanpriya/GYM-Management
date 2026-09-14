import{ FETCH_PLANS_REQUEST}from '../constants/PlanConstant';
import{ FETCH_PLANS_SUCCESS}from '../constants/PlanConstant';
import{ FETCH_PLANS_FAILURE}from '../constants/PlanConstant';
import * as api from '../services/paymentApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

export const fetchPlans = () => async (dispatch) => {
  dispatch({ type: FETCH_PLANS_REQUEST });
  try {
    const res = await api.getAllPlans();
    dispatch({ type: FETCH_PLANS_SUCCESS, payload: res.data?.ResultSet || [] });
  } catch {
    dispatch({ type: FETCH_PLANS_FAILURE });
    dispatch(showToast('Failed to load plans', 'error'));
  }
};

export const addPlan = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.addPlan(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Plan created!', 'success'));
      dispatch(fetchPlans());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to add plan', 'error')); }
  return false;
};

export const editPlan = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.editPlan(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Plan updated!', 'success'));
      dispatch(fetchPlans());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to update plan', 'error')); }
  return false;
};

export const deletePlan = (id, adminId) => async (dispatch) => {
  try {
    const res = await api.deletePlan(id, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Plan deleted', 'success'));
      dispatch(fetchPlans());
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to delete plan', 'error')); }
};
