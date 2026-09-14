import { FETCH_EXERCISES_SUCCESS, FETCH_EXERCISES_REQUEST, FETCH_EXERCISES_FAILURE } from "../constants/ExerciseConstant";
const init = { data: [], loading: false, error: false };

export default function ExerciseReducer(state = init, action) {
  switch (action.type) {
    case FETCH_EXERCISES_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_EXERCISES_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload : [] };
    case FETCH_EXERCISES_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}
