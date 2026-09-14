import { FETCH_SUBSCRIPTIONS_REQUEST, FETCH_SUBSCRIPTIONS_SUCCESS, FETCH_SUBSCRIPTIONS_FAILURE, DELETE_SUBSCRIPTION_SUCCESS } from '../constants/SubscriptionConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizeSubscription = (row = {}) => ({
  ...row,
  subscriptionId: pick(row, 'subscriptionId', 'SubscriptionId', 'subscription_id', 'p_subscription_id'),
  memberId: pick(row, 'memberId', 'MemberId', 'member_id', 'Member_Id', 'p_member_id'),
  planId: pick(row, 'planId', 'PlanId', 'plan_id', 'p_plan_id'),
  trainer_Id: pick(row, 'trainer_Id', 'trainerId', 'TrainerId', 'trainer_id', 'p_trainer_id'),
  memberName: pick(row, 'memberName', 'MemberName', 'member_name'),
  planType: pick(row, 'planType', 'PlanType', 'plan_type', 'planLabel'),
  price: pick(row, 'price', 'Price', 'amount'),
  startDate: pick(row, 'startDate', 'StartDate', 'start_date', 'p_start_date'),
  status: pick(row, 'status', 'Status', 'is_active', 'is_status', 'Is_Status'),
});

export default function SubscriptionReducer(state = init, action) {
  switch (action.type) {
    case FETCH_SUBSCRIPTIONS_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_SUBSCRIPTIONS_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizeSubscription) : [] };
    case FETCH_SUBSCRIPTIONS_FAILURE:
      return { ...state, loading: false, error: true };
    case DELETE_SUBSCRIPTION_SUCCESS:
      return { ...state, data: state.data.filter((i) => String(i.subscriptionId) !== String(action.payload)) };
    default:
      return state;
  }
}
