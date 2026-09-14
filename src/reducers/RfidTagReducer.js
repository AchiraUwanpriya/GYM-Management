import { FETCH_RFID_REQUEST, FETCH_RFID_SUCCESS, FETCH_RFID_FAILURE } from '../constants/RfidConstant';

const init = { data: [], loading: false, error: false };

export default function RfidTagReducer(state = init, action) {
  switch (action.type) {
    case FETCH_RFID_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_RFID_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload : [] };
    case FETCH_RFID_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}
