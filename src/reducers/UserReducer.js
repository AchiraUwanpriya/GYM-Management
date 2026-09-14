import { FETCH_USERS_REQUEST, FETCH_USERS_SUCCESS, FETCH_USERS_FAILURE, DELETE_USER_SUCCESS } from '../constants/UserConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeUser = (row = {}) => ({
  ...row,
  userId: pick(row, 'userId', 'UserId', 'user_id', 'User_Id', 'p_user_id'),
  email: pick(row, 'email', 'Email', 'p_email'),
  phone: pick(row, 'phone', 'Phone', 'p_phone'),
  firstName: pick(row, 'firstName', 'FirstName', 'first_name', 'p_first_name'),
  lastName: pick(row, 'lastName', 'LastName', 'last_name', 'p_last_name'),
  gender: pick(row, 'gender', 'Gender', 'p_gender'),
  profile_image: pick(row, 'profile_image', 'profileImage', 'imagePath', 'ImagePath', 'p_image_path'),
  roleId: pick(row, 'roleId', 'RoleId', 'role_id', 'Role_Id', 'p_role_id'),
  roleName: pick(row, 'roleName', 'RoleName', 'role_name'),
  status: pick(row, 'status', 'Status', 'is_status', 'Is_Status'),
});

export default function UserReducer(state = init, action) {
  switch (action.type) {
    case FETCH_USERS_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_USERS_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizeUser) : [] };
    case FETCH_USERS_FAILURE:
      return { ...state, loading: false, error: true };
    case DELETE_USER_SUCCESS:
      return { ...state, data: state.data.filter((i) => String(i.userId) !== String(action.payload)) };
    default:
      return state;
  }
}
