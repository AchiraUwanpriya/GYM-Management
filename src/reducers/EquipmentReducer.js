import { FETCH_EQUIPMENT_REQUEST, FETCH_EQUIPMENT_SUCCESS, FETCH_EQUIPMENT_FAILURE } from '../constants/EquipmentConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeEquipment = (row = {}) => ({
  ...row,
  equipmentId: pick(row, 'equipmentId', 'EquipmentId', 'equipment_id', 'p_equipment_id', 'p_equipment_Id'),
  equipmentName: pick(row, 'equipmentName', 'EquipmentName', 'equipment_name', 'p_equipment_name'),
  equipmentType: pick(row, 'equipmentType', 'EquipmentType', 'equipment_type', 'p_equipment_type'),
  description: pick(row, 'description', 'Description', 'p_description'),
  quantity: pick(row, 'quantity', 'Quantity', 'p_quantity'),
  status: pick(row, 'status', 'Status', 'is_status', 'Is_Status'),
});

export default function EquipmentReducer(state = init, action) {
  switch (action.type) {
    case FETCH_EQUIPMENT_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_EQUIPMENT_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizeEquipment) : [] };
    case FETCH_EQUIPMENT_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}
