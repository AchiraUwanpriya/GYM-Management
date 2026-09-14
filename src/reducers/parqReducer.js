import { FETCH_PARQ_REQUEST, FETCH_PARQ_SUCCESS, FETCH_PARQ_FAILURE, FETCH_MY_PARQ_REQUEST, FETCH_MY_PARQ_SUCCESS, FETCH_MY_PARQ_FAILURE, FETCH_TRAINER_PARQ_REQUEST, FETCH_TRAINER_PARQ_SUCCESS, FETCH_TRAINER_PARQ_FAILURE } from '../constants/ParqConstant';

const init = {
  // Admin: all records
  all:     [],
  allLoading: false,

  // Member: own record
  mine:    null,
  myLoading: false,

  // Trainer: assigned members' records
  members: [],
  membersLoading: false,
};

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeParQ = (row = {}) => ({
  ...row,
  parqId: pick(row, 'parqId', 'ParqId', 'parq_id', 'p_parq_id'),
  userId: pick(row, 'userId', 'UserId', 'user_id', 'User_Id', 'p_user_id'),
  memberId: pick(row, 'memberId', 'MemberId', 'member_id', 'Member_Id', 'p_member_id'),
  firstName: pick(row, 'firstName', 'FirstName', 'first_name', 'p_first_name'),
  lastName: pick(row, 'lastName', 'LastName', 'last_name', 'p_last_name'),
  memberName: pick(row, 'memberName', 'MemberName', 'member_name'),
  submitted_date: pick(row, 'submitted_date', 'submittedDate', 'SubmittedDate', 'created_date'),
  status: pick(row, 'status', 'Status', 'is_status', 'Is_Status'),
});

export default function parqReducer(state = init, action) {
  switch (action.type) {

    // ── Admin ────────────────────────────────────────────────
    case FETCH_PARQ_REQUEST:
      return { ...state, allLoading: true };
    case FETCH_PARQ_SUCCESS:
      return { ...state, allLoading: false, all: Array.isArray(action.payload) ? action.payload.map(normalizeParQ) : [] };
    case FETCH_PARQ_FAILURE:
      return { ...state, allLoading: false };

    // ── Member own ───────────────────────────────────────────
    case FETCH_MY_PARQ_REQUEST:
      return { ...state, myLoading: true };
    case FETCH_MY_PARQ_SUCCESS:
      return { ...state, myLoading: false, mine: action.payload ? normalizeParQ(action.payload) : null };
    case FETCH_MY_PARQ_FAILURE:
      return { ...state, myLoading: false };

    // ── Trainer ──────────────────────────────────────────────
    case FETCH_TRAINER_PARQ_REQUEST:
      return { ...state, membersLoading: true };
    case FETCH_TRAINER_PARQ_SUCCESS:
      return { ...state, membersLoading: false, members: Array.isArray(action.payload) ? action.payload.map(normalizeParQ) : [] };
    case FETCH_TRAINER_PARQ_FAILURE:
      return { ...state, membersLoading: false };

    default:
      return state;
  }
}

// ─── Add these keys to your ACTIONS constants ─────────────────
// FETCH_PARQ_REQUEST / SUCCESS / FAILURE
// FETCH_MY_PARQ_REQUEST / SUCCESS / FAILURE
// FETCH_TRAINER_PARQ_REQUEST / SUCCESS / FAILURE
