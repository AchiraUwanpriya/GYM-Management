import { LOGIN_REQUEST, LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT } from '../constants/AuthConstant';

const authInitial = { user: null, loading: false, error: null };

const authReducer = (state = authInitial, action) => {
  switch (action.type) {
    case LOGIN_REQUEST: return { ...state, loading: true, error: null };
    case LOGIN_SUCCESS: return { ...state, loading: false, user: action.payload, error: null };
    case LOGIN_FAILURE: return { ...state, loading: false, error: action.payload };
    case LOGOUT:        return { ...authInitial };
    default: return state;
  }
};

export default authReducer;
