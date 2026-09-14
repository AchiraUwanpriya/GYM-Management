import {
  FETCH_MEMBERS_SUCCESS,
  FETCH_MEMBERS_FAILURE,
  FETCH_MEMBERS_REQUEST,
  DELETE_MEMBER_SUCCESS,
} from "../constants/MemberConstant";
import * as api from '../services/memberApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

let fetchMembersRequest = null;

export const fetchMembers = () => (dispatch) => {
  if (fetchMembersRequest) return fetchMembersRequest;

  dispatch({ type: FETCH_MEMBERS_REQUEST });

  fetchMembersRequest = api.getAllMembers()
    .then((res) => {
      dispatch({ type: FETCH_MEMBERS_SUCCESS, payload: res.data?.ResultSet || [] });
    })
    .catch(() => {
      dispatch({ type: FETCH_MEMBERS_FAILURE });
      dispatch(showToast('Failed to load members', 'error'));
    })
    .finally(() => {
      fetchMembersRequest = null;
    });

  return fetchMembersRequest;
};

export const addMember = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.addMember(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Member created!', 'success'));
      dispatch(fetchMembers());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to add member', 'error')); }
  return false;
};

export const editMember = (req, adminId) => async (dispatch) => {
  try {
    const cleanReq = {};
    Object.keys(req).forEach(k => {
      if (req[k] !== '') cleanReq[k] = req[k];
    });

    const res = await api.editMember(cleanReq, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Member updated!', 'success'));
      dispatch(fetchMembers());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to update member', 'error')); }
  return false;
};

export const deleteMember = (id, adminId) => async (dispatch) => {
  try {
    const res = await api.deleteMember(id, adminId);
    if (isSuccess(res.data)) {
      dispatch({ type: DELETE_MEMBER_SUCCESS, payload: id });
      dispatch(showToast('Member deleted', 'success'));
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to delete member', 'error')); }
};
