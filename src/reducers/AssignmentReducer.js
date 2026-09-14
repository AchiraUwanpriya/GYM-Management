import { FETCH_ASSIGNMENTS_REQUEST, FETCH_ASSIGNMENTS_SUCCESS, FETCH_ASSIGNMENTS_FAILURE, DELETE_ASSIGNMENT_SUCCESS } from '../constants/AssignmentConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeAssignment = (row = {}) => ({
  ...row,
  assignmentId: pick(row, 'assignmentId', 'AssignmentId', 'assignment_id', 'p_assignment_id'),
  trainerId: pick(row, 'trainerId', 'TrainerId', 'trainer_id', 'Trainer_Id', 'p_trainer_id'),
  memberId: pick(row, 'memberId', 'MemberId', 'member_id', 'Member_Id', 'p_member_id'),
  trainerName: pick(row, 'trainerName', 'TrainerName', 'trainer_name'),
  memberName: pick(row, 'memberName', 'MemberName', 'member_name'),
  assignment_date: pick(row, 'assignment_date', 'assignmentDate', 'AssignmentDate', 'p_assignment_date'),
  status: pick(row, 'status', 'Status', 'assignment_status', 'is_active'),
});

export default function AssignmentReducer(state = init, action) {
  switch (action.type) {
    case FETCH_ASSIGNMENTS_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_ASSIGNMENTS_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizeAssignment) : [] };
    case FETCH_ASSIGNMENTS_FAILURE:
      return { ...state, loading: false, error: true };
    case DELETE_ASSIGNMENT_SUCCESS:
      return { ...state, data: state.data.filter((i) => String(i.assignmentId) !== String(action.payload)) };
    default:
      return state;
  }
}
