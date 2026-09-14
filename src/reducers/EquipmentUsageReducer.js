import { FETCH_EQUIPMENT_USAGE_REQUEST, FETCH_EQUIPMENT_USAGE_SUCCESS, FETCH_EQUIPMENT_USAGE_FAILURE } from '../constants/EquipmentUsageConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeUsage = (row = {}) => ({
  ...row,
  logId: pick(row, 'logId', 'LogId', 'log_id', 'p_log_id'),
  LogId: pick(row, 'LogId', 'logId', 'log_id', 'p_log_id'),
  ea_Id: pick(row, 'ea_Id', 'eaId', 'EaId', 'p_ea_id'),
  device_Id: pick(row, 'device_Id', 'deviceId', 'DeviceId', 'p_device_id'),
  memberId: pick(row, 'memberId', 'MemberId', 'member_id', 'Member_Id', 'p_member_id'),
  equipmentId: pick(row, 'equipmentId', 'EquipmentId', 'equipment_id', 'p_equipment_id'),
  memberName: pick(row, 'memberName', 'MemberName', 'member_name'),
  equipmentName: pick(row, 'equipmentName', 'EquipmentName', 'equipment_name'),
  rfid_number: pick(row, 'rfid_number', 'rfidNumber', 'rfid_Id', 'rfId_Id', 'p_rfid_id'),
  starttime: pick(row, 'starttime', 'startTime', 'StartTime', 'p_starttime'),
  endtime: pick(row, 'endtime', 'endTime', 'EndTime', 'p_endtime'),
  actual_mins: pick(row, 'actual_mins', 'actualMins', 'ActualMins', 'p_actual_mins'),
  elapsed_mins: pick(row, 'elapsed_mins', 'elapsedMins', 'ElapsedMins'),
  target_mins: pick(row, 'target_mins', 'targetMins', 'TargetMins'),
  status: pick(row, 'status', 'Status', 'p_status'),
});

export default function EquipmentUsageReducer(state = init, action) {
  switch (action.type) {
    case FETCH_EQUIPMENT_USAGE_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_EQUIPMENT_USAGE_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizeUsage) : [] };
    case FETCH_EQUIPMENT_USAGE_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}
