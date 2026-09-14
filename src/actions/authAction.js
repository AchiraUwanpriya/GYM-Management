import {LOGIN_REQUEST} from "../constants/AuthConstant"
import {LOGIN_SUCCESS} from "../constants/AuthConstant"
import {LOGIN_FAILURE} from "../constants/AuthConstant"
import {LOGOUT} from "../constants/AuthConstant"
import * as api from '../services/authApi';
import { showToast } from './uiAction';

// Login with phone number (sent as p_phone to backend)
// actions/authActions.js
export const loginUser = (email, password) => async (dispatch) => {
  dispatch({ type:LOGIN_REQUEST });
  try {
    const res = await api.loginUser(email, password);
    const data = res.data;
    if (data?.StatusCode === 200 && data?.ResultSet) {
      const { user, token } = data.ResultSet;
      const sessionUser = { ...user, token };
      localStorage.setItem('dts_gym_user', JSON.stringify(sessionUser));
      dispatch({ type: LOGIN_SUCCESS, payload: sessionUser });
    } else {
      dispatch({ type:LOGIN_FAILURE, payload: data?.Result || 'Login failed' });
    }
  } catch (err) {
    dispatch({ type:LOGIN_FAILURE, payload: err.response?.data?.Result || 'Network error' });
  }
};

export const restoreSession = () => (dispatch) => {
  try {
    const stored = localStorage.getItem('dts_gym_user');
    if (stored) dispatch({ type: LOGIN_SUCCESS, payload: JSON.parse(stored) });
  } catch { /* ignore */ }
};

export const logoutUser = () => (dispatch) => {
  localStorage.removeItem('dts_gym_user');
  dispatch({ type: LOGOUT });
};
