import{FETCH_EXERCISES_SUCCESS} from "../constants/ExerciseConstant"
import{FETCH_EXERCISES_REQUEST} from "../constants/ExerciseConstant"
import{FETCH_EXERCISES_FAILURE} from "../constants/ExerciseConstant"
import * as api from '../services/equipmentApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

export const fetchExercises = () => async (dispatch) => {
  dispatch({ type: FETCH_EXERCISES_REQUEST });
  try {
    const res = await api.getExerciseCatalog();
    dispatch({ type:FETCH_EXERCISES_SUCCESS, payload: res.data?.ResultSet || [] });
  } catch { dispatch({ type:FETCH_EXERCISES_FAILURE }); }
};

export const addExercise = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.addExercise(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Exercise added!', 'success'));
      dispatch(fetchExercises());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to add exercise', 'error')); }
  return false;
};

export const deleteExercise = (id, adminId) => async (dispatch) => {
  try {
    const res = await api.deleteExercise(id, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Exercise deleted', 'success'));
      dispatch(fetchExercises());
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to delete exercise', 'error')); }
};

export const editExercise = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.editExercise(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Exercise updated!', 'success'));
      dispatch(fetchExercises());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to update exercise', 'error')); }
  return false;
};

