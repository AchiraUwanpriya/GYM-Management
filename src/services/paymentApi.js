import { apiClient, toForm } from './_apiClient';

// ── PLANS ──────────────────────────────────────────────────
export const getAllPlans   = () => apiClient.get('/Plan/GetAllPlan');
// FIX: PlanRequestAPI has no plain "id", only p_plan_id.
export const getPlanById   = (id) => apiClient.get(`/Plan/GetPlanById?p_plan_id=${id}`);
export const addPlan       = (req, adminId) => apiClient.post('/Plan/AddPlan', toForm({ ...req, adminId, p_admin_id: adminId }));
export const editPlan      = (req, adminId) => apiClient.post('/Plan/EditPlan', toForm({ ...req, adminId, p_admin_id: adminId }));
export const deletePlan    = (id, adminId)  => apiClient.post('/Plan/DeletePlan', toForm({ id, p_plan_id: id, adminId, p_admin_id: adminId }));

// ── SUBSCRIPTIONS ──────────────────────────────────────────
export const getAllSubscriptions      = () => apiClient.get('/Subscription/GetAllSubscription');
export const getActiveSubscriptions   = () => apiClient.get('/Subscription/GetSubscriptionActive');
// FIX: needs p_subscription_id.
export const getSubscriptionById      = (id) => apiClient.get(`/Subscription/GetSubscriptionById?p_subscription_id=${id}`);
// FIX: needs p_member_id.
export const getSubscriptionsByMember = (memberId) => apiClient.get(`/Subscription/GetSubscriptionByMember?p_member_id=${memberId}`);
export const addSubscription          = (req, adminId) => apiClient.post('/Subscription/AddSubscription', toForm({ ...req, adminId, p_admin_id: adminId }));
export const editSubscription         = (req, adminId) => apiClient.post('/Subscription/EditSubscription', toForm({ ...req, adminId, p_admin_id: adminId }));
// FIX: actual actions are DeactivateSubscription / ActivateSubscription, not
// the bare Deactivate / Activate this used to call (404).
export const deactivateSubscription   = (id, adminId)  => apiClient.post('/Subscription/DeactivateSubscription', toForm({ id, p_subscription_id: id, adminId, p_admin_id: adminId }));
export const activateSubscription     = (id, adminId)  => apiClient.post('/Subscription/ActivateSubscription', toForm({ id, p_subscription_id: id, adminId, p_admin_id: adminId }));
// FIX (missing): DeleteSubscription exists on the backend but had no
// frontend function calling it at all.
export const deleteSubscription       = (id, adminId)  => apiClient.post('/Subscription/DeleteSubscription', toForm({ id, p_subscription_id: id, adminId, p_admin_id: adminId }));

// ── PAYMENTS ───────────────────────────────────────────────
export const getAllPayments             = () => apiClient.get('/Payment/GetAllPayment');
// FIX: needs p_payment_id.
export const getPaymentById             = (id) => apiClient.get(`/Payment/GetPaymentById?p_payment_id=${id}`);
// FIX: needs p_member_id.
export const getPaymentsByMember        = (memberId) => apiClient.get(`/Payment/GetPaymentByMember?p_member_id=${memberId}`);
// FIX: needs p_subscription_id.
export const getPaymentsBySubscription  = (subscriptionId) => apiClient.get(`/Payment/GetPaymentBySubscription?p_subscription_id=${subscriptionId}`);
export const addCashPayment = (req, adminId) => apiClient.post('/Payment/AddPaymentByCash', toForm({ ...req, adminId, p_admin_id: adminId }));
export const initiateCardPayment = (req) => apiClient.post('/Payment/InitiateCardPayment', toForm(req));
export const confirmCardPayment = (paymentIntentId) => apiClient.post('/Payment/ConfirmCardPayment', toForm({ paymentIntentId, p_stripe_payment_intent_id: paymentIntentId }));
// FIX: needs p_payment_id / p_payment_status / p_admin_id.
export const updatePaymentStatus = (paymentId, status, adminId) =>
  apiClient.post('/Payment/UpdatePaymentStatus', toForm({ paymentId, status, adminId, p_payment_id: paymentId, p_payment_status: status, p_admin_id: adminId }));
export const refundPayment = (paymentId, adminId) => apiClient.post('/Payment/RefundPayment', toForm({ paymentId, adminId, p_payment_id: paymentId, p_admin_id: adminId }));
// FIX: needs p_payment_id.
export const getPaymentReceipt = (paymentId) => apiClient.get(`/Payment/GetPaymentReceipt?p_payment_id=${paymentId}`);