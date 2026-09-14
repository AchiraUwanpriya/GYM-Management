const STORAGE_KEY = 'dts_gym_workflows_v1';
export const WORKFLOW_STORE_EVENT = 'dts-gym-workflows-updated';

const EMPTY_STORE = {
  trainerRequests: [],
  cashPaymentRequests: [],
};

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const readStore = () => {
  if (typeof window === 'undefined') return { ...EMPTY_STORE };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...EMPTY_STORE };

  const parsed = safeJsonParse(raw, EMPTY_STORE);
  return {
    trainerRequests: Array.isArray(parsed?.trainerRequests) ? parsed.trainerRequests : [],
    cashPaymentRequests: Array.isArray(parsed?.cashPaymentRequests) ? parsed.cashPaymentRequests : [],
  };
};

const emitChange = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(WORKFLOW_STORE_EVENT));
};

const writeStore = (nextValue) => {
  if (typeof window === 'undefined') return nextValue;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
  emitChange();
  return nextValue;
};

const updateStore = (updater) => {
  const current = readStore();
  const next = typeof updater === 'function' ? updater(current) : updater;
  return writeStore(next);
};

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

export const subscribeWorkflowStore = (listener) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => listener(readStore());
  window.addEventListener(WORKFLOW_STORE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(WORKFLOW_STORE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
};

export const getTrainerRequests = () => readStore().trainerRequests;

export const createTrainerRequest = (payload) => {
  const request = {
    id: createId('TR'),
    status: 'pending',
    requestedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewNote: '',
    ...payload,
  };

  updateStore((store) => ({
    ...store,
    trainerRequests: [request, ...store.trainerRequests],
  }));

  return request;
};

export const updateTrainerRequest = (requestId, patch) => {
  let updated = null;

  updateStore((store) => ({
    ...store,
    trainerRequests: store.trainerRequests.map((request) => {
      if (request.id !== requestId) return request;
      updated = { ...request, ...patch };
      return updated;
    }),
  }));

  return updated;
};

export const cancelTrainerRequest = (requestId) => {
  updateStore((store) => ({
    ...store,
    trainerRequests: store.trainerRequests.filter((r) => r.id !== requestId),
  }));
};

export const getCashPaymentRequests = () => readStore().cashPaymentRequests;

export const createCashPaymentRequest = (payload) => {
  const request = {
    id: createId('CP'),
    status: 'pending',
    createdAt: new Date().toISOString(),
    generatedOtp: '',
    otpGeneratedAt: null,
    memberConfirmedAt: null,
    adminConfirmedAt: null,
    completedAt: null,
    rejectedAt: null,
    rejectionReason: '',
    receipt: null,
    ...payload,
  };

  updateStore((store) => ({
    ...store,
    cashPaymentRequests: [request, ...store.cashPaymentRequests],
  }));

  return request;
};

export const updateCashPaymentRequest = (requestId, patch) => {
  let updated = null;

  updateStore((store) => ({
    ...store,
    cashPaymentRequests: store.cashPaymentRequests.map((request) => {
      if (request.id !== requestId) return request;
      updated = { ...request, ...patch };
      return updated;
    }),
  }));

  return updated;
};

export const generateCashPaymentOtp = (requestId) => {
  const otp = createOtp();
  return updateCashPaymentRequest(requestId, {
    status: 'otp_generated',
    generatedOtp: otp,
    otpGeneratedAt: new Date().toISOString(),
    memberConfirmedAt: null,
    adminConfirmedAt: null,
  });
};

export const confirmCashPaymentOtp = (requestId, otp, actor) => {
  const request = getCashPaymentRequests().find((item) => item.id === requestId);
  if (!request || !request.generatedOtp) {
    return { ok: false, message: 'OTP has not been generated yet.' };
  }
  if (String(otp).trim() !== String(request.generatedOtp)) {
    return { ok: false, message: 'The OTP you entered is not correct.' };
  }

  const patch = actor === 'member'
    ? { memberConfirmedAt: new Date().toISOString() }
    : { adminConfirmedAt: new Date().toISOString() };

  const updated = updateCashPaymentRequest(requestId, patch);
  return {
    ok: true,
    request: updated,
    message: actor === 'member'
      ? 'Member OTP verification complete.'
      : 'Admin OTP verification complete.',
  };
};

export const completeCashPaymentRequest = (requestId, receipt) =>
  updateCashPaymentRequest(requestId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    receipt,
  });

export const rejectCashPaymentRequest = (requestId, reason = '') =>
  updateCashPaymentRequest(requestId, {
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason,
  });

export const buildReceiptHtml = (receipt) => [
  '<!DOCTYPE html>',
  '<html><head><meta charset="utf-8" /><title>DTS Gym Receipt</title>',
  '<style>',
  'body{font-family:monospace;max-width:420px;margin:24px auto;padding:24px;border:1px solid #d1d5db;color:#0f172a;}',
  'h2{text-align:center;letter-spacing:0.4em;margin:0 0 8px;}',
  'p{text-align:center;color:#64748b;margin:0 0 12px;}',
  '.line{border-top:1px dashed #cbd5e1;margin:12px 0;}',
  '.row{display:flex;justify-content:space-between;gap:16px;margin:8px 0;}',
  '.amount{font-size:1.35rem;font-weight:bold;}',
  '.footer{text-align:center;margin-top:20px;font-size:0.8rem;color:#64748b;}',
  '</style></head><body>',
  '<h2>DTS GYM</h2>',
  '<p>Cash Payment Receipt</p>',
  '<div class="line"></div>',
  '<div class="row"><span>Receipt No</span><strong>' + (receipt?.receiptNo || '-') + '</strong></div>',
  '<div class="row"><span>Date</span><span>' + (receipt?.date || '-') + '</span></div>',
  '<div class="row"><span>Subscription</span><span>#' + (receipt?.subscriptionId || '-') + '</span></div>',
  '<div class="row"><span>Member</span><span>' + (receipt?.memberName || '-') + '</span></div>',
  '<div class="row"><span>Plan</span><span>' + (receipt?.planLabel || receipt?.planType || '-') + '</span></div>',
  '<div class="row"><span>Payment Method</span><span>' + (receipt?.paymentType || 'Cash') + '</span></div>',
  '<div class="row"><span>Status</span><span>' + (receipt?.status || 'Completed') + '</span></div>',
  '<div class="line"></div>',
  '<div class="row amount"><span>Amount</span><span>LKR ' + parseFloat(receipt?.amount || 0).toFixed(2) + '</span></div>',
  '<div class="line"></div>',
  '<div class="footer">' + (receipt?.emailMessage || 'Receipt has been prepared for the member email.') + '</div>',
  '</body></html>',
].join('');

export const downloadReceiptHtml = (receipt) => {
  if (typeof window === 'undefined') return;
  const html = buildReceiptHtml(receipt);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = (receipt?.receiptNo || 'dts-receipt') + '.html';
  anchor.click();
  window.URL.revokeObjectURL(url);
};
