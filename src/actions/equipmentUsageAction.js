import {FETCH_EQUIPMENT_USAGE_SUCCESS} from "../constants/EquipmentUsageConstant"
import {FETCH_EQUIPMENT_USAGE_FAILURE} from "../constants/EquipmentUsageConstant"
import {FETCH_EQUIPMENT_USAGE_REQUEST} from "../constants/EquipmentUsageConstant"
import * as api from '../services/equipmentApi';

export const fetchLiveEquipmentUsage = () => async (dispatch) => {
  dispatch({ type: FETCH_EQUIPMENT_USAGE_REQUEST });
  try {
    const res = await api.getLiveEquipmentUsage();
    dispatch({ type: FETCH_EQUIPMENT_USAGE_SUCCESS, payload: res.data?.ResultSet || [] });
  } catch { dispatch({ type: FETCH_EQUIPMENT_USAGE_FAILURE }); }
};

// Alias
export const getLiveEquipmentUsage = fetchLiveEquipmentUsage;
