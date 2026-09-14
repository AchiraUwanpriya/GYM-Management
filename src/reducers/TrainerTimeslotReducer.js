import { FETCH_TRAINER_TIMESLOTS_REQUEST, FETCH_TRAINER_TIMESLOTS_SUCCESS, FETCH_TRAINER_TIMESLOTS_FAILURE } from '../constants/TrainerTimeslotConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeTrainerTimeslot = (row = {}) => ({
  ...row,
  trainerTimeslotId: pick(row, 'trainerTimeslotId', 'trainer_timeslot_id', 'trainerTimeSlotId', 'TrainerTimeSlotId', 'p_trainer_timeslot_id'),
  trainerTimeslot_Id: pick(row, 'trainerTimeslot_Id', 'trainerTimeslotId', 'trainer_timeslot_id', 'trainerTimeSlotId', 'TrainerTimeSlotId', 'p_trainer_timeslot_id'),
  trainerId: pick(row, 'trainerId', 'TrainerId', 'trainer_Id', 'trainer_id', 'Trainer_Id', 'p_trainer_id'),
  memberId: pick(row, 'memberId', 'MemberId', 'member_id', 'Member_Id', 'p_member_id'),
  trainerName: pick(row, 'trainerName', 'TrainerName', 'trainer_name'),
  memberName: pick(row, 'memberName', 'MemberName', 'member_name'),
  starttime: pick(row, 'starttime', 'startTime', 'StartTime', 'p_starttime'),
  endtime: pick(row, 'endtime', 'endTime', 'EndTime', 'p_endtime'),
  custom_starttime: pick(row, 'custom_starttime', 'customStarttime', 'customStartTime', 'CustomStartTime'),
  custom_endtime: pick(row, 'custom_endtime', 'customEndtime', 'customEndTime', 'CustomEndTime'),
  selected_days: pick(row, 'selected_days', 'selectedDays', 'SelectedDays'),
  day_of_week: pick(row, 'day_of_week', 'dayOfWeek', 'DayOfWeek'),
  isActive: pick(row, 'isActive', 'IsActive', 'is_active', 'Is_Active'),
  status: pick(row, 'status', 'Status', 'is_status', 'Is_Status'),
});

export default function TrainerTimeslotReducer(state = init, action) {
  switch (action.type) {
    case FETCH_TRAINER_TIMESLOTS_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_TRAINER_TIMESLOTS_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizeTrainerTimeslot) : [] };
    case FETCH_TRAINER_TIMESLOTS_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}
