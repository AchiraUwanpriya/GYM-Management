import{FETCH_USERS_REQUEST}from '../constants/UserConstant';
import{FETCH_USERS_SUCCESS}from'../constants/UserConstant';
import{FETCH_USERS_FAILURE}from '../constants/UserConstant';
import * as api from '../services/userApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

export const fetchUsers = () => async (dispatch) => {
  dispatch({ type: FETCH_USERS_REQUEST });
  try {
    const res = await api.getAllUsers();
    dispatch({ type: FETCH_USERS_SUCCESS, payload: res.data?.ResultSet || [] });
  } catch {
    dispatch({ type: FETCH_USERS_FAILURE });
    dispatch(showToast('Failed to load users', 'error'));
  }
};

export const editUserAction = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.editUser(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('User updated', 'success'));
      dispatch(fetchUsers());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to update user', 'error')); }
  return false;
};

// FIX (Bug 1): Soft-delete now re-fetches the full user list instead of
// dispatching DELETE_USER_SUCCESS (which physically removed the user from
// the Redux store). After a soft-delete the backend sets status='deleted'
// but keeps the row; fetchUsers() brings it back so it appears in the list
// with "Deleted" status rather than disappearing entirely.
export const deleteUser = (id, adminId) => async (dispatch) => {
  try {
    const res = await api.deleteUser(id, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('User deleted', 'success'));
      dispatch(fetchUsers()); // re-fetch so deleted user appears with status='deleted'
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to delete user', 'error')); }
};

// ✅ FIX: added roleId param — backend ApproveUser requires it as non-nullable int
export const approveUserAction = (userId, adminId, newStatus, roleId, firstName = '', lastName = '') => async (dispatch) => {
  try {
    const res = await api.approveUser(userId, adminId, newStatus, roleId, firstName, lastName);
    if (isSuccess(res.data)) {
      dispatch(showToast(`User ${newStatus}`, 'success'));
      dispatch(fetchUsers());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'))
  } catch { dispatch(showToast('Failed to update user status', 'error')); }
  return false;
};