import { FETCH_ALL_ATTENDANCE_REQUEST, FETCH_ALL_ATTENDANCE_SUCCESS, FETCH_ALL_ATTENDANCE_FAILURE } from '../constants/AttendanceConstant';

const init = { data: [], loading: false, error: false };

export default function AllAttendanceReducer(state = init, action) {
  switch (action.type) {
    case FETCH_ALL_ATTENDANCE_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_ALL_ATTENDANCE_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload : [] };
    case FETCH_ALL_ATTENDANCE_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}
