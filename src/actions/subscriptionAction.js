
import{FETCH_SUBSCRIPTIONS_REQUEST}from '../constants/SubscriptionConstant';
import{FETCH_SUBSCRIPTIONS_SUCCESS}from '../constants/SubscriptionConstant';
import{FETCH_SUBSCRIPTIONS_FAILURE}from '../constants/SubscriptionConstant';
import * as api from '../services/paymentApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

let fetchSubscriptionsRequest = null;

export const fetchSubscriptions = () => (dispatch) => {
  if (fetchSubscriptionsRequest) return fetchSubscriptionsRequest;

  dispatch({ type: FETCH_SUBSCRIPTIONS_REQUEST });

  fetchSubscriptionsRequest = api.getAllSubscriptions()
    .then((res) => {
      dispatch({ type: FETCH_SUBSCRIPTIONS_SUCCESS, payload: res.data?.ResultSet || [] });
    })
    .catch(() => {
      dispatch({ type: FETCH_SUBSCRIPTIONS_FAILURE });
      dispatch(showToast('Failed to load subscriptions', 'error'));
    })
    .finally(() => {
      fetchSubscriptionsRequest = null;
    });

  return fetchSubscriptionsRequest;
};
export const addSubscription = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.addSubscription(req, adminId);
    if (isSuccess(res.data)) { dispatch(showToast('Subscription created!', 'success')); dispatch(fetchSubscriptions()); return true; }
    else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to add subscription', 'error')); }
  return false;
};
export const editSubscription = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.editSubscription(req, adminId);
    if (isSuccess(res.data)) { dispatch(showToast('Subscription updated!', 'success')); dispatch(fetchSubscriptions()); return true; }
    else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to update subscription', 'error')); }
  return false;
};
export const deactivateSubscription = (id, adminId) => async (dispatch) => {
  try {
    const res = await api.deactivateSubscription(id, adminId);
    if (isSuccess(res.data)) { dispatch(showToast('Subscription deactivated', 'success')); dispatch(fetchSubscriptions()); }
    else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to deactivate', 'error')); }
};
// FIX: activate subscription
export const activateSubscription = (id, adminId) => async (dispatch) => {
  try {
    const res = await api.activateSubscription(id, adminId);
    if (isSuccess(res.data)) { dispatch(showToast('Subscription activated!', 'success')); dispatch(fetchSubscriptions()); }
    else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to activate', 'error')); }
};
