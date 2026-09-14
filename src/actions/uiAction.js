import{HIDE_TOAST}from '../constants/UiConstant';
import{SHOW_TOAST}from '../constants/UiConstant';
import{SET_THEME}from '../constants/UiConstant';

export const showToast = (message, type = 'info') => ({
  type: SHOW_TOAST,
  payload: { message, type, id: Date.now() },
});

export const hideToast = (id) => ({ type: HIDE_TOAST, payload: id });

export const setTheme = (theme) => ({ type: SET_THEME, payload: theme });
