import { FETCH_WORKOUTS_REQUEST, FETCH_WORKOUTS_SUCCESS, FETCH_WORKOUTS_FAILURE } from '../constants/WorkoutConstant';

const init = { data: [], loading: false, error: false };

export default function WorkoutReducer(state = init, action) {
  switch (action.type) {
    case FETCH_WORKOUTS_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_WORKOUTS_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload : [] };
    case FETCH_WORKOUTS_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}
