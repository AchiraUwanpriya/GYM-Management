import{ FETCH_PAYMENTS_REQUEST}from '../constants/PaymentConstant';
import{ FETCH_PAYMENTS_SUCCESS}from '../constants/PaymentConstant';
import{ FETCH_PAYMENTS_FAILURE}from '../constants/PaymentConstant';
import * as api from '../services/paymentApi';
import * as memberApi from '../services/memberApi';
import { showToast } from './uiAction';
import { isSuccess, getErrorMsg } from '../utils';

let fetchPaymentsRequest = null;

export const fetchPayments = () => (dispatch) => {
  if (fetchPaymentsRequest) return fetchPaymentsRequest;

  dispatch({ type: FETCH_PAYMENTS_REQUEST });

  fetchPaymentsRequest = api.getAllPayments()
    .then((res) => {
      dispatch({ type: FETCH_PAYMENTS_SUCCESS, payload: res.data?.ResultSet || [] });
    })
    .catch(() => {
      dispatch({ type: FETCH_PAYMENTS_FAILURE });
      dispatch(showToast('Failed to load payments', 'error'));
    })
    .finally(() => {
      fetchPaymentsRequest = null;
    });

  return fetchPaymentsRequest;
};

// FIX: member-scoped payments
export const fetchPaymentsByMember = (userId) => async (dispatch) => {
  dispatch({ type: FETCH_PAYMENTS_REQUEST });
  try {
    let memberId = userId;
    try {
      const mRes = await memberApi.getMemberByUserId(userId);
      const payload = mRes?.data?.ResultSet ?? mRes?.data;
      const member = Array.isArray(payload) ? payload[0] : payload;
      if (member?.memberId) memberId = member.memberId;
    } catch { /* ignore */ }

    const res = await api.getPaymentsByMember(memberId);
    dispatch({ type: FETCH_PAYMENTS_SUCCESS, payload: res.data?.ResultSet || [] });
  } catch { dispatch({ type: FETCH_PAYMENTS_FAILURE }); }
};

export const addCashPayment = (req, adminId) => async (dispatch) => {
  try {
    const res = await api.addCashPayment(req, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Cash payment recorded!', 'success'));
      dispatch(fetchPayments());
      return true;   // FIX: was returning res.data (object) which broke receipt display
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to record payment', 'error')); }
  return false;
};

export const updatePaymentStatus = (paymentId, status, adminId) => async (dispatch) => {
  try {
    const res = await api.updatePaymentStatus(paymentId, status, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Payment status updated!', 'success'));
      dispatch(fetchPayments());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to update payment', 'error')); }
  return false;
};

export const refundPayment = (paymentId, adminId) => async (dispatch) => {
  try {
    const res = await api.refundPayment(paymentId, adminId);
    if (isSuccess(res.data)) {
      dispatch(showToast('Payment refunded!', 'success'));
      dispatch(fetchPayments());
      return true;
    } else dispatch(showToast(getErrorMsg(res.data), 'error'));
  } catch { dispatch(showToast('Failed to refund payment', 'error')); }
  return false;
};

export const downloadReceipt = (paymentId, fallbackPayment) => async (dispatch) => {
  try {
    const res = await api.getPaymentReceipt(paymentId);
    if (res.data?.StatusCode === 200 && res.data?.ResultSet) {
      const b64 = res.data.ResultSet;
      const byteChars = atob(b64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `receipt_${paymentId}.pdf`; a.click();
      URL.revokeObjectURL(url);
      dispatch(showToast('Receipt downloaded!', 'success'));
      return;
    }
    throw new Error('no pdf');
  } catch {
    // Backend receipt endpoint unavailable — generate an HTML receipt client-side instead
    if (fallbackPayment) {
      const amount = parseFloat(fallbackPayment.amount || fallbackPayment.paymentAmount || fallbackPayment.paymentAmt || 0).toFixed(2);
      const method = fallbackPayment.paymentType || fallbackPayment.payment_type || fallbackPayment.method || '—';
      const status = fallbackPayment.status || fallbackPayment.payment_status || '—';
      const date = fallbackPayment.created_date || fallbackPayment.payment_date || fallbackPayment.date || '—';
      const member = fallbackPayment.memberName || fallbackPayment.member || fallbackPayment.userFullName || fallbackPayment.customerName || '—';
      const plan = fallbackPayment.planType || fallbackPayment.planLabel || fallbackPayment.plan || fallbackPayment.product || '—';

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt #${paymentId}</title></head><body style="font-family:sans-serif;max-width:400px;margin:40px auto;padding:20px;border:1px solid #eee;">
        <h2 style="text-align:center;margin-bottom:6px;letter-spacing:2px;">DTS GYM</h2>
        <p style="text-align:center;color:#666;margin-top:0;margin-bottom:12px;">Payment Receipt</p>
        <div style="border-top:1px dashed #ddd;margin:10px 0"></div>
        <p><strong>Receipt No:</strong> RCP-${paymentId}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Member:</strong> ${member}</p>
        <p><strong>Plan:</strong> ${plan}</p>
        <p><strong>Subscription ID:</strong> #${fallbackPayment.subscriptionId || fallbackPayment.subscriptionID || fallbackPayment.subscriptionId || '—'}</p>
        <p><strong>Payment Type:</strong> ${method}</p>
        <p><strong>Status:</strong> ${status}</p>
        <div style="border-top:1px dashed #ddd;margin:10px 0"></div>
        <div style="display:flex;justify-content:space-between;margin:8px 0;font-weight:700;font-family:monospace;">
          <div>AMOUNT PAID</div><div>LKR ${amount}</div>
        </div>
        <div style="border-top:1px dashed #ddd;margin:12px 0"></div>
        <div style="text-align:center;color:#666;font-size:0.9em">Thank you for your payment!<br>DTS Gym Management</div>
      </body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `receipt_${paymentId}.html`; a.click();
      URL.revokeObjectURL(url);
      dispatch(showToast('Backend PDF unavailable — downloaded an HTML receipt instead.', 'info'));
    } else {
      dispatch(showToast('Failed to download receipt', 'error'));
    }
  }
};
