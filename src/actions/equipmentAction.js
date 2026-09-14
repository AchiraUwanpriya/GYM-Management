import {FETCH_EQUIPMENT_SUCCESS} from "../constants/EquipmentConstant"
import {FETCH_EQUIPMENT_FAILURE} from "../constants/EquipmentConstant"
import {FETCH_EQUIPMENT_REQUEST} from "../constants/EquipmentConstant"

import * as api from '../services/equipmentApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

export const fetchEquipment = () => async (dispatch) => {
  dispatch({ type: FETCH_EQUIPMENT_REQUEST });
  try {
    const res = await api.getAllEquipment();
    dispatch({ type: FETCH_EQUIPMENT_SUCCESS, payload: res.data?.ResultSet || [] });
  } catch { dispatch({ type: FETCH_EQUIPMENT_FAILURE }); }
};

export const addEquipment = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.addEquipment(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Equipment added!', 'success'));
      dispatch(fetchEquipment());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to add equipment', 'error')); }
  return false;
};

export const editEquipment = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.editEquipment(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Equipment updated!', 'success'));
      dispatch(fetchEquipment());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to update equipment', 'error')); }
  return false;
};

export const deleteEquipment = (id, adminId) => async (dispatch) => {
  try {
    const res = await api.deleteEquipment(id, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Equipment deleted', 'success'));
      dispatch(fetchEquipment());
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to delete equipment', 'error')); }
};

export const updateEquipmentStatus = (equipmentId, status, adminId) => async (dispatch) => {
  try {
    const res = await api.updateEquipmentStatus(equipmentId, status, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast(`Equipment marked ${status}.`, 'success'));
      dispatch(fetchEquipment());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to update equipment status', 'error')); }
  return false;
};