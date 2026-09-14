import { FETCH_TIMESLOTS_REQUEST, FETCH_TIMESLOTS_SUCCESS, FETCH_TIMESLOTS_FAILURE } from '../constants/TimeslotConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeTimeslot = (row = {}) => ({
  ...row,
  timeslot_Id: pick(row, 'timeslot_Id', 'timeslotId', 'TimeSlotId', 'p_timeslot_id'),
  timeslotId: pick(row, 'timeslotId', 'timeslot_Id', 'TimeSlotId', 'p_timeslot_id'),
  starttime: pick(row, 'starttime', 'startTime', 'StartTime', 'p_starttime'),
  endtime: pick(row, 'endtime', 'endTime', 'EndTime', 'p_endtime'),
  status: pick(row, 'status', 'Status', 'is_status', 'Is_Status'),
});

export default function TimeslotReducer(state = init, action) {
  switch (action.type) {
    case FETCH_TIMESLOTS_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_TIMESLOTS_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizeTimeslot) : [] };
    case FETCH_TIMESLOTS_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}