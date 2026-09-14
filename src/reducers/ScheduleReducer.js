import { FETCH_SCHEDULES_REQUEST, FETCH_SCHEDULES_SUCCESS, FETCH_SCHEDULES_FAILURE } from '../constants/ScheduleConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeSchedule = (row = {}) => ({
  ...row,
  scheduleId: pick(row, 'scheduleId', 'ScheduleId', 'schedule_id', 'p_schedule_id'),
  rfid_Id: pick(row, 'rfid_Id', 'rfId_Id', 'rfidId', 'RfidId', 'p_rfid_id'),
  memberId: pick(row, 'memberId', 'MemberId', 'member_id', 'Member_Id', 'p_member_id'),
  trainerId: pick(row, 'trainerId', 'TrainerId', 'trainer_id', 'Trainer_Id', 'p_trainer_id'),
  timeslotId: pick(row, 'timeslotId', 'TimeslotId', 'timeslot_Id', 'TimeSlotId', 'p_timeslot_id'),
  scheduleDate: pick(row, 'scheduleDate', 'ScheduleDate', 'schedule_date', 'p_schedule_date'),
  memberName: pick(row, 'memberName', 'MemberName', 'member_name'),
  trainerName: pick(row, 'trainerName', 'TrainerName', 'trainer_name'),
  starttime: pick(row, 'starttime', 'startTime', 'StartTime', 'p_starttime'),
  endtime: pick(row, 'endtime', 'endTime', 'EndTime', 'p_endtime'),
  status: pick(row, 'status', 'Status', 'is_status', 'Is_Status'),
});

export default function ScheduleReducer(state = init, action) {
  switch (action.type) {
    case FETCH_SCHEDULES_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_SCHEDULES_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizeSchedule) : [] };
    case FETCH_SCHEDULES_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}
