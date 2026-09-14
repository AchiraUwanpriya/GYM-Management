import { FETCH_PLANS_REQUEST, FETCH_PLANS_SUCCESS, FETCH_PLANS_FAILURE } from '../constants/PlanConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizePlan = (row = {}) => ({
  ...row,
  planId: pick(row, 'planId', 'PlanId', 'plan_id', 'p_plan_id'),
  // planType is the fixed category (Silver/Gold/Platinum); planName is the
  // admin-defined label shown to members. Keep them distinct — don't let one
  // fall back to the other, or the admin-chosen name gets silently overwritten.
  planType: pick(row, 'planType', 'PlanType', 'plan_type'),
  planName: pick(row, 'planName', 'PlanName', 'plan_name') || pick(row, 'planType', 'PlanType', 'plan_type'),
  duration_days: pick(row, 'duration_days', 'durationDays', 'DurationDays', 'p_duration_days'),
  price: pick(row, 'price', 'Price', 'amount', 'p_price'),
  maxTrainers: pick(row, 'maxTrainers', 'MaxTrainers', 'max_trainers') || 1,
  status: pick(row, 'status', 'Status', 'is_status', 'Is_Status'),
});

export default function PlanReducer(state = init, action) {
  switch (action.type) {
    case FETCH_PLANS_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_PLANS_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizePlan) : [] };
    case FETCH_PLANS_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}