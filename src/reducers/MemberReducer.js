import { FETCH_MEMBERS_REQUEST, FETCH_MEMBERS_SUCCESS, FETCH_MEMBERS_FAILURE, DELETE_MEMBER_SUCCESS } from '../constants/MemberConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeMember = (row = {}) => ({
  ...row,
  memberId: pick(row, 'memberId', 'MemberId', 'member_id', 'Member_Id', 'p_member_id'),
  userId: pick(row, 'userId', 'UserId', 'user_id', 'User_Id', 'p_user_id'),
  firstName: pick(row, 'firstName', 'FirstName', 'first_name', 'p_first_name'),
  lastName: pick(row, 'lastName', 'LastName', 'last_name', 'p_last_name'),
  email: pick(row, 'email', 'Email', 'p_email'),
  phone: pick(row, 'phone', 'Phone', 'p_phone'),
  joinDate: pick(row, 'joinDate', 'JoinDate', 'join_date', 'p_join_date'),
  blood_group: pick(row, 'blood_group', 'BloodGroup', 'bloodGroup', 'p_blood_group'),
  height: pick(row, 'height', 'Height', 'p_height'),
  weight: pick(row, 'weight', 'Weight', 'p_weight'),
  fitness_goal: pick(row, 'fitness_goal', 'fitnessGoal', 'FitnessGoal', 'p_fitness_goal'),
  rfId_Id: pick(row, 'rfId_Id', 'rfid_Id', 'rfidId', 'RfidId', 'p_rfid_id'),
  status: pick(row, 'status', 'Status', 'is_status', 'Is_Status'),
  profile_image: pick(row, 'profile_image', 'profileImage', 'imagePath', 'ImagePath', 'p_image_path'),
});

export default function MemberReducer(state = init, action) {
  switch (action.type) {
    case FETCH_MEMBERS_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_MEMBERS_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizeMember) : [] };
    case FETCH_MEMBERS_FAILURE:
      return { ...state, loading: false, error: true };
    case DELETE_MEMBER_SUCCESS:
      return { ...state, data: state.data.filter((i) => String(i.memberId) !== String(action.payload)) };
    default:
      return state;
  }
}
