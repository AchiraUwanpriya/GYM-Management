import { SHOW_TOAST, HIDE_TOAST, SET_CURRENT_USER_ID, SET_THEME } from '../constants/UiConstant';
import { LOGIN_SUCCESS, LOGOUT } from '../constants/AuthConstant';

const savedTheme = localStorage.getItem('dts_theme') || 'dark';
const uiInitial  = { toasts: [], currentUserId: null, theme: savedTheme };

const uiReducer = (state = uiInitial, action) => {
  switch (action.type) {
    case SHOW_TOAST:          return { ...state, toasts: [...state.toasts, action.payload] };
    case HIDE_TOAST:          return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };
    case SET_CURRENT_USER_ID: return { ...state, currentUserId: String(action.payload) };
    case LOGIN_SUCCESS:       return { ...state, currentUserId: String(action.payload.userId) };
    case LOGOUT:              return { ...uiInitial, theme: state.theme };
    case 'SET_AVAILABLE_TRAINER_IDS':
      return { ...state, trainers: { ...state.trainers, availableNowIds: action.payload } };
    case SET_THEME:
      localStorage.setItem('dts_theme', action.payload);
      return { ...state, theme: action.payload };
    default: return state;
  }
};

export default uiReducer;
