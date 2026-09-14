import { FETCH_PAYMENTS_REQUEST, FETCH_PAYMENTS_SUCCESS, FETCH_PAYMENTS_FAILURE } from '../constants/PaymentConstant';

const init = { data: [], loading: false, error: false };

const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '');

const normalizePayment = (row = {}) => ({
  ...row,
  paymentId: pick(row, 'paymentId', 'PaymentId', 'payment_id', 'p_payment_id'),
  subscriptionId: pick(row, 'subscriptionId', 'SubscriptionId', 'subscription_id', 'p_subscription_id'),
  memberId: pick(row, 'memberId', 'MemberId', 'member_id', 'Member_Id', 'p_member_id'),
  memberName: pick(row, 'memberName', 'MemberName', 'member_name', 'customerName'),
  planType: pick(row, 'planType', 'PlanType', 'plan_type', 'planLabel', 'plan'),
  planId: pick(row, 'planId', 'PlanId', 'plan_id', 'p_plan_id'),
  paymentAmount: pick(row, 'paymentAmount', 'PaymentAmount', 'amount', 'paymentAmt', 'p_amount'),
  payment_date: pick(row, 'payment_date', 'paymentDate', 'PaymentDate', 'created_date'),
  payment_status: pick(row, 'payment_status', 'paymentStatus', 'PaymentStatus', 'status'),
  payment_type: pick(row, 'payment_type', 'paymentType', 'PaymentType', 'method'),
});

export default function PaymentReducer(state = init, action) {
  switch (action.type) {
    case FETCH_PAYMENTS_REQUEST:
      return { ...state, loading: true, error: false };
    case FETCH_PAYMENTS_SUCCESS:
      return { ...state, loading: false, data: Array.isArray(action.payload) ? action.payload.map(normalizePayment) : [] };
    case FETCH_PAYMENTS_FAILURE:
      return { ...state, loading: false, error: true };
    default:
      return state;
  }
}
