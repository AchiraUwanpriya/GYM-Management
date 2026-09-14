// ============================================================
//  Payments.jsx — Cash + Card payments with receipt generation
//  Member view now includes a "Pay Now" button for unpaid
//  subscriptions. After successful payment the button hides.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPayments, fetchPaymentsByMember, addCashPayment, updatePaymentStatus, refundPayment, downloadReceipt } from '../actions/paymentAction';
import { fetchSubscriptions } from '../actions/subscriptionAction';
import { fetchPlans } from '../actions/planAction';
import { fetchMembers } from '../actions/memberAction';
import { showToast } from '../actions/uiAction';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { formatDate, formatCurrency, sumBy } from '../utils';
import { ROLES } from '../../index';
import * as api from '../services/api';
import {
  completeCashPaymentRequest, confirmCashPaymentOtp, downloadReceiptHtml,
  generateCashPaymentOtp, getCashPaymentRequests, rejectCashPaymentRequest,
  createCashPaymentRequest, subscribeWorkflowStore,
} from '../utils/workflowStore';

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

const initCash = { p_subscription_id: '', p_amount: '' };

export default function Payments() {
  const dispatch        = useDispatch();
  const { data, loading } = useSelector((s) => s.payments);
  const subscriptions   = useSelector((s) => s.subscriptions.data);
  const plans           = useSelector((s) => s.plans?.data || []);
  const members         = useSelector((s) => s.members?.data || []);
  const adminId         = useSelector((s) => s.ui.currentUserId);
  const user            = useSelector((s) => s.auth.user);
  const isAdmin         = user?.roleName === ROLES.ADMIN;

  const [showCash,    setShowCash]    = useState(false);
  const [cashForm,    setCashForm]    = useState(initCash);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [statFilter,  setStatFilter]  = useState('all');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [cashRequests, setCashRequests] = useState([]);

  // ── Member Pay-Now modal state ──────────────────────────────
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMode,  setPaymentMode]  = useState('card');
  const [payForm, setPayForm] = useState({
    subscriptionId: '', amount: '', customerEmail: '',
    cardNumber: '', cardHolder: '', bankName: '',
    expMonth: '', expYear: '', cvc: '',
  });
  const [payLoading, setPayLoading] = useState(false);
  const [payError,   setPayError]   = useState('');
  const [payMsg,     setPayMsg]     = useState('');

  // ── Derived: which subscriptions have been fully paid ───────
  const paidSubscriptionIds = useMemo(() => {
    const paidStatuses = new Set(['completed', 'paid', 'verified', 'success']);
    return new Set(
      data
        .filter((p) => paidStatuses.has((p.payment_status || '').trim().toLowerCase()))
        .map((p) => String(p.subscriptionId))
    );
  }, [data]);

  const availableCashSubscriptions = useMemo(
    () => subscriptions.filter((s) => !paidSubscriptionIds.has(String(s.subscriptionId))),
    [subscriptions, paidSubscriptionIds]
  );

  // Member's own subscriptions that haven't been paid yet
  const mySubscriptions = useMemo(() => {
    if (isAdmin || !user?.userId) return [];
    return subscriptions
      .filter((s) => String(s.memberId || s.userId) === String(user.userId))
      .sort((a, b) => new Date(b.startDate || b.created_date || 0) - new Date(a.startDate || a.created_date || 0));
  }, [subscriptions, user?.userId, isAdmin]);

  const unpaidSubscriptions = useMemo(
    () => mySubscriptions.filter((s) => !paidSubscriptionIds.has(String(s.subscriptionId))),
    [mySubscriptions, paidSubscriptionIds]
  );

  const hasUnpaidSub = unpaidSubscriptions.length > 0;

  // ── Helpers ─────────────────────────────────────────────────
  const resolvePlanName = (sub) => {
    if (!sub) return 'Unknown';
    if (sub.planType) return sub.planType;
    const plan = plans.find((p) => String(p.planId) === String(sub.planId));
    return plan?.planType || `Plan #${sub.planId}`;
  };
  const resolvePlanPrice = (sub) => {
    if (!sub) return null;
    if (sub.price) return sub.price;
    const plan = plans.find((p) => String(p.planId) === String(sub.planId));
    return plan?.price || null;
  };

  // ── Effects ─────────────────────────────────────────────────
  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchPayments());
    } else if (user?.userId) {
      dispatch(fetchPaymentsByMember(user.userId));
    }
    dispatch(fetchSubscriptions());
    dispatch(fetchPlans());
    dispatch(fetchMembers());
  }, [dispatch, isAdmin, user?.userId]);

  useEffect(() => {
    const syncCashRequests = () => setCashRequests(getCashPaymentRequests());
    syncCashRequests();
    return subscribeWorkflowStore(syncCashRequests);
  }, []);

  useEffect(() => {
    if (
      cashForm.p_subscription_id &&
      !availableCashSubscriptions.some((s) => String(s.subscriptionId) === String(cashForm.p_subscription_id))
    ) {
      setCashForm((f) => ({ ...f, p_subscription_id: '' }));
    }
  }, [availableCashSubscriptions, cashForm.p_subscription_id]);

  // ── Admin cash handling ─────────────────────────────────────
  const handleCashAdd = async () => {
    if (!cashForm.p_subscription_id || !cashForm.p_amount) return;
    const sub = subscriptions.find((s) => String(s.subscriptionId) === String(cashForm.p_subscription_id));
    const member = members.find((m) => String(m.memberId) === String(sub?.memberId));
    const plan = plans.find((p) => String(p.planId) === String(sub?.planId));
    setSaving(true);
    const ok = await dispatch(addCashPayment(cashForm, adminId));
    setSaving(false);
    if (ok) {
      setReceiptData({
        receiptNo:      'RCP-' + Date.now(),
        date:           new Date().toLocaleString(),
        subscriptionId: cashForm.p_subscription_id,
        amount:         cashForm.p_amount,
        memberName:     sub?.memberName || (member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : ''),
        planLabel:      sub?.planType || plan?.planType || (sub?.planId ? `Plan #${sub.planId}` : ''),
        paymentType:    'Cash',
        status:         'Completed',
        generatedBy:    'DTS Gym Management',
        emailMessage:   'Receipt marked for member email delivery.',
      });
      setShowCash(false);
      setCashForm(initCash);
      setShowReceipt(true);
    }
  };

  const handleRejectCashRequest = (requestId) => {
    rejectCashPaymentRequest(requestId, 'Admin rejected this counter payment request.');
  };

  const handleConfirmCashRequest = async (request) => {
    setSaving(true);
    const ok = await dispatch(addCashPayment({
      p_subscription_id: request.subscriptionId,
      p_amount: request.amount,
    }, adminId));
    setSaving(false);

    if (!ok) return;

    const receipt = {
      receiptNo: `RCP-${Date.now()}`,
      date: new Date().toLocaleString(),
      subscriptionId: request.subscriptionId,
      amount: request.amount,
      paymentType: 'Cash',
      status: 'Completed',
      generatedBy: 'DTS Gym Management',
      memberName: request.memberName,
      planLabel: request.planLabel,
      emailMessage: `Receipt prepared for ${request.memberEmail || 'the member email'} and ready to download.`,
    };

    completeCashPaymentRequest(request.id, receipt);
    setReceiptData(receipt);
    setShowReceipt(true);
  };

  const printReceipt = () => {
    if (!receiptData) return;
    const w = window.open('', '_blank');
    const html = [
      '<!DOCTYPE html><html><head><title>Receipt</title>',
      '<style>',
      'body{font-family:monospace;max-width:400px;margin:40px auto;padding:20px;border:1px solid #ccc}',
      'h2{text-align:center;letter-spacing:4px}',
      '.line{border-top:1px dashed #ccc;margin:10px 0}',
      '.row{display:flex;justify-content:space-between;margin:6px 0}',
      '.total{font-size:1.4em;font-weight:bold}',
      '.footer{text-align:center;margin-top:20px;font-size:0.8em;color:#666}',
      '</style></head><body>',
      '<h2>DTS GYM</h2>',
      '<p style="text-align:center;color:#666">Payment Receipt</p>',
      '<div class="line"></div>',
      '<div class="row"><span>Receipt No:</span><strong>' + receiptData.receiptNo + '</strong></div>',
      '<div class="row"><span>Date:</span><span>' + receiptData.date + '</span></div>',
      '<div class="row"><span>Subscription ID:</span><span>#' + receiptData.subscriptionId + '</span></div>',
      '<div class="row"><span>Member:</span><span>' + (receiptData.memberName || '-') + '</span></div>',
      '<div class="row"><span>Plan:</span><span>' + (receiptData.planLabel || '-') + '</span></div>',
      '<div class="row"><span>Payment Type:</span><span>' + receiptData.paymentType + '</span></div>',
      '<div class="row"><span>Status:</span><span>' + receiptData.status + '</span></div>',
      '<div class="line"></div>',
      '<div class="row total"><span>AMOUNT PAID:</span><span>LKR ' + parseFloat(receiptData.amount || 0).toFixed(2) + '</span></div>',
      '<div class="line"></div>',
      '<div class="footer">Thank you for your payment!<br>' + receiptData.generatedBy + '</div>',
      '</body></html>',
    ].join('');
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const handleApprove = (id) => dispatch(updatePaymentStatus(id, 'completed', adminId));
  const handleReject  = (id) => dispatch(updatePaymentStatus(id, 'failed', adminId));
  const handleRefund  = (id) => {
    if (window.confirm('Refund payment #' + id + '? This cannot be undone.'))
      dispatch(refundPayment(id, adminId));
  };
  const handleReceipt = (row) => dispatch(downloadReceipt(row.paymentId, row));

  // ── Member Pay Now handlers ─────────────────────────────────
  const openPayNow = () => {
    const firstUnpaid = unpaidSubscriptions[0] || null;
    setPaymentMode('card');
    setPayForm({
      subscriptionId: firstUnpaid?.subscriptionId || '',
      amount:         resolvePlanPrice(firstUnpaid) || firstUnpaid?.price || '',
      customerEmail:  user?.email || '',
      cardNumber: '', cardHolder: '', bankName: '',
      expMonth: '', expYear: '', cvc: '',
    });
    setPayMsg(''); setPayError(''); setShowPayModal(true);
  };

  const handleCardPayment = async () => {
    if (!payForm.subscriptionId || !payForm.amount || payForm.cardNumber.replace(/\s/g,'').length !== 16) {
      setPayError('Please fill all required fields (card number must be 16 digits).'); return;
    }
    setPayLoading(true); setPayError(''); setPayMsg('');
    try {
      const res = await api.initiateCardPayment({
        subscriptionId: payForm.subscriptionId,
        amount:         payForm.amount,
        customerEmail:  payForm.customerEmail,
      });
      if (res.data?.StatusCode === 200 || res.data?.StatusCode === 201) {
        const intentId = res.data.ResultSet?.paymentIntentId;
        if (intentId) {
          await api.confirmCardPayment(intentId);
        }
        dispatch(fetchPaymentsByMember(user.userId));
        setPayMsg('Payment successful! Check your email for confirmation.');
        setTimeout(() => setShowPayModal(false), 3000);
      } else { setPayError(res.data?.Result || 'Payment initiation failed.'); }
    } catch { setPayError('Could not connect to payment server.'); }
    setPayLoading(false);
  };

  const handleMemberCashRequest = () => {
    if (!payForm.subscriptionId || !payForm.amount) {
      setPayError('Select a subscription and amount before sending a cash payment request.');
      return;
    }
    const memberCashRequests = cashRequests.filter((r) => String(r.memberId) === String(user?.userId));
    const existing = memberCashRequests.find(
      (r) => String(r.subscriptionId) === String(payForm.subscriptionId) &&
             ['pending', 'otp_generated'].includes(r.status)
    );
    if (existing) {
      setPayError('You already have a cash payment request waiting for admin confirmation.');
      return;
    }
    const selSub = mySubscriptions.find((s) => String(s.subscriptionId) === String(payForm.subscriptionId));
    createCashPaymentRequest({
      memberId:       user.userId,
      memberName:     user.username || user.email || `Member #${user.userId}`,
      memberEmail:    user.email   || '',
      memberPhone:    user.phone   || '',
      subscriptionId: payForm.subscriptionId,
      amount:         payForm.amount,
      planLabel:      selSub?.planType || resolvePlanName(selSub) || `Subscription #${payForm.subscriptionId}`,
    });
    setPayError('');
    setPayMsg('Cash payment request sent. Meet the admin counter to continue with OTP verification.');
    dispatch(showToast('Cash payment request sent to admin!', 'success'));
    setTimeout(() => setShowPayModal(false), 1200);
  };

  // ── Filtering ───────────────────────────────────────────────
  const enrichedPayments = useMemo(() => {
    return data.map((payment) => {
      const sub = subscriptions.find((s) => String(s.subscriptionId) === String(payment.subscriptionId));
      const member = members.find((m) => String(m.memberId) === String(payment.memberId || sub?.memberId));
      const plan = plans.find((p) => String(p.planId) === String(payment.planId || sub?.planId));
      const memberName = payment.memberName || sub?.memberName || (member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : '');
      const planType = payment.planType || sub?.planType || plan?.planType;
      return {
        ...payment,
        memberId: payment.memberId || sub?.memberId,
        memberName: memberName || (payment.memberId || sub?.memberId ? `Member #${payment.memberId || sub?.memberId}` : '—'),
        planId: payment.planId || sub?.planId,
        planType: planType || (payment.planId || sub?.planId ? `Plan #${payment.planId || sub?.planId}` : '—'),
      };
    });
  }, [data, subscriptions, members, plans]);

  const validData = useMemo(() => {
    return enrichedPayments.filter(p => !((p.payment_type || '').toLowerCase() === 'card' && (p.payment_status || '').toLowerCase() === 'pending'));
  }, [enrichedPayments]);

  let filtered = validData;
  if (search)               filtered = filtered.filter((p) =>
    String(p.paymentId).includes(search) ||
    (p.memberName || '').toLowerCase().includes(search.toLowerCase()) ||
    String(p.subscriptionId).includes(search)
  );
  if (typeFilter !== 'all') filtered = filtered.filter((p) => (p.payment_type || '').toLowerCase() === typeFilter);
  if (statFilter !== 'all') filtered = filtered.filter((p) => (p.payment_status || '').toLowerCase() === statFilter);

  const totalRevenue   = sumBy(validData.filter((p) => (p.payment_status || '').toLowerCase() === 'completed'), 'paymentAmount');
  const pendingCount   = validData.filter((p) => (p.payment_status || '').toLowerCase() === 'pending').length;
  const completedCount = validData.filter((p) => (p.payment_status || '').toLowerCase() === 'completed').length;
  const cardCount      = validData.filter((p) => (p.payment_type || '').toLowerCase() === 'card').length;
  const cashCount      = validData.filter((p) => (p.payment_type || '').toLowerCase() === 'cash').length;

  const statusVariant = (s) => {
    const l = (s || '').toLowerCase();
    if (l === 'completed') return 'active';
    if (l === 'pending')   return 'pending';
    if (l === 'failed')    return 'inactive';
    if (l === 'refunded')  return 'info';
    return 'default';
  };

  const columns = [
    { key: 'paymentId',     label: 'ID',     width: 60, render: (v) => <span className="id-chip">#{v}</span> },
    { key: 'memberName',    label: 'Member', render: (v) => <span className="font-medium" style={{ color: 'var(--gym-text)' }}>{v || '—'}</span> },
    { key: 'planType',      label: 'Plan',   render: (v) => v || '—' },
    { key: 'paymentAmount', label: 'Amount', render: (v) => <span className="font-mono font-bold" style={{ color: 'var(--gym-accent)' }}>{formatCurrency(v)}</span> },
    { key: 'payment_type',  label: 'Type',   render: (v) => (
      <span className="flex items-center gap-1">
        {(v || '').toLowerCase() === 'card' ? '💳' : '💵'}
        <span style={{ color: (v || '').toLowerCase() === 'card' ? 'var(--gym-accent3)' : 'var(--gym-success)' }}>{v}</span>
      </span>
    )},
    { key: 'payment_status', label: 'Status', render: (v) => <Badge variant={statusVariant(v)}>{v || 'pending'}</Badge> },
    { key: 'payment_date',   label: 'Date',   render: (v) => <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>{v ? v.substring(0, 10) : '—'}</span> },
    ...(isAdmin ? [{
      key: '_actions', label: 'Actions', render: (_, row) => {
        const st = (row.payment_status || '').toLowerCase();
        return (
          <div className="flex gap-1 flex-wrap">
            {st === 'pending'   && <button className="btn btn-secondary btn-sm" style={{ color: 'var(--gym-success)' }} onClick={() => handleApprove(row.paymentId)}>✓ Approve</button>}
            {st === 'pending'   && <button className="btn btn-danger btn-sm" onClick={() => handleReject(row.paymentId)}>✕ Reject</button>}
            {st === 'completed' && <button className="btn btn-secondary btn-sm" onClick={() => handleRefund(row.paymentId)}>↩ Refund</button>}
            <button className="btn btn-secondary btn-sm" onClick={() => handleReceipt(row)}>🧾 Receipt</button>
          </div>
        );
      }
    }] : [{ key: '_rec', label: '', render: (_, row) => (
      <button className="btn btn-secondary btn-sm" onClick={() => handleReceipt(row)}>🧾 Receipt</button>
    )}]),
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <div className="page-title">{isAdmin ? 'Payments' : 'My Payments'}</div>
          <div className="page-sub">{data.length} total · {completedCount} completed · {pendingCount} pending</div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={() => {
            if (isAdmin) dispatch(fetchPayments());
            else dispatch(fetchPaymentsByMember(user.userId));
          }}>↺ Refresh</button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowCash(true)}>+ Add Cash Payment</button>
          )}
          {/* ── Member Pay Now Button ─── */}
          {!isAdmin && hasUnpaidSub && (
            <button className="btn btn-primary" onClick={openPayNow}>
              💳 Pay Now
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isAdmin ? 'Total Revenue' : 'Total Paid', value: formatCurrency(totalRevenue), color: 'var(--gym-accent)' },
          { label: 'Completed',     value: completedCount, color: 'var(--gym-success)' },
          { label: 'Pending',       value: pendingCount,   color: 'var(--gym-warning)' },
          { label: 'Card / Cash',   value: cardCount + ' / ' + cashCount, color: 'var(--gym-accent3)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-xs mb-1" style={{ color: 'var(--gym-muted)', letterSpacing: '0.1em' }}>{label.toUpperCase()}</div>
            <div className="text-xl font-bold" style={{ color, fontFamily: "'Space Mono', monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Unpaid subscription banner for members */}
      {!isAdmin && hasUnpaidSub && (
        <div className="p-4 rounded-2xl flex items-center justify-between" style={{ background: 'rgba(255,179,71,.08)', border: '1px solid rgba(255,179,71,.2)' }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--gym-warning)' }}>
              ⚠ You have {unpaidSubscriptions.length} unpaid subscription{unpaidSubscriptions.length > 1 ? 's' : ''}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>
              {unpaidSubscriptions.map((s) => resolvePlanName(s)).join(', ')} — {formatCurrency(resolvePlanPrice(unpaidSubscriptions[0]) || 0)}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openPayNow}>
            💳 Pay Now
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--gym-muted)' }}>🔍</span>
          <input className="gym-input pl-8 w-48" placeholder="Search member, ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="gym-input w-36" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="cash">Cash 💵</option>
          <option value="card">Card 💳</option>
        </select>
        <select className="gym-input w-36" value={statFilter} onChange={(e) => setStatFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} rowKey="paymentId" />

      {/* Add Cash Payment Modal */}
      <Modal isOpen={showCash} onClose={() => setShowCash(false)} title="ADD CASH PAYMENT" maxWidth={440}>
        <div className="modal-body space-y-4">
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(39,174,96,.08)', border: '1px solid rgba(39,174,96,.2)', color: 'var(--gym-success)' }}>
            💵 Recording a cash payment received at gym counter
          </div>
          <FieldGroup label="Subscription *">
            <select className="gym-input" value={cashForm.p_subscription_id}
              onChange={(e) => setCashForm((f) => ({ ...f, p_subscription_id: e.target.value }))}>
              <option value="">Select subscription...</option>
              {availableCashSubscriptions.map((s) => (
                <option key={s.subscriptionId} value={s.subscriptionId}>
                  #{s.subscriptionId} - {s.memberName || 'Member #' + s.memberId} ({resolvePlanName(s)})
                </option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup label="Amount (LKR) *">
            <input className="gym-input font-mono" type="number" min="0" step="0.01"
              value={cashForm.p_amount}
              onChange={(e) => setCashForm((f) => ({ ...f, p_amount: e.target.value }))}
              placeholder="5000.00" />
          </FieldGroup>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowCash(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCashAdd} disabled={saving}>
            {saving ? 'Saving...' : '💵 Record Cash Payment'}
          </button>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} title="💵 PAYMENT RECEIPT" maxWidth={440}>
        {receiptData && (
          <div className="modal-body space-y-3">
            <div className="p-5 rounded-2xl text-center" style={{ background: 'linear-gradient(135deg,rgba(71,255,154,.08),rgba(71,200,255,.05))', border: '1px solid rgba(71,255,154,.2)' }}>
              <div className="text-3xl mb-2">✅</div>
              <div className="text-xl font-bold" style={{ color: 'var(--gym-success)', fontFamily: "'Bebas Neue',cursive", letterSpacing: '0.1em' }}>PAYMENT CONFIRMED</div>
              <div className="text-2xl font-bold mt-2" style={{ color: 'var(--gym-text)', fontFamily: "'Space Mono',monospace" }}>
                LKR {parseFloat(receiptData.amount || 0).toFixed(2)}
              </div>
            </div>
            <div className="space-y-2">
              {[
                ['Receipt No',      receiptData.receiptNo],
                ['Date & Time',     receiptData.date],
                ['Subscription ID', '#' + receiptData.subscriptionId],
                ['Member',          receiptData.memberName || '—'],
                ['Plan',            receiptData.planLabel || '—'],
                ['Payment Method',  receiptData.paymentType],
                ['Status',          receiptData.status],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center p-3 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
                  <span className="text-xs" style={{ color: 'var(--gym-muted)' }}>{k}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl text-xs text-center" style={{ background: 'rgba(71,200,255,.06)', color: 'var(--gym-muted)', border: '1px solid rgba(71,200,255,.15)' }}>
              🏋️ Thank you! Your payment has been recorded by {receiptData.generatedBy}
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowReceipt(false)}>Close</button>
          <button className="btn btn-secondary" onClick={() => receiptData && downloadReceiptHtml(receiptData)}>Download</button>
          <button className="btn btn-primary" onClick={printReceipt}>🖨️ Print Receipt</button>
        </div>
      </Modal>

      {/* ── Member Pay Now Modal ─────────────────────────────── */}
      {!isAdmin && (
        <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="💳 PAYMENT" maxWidth={460}>
          <div className="modal-body space-y-4">
            {/* Card / Cash toggle */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--gym-surface2)' }}>
              {[['card','Card'],['cash','Cash']].map(([mode, label]) => (
                <button key={mode} className="flex-1 py-2 rounded-lg text-sm font-medium"
                  style={{ background: paymentMode === mode ? 'var(--gym-surface)' : 'transparent', color: paymentMode === mode ? 'var(--gym-text)' : 'var(--gym-muted)' }}
                  onClick={() => { setPaymentMode(mode); setPayError(''); setPayMsg(''); }}>
                  {label}
                </button>
              ))}
            </div>

            {paymentMode === 'cash' && (
              <div className="p-4 rounded-2xl text-sm" style={{ background: 'rgba(255,179,71,.08)', border: '1px solid rgba(255,179,71,.2)', color: 'var(--gym-warning)' }}>
                Submit the request here and pay the admin with cash at the counter.
              </div>
            )}

            {/* Card preview + card fields — only shown for card payment */}
            {paymentMode === 'card' && (
              <>
                <div className="p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)', border: '1px solid rgba(71,200,255,0.2)' }}>
                  <div className="font-mono text-base tracking-[.2em] mb-1" style={{ color: 'rgba(255,255,255,.8)' }}>{payForm.cardNumber || '•••• •••• •••• ••••'}</div>
                  <div className="flex gap-4 text-xs" style={{ color: 'rgba(255,255,255,.5)' }}><span>{payForm.cardHolder || 'CARDHOLDER'}</span><span>{payForm.expMonth || 'MM'}/{payForm.expYear || 'YY'}</span></div>
                </div>
                <FieldGroup label="Card Number *"><input className="gym-input font-mono tracking-widest" type="text" maxLength={19} placeholder="•••• •••• •••• ••••" value={payForm.cardNumber} onChange={(e) => { const r = e.target.value.replace(/\D/g,'').slice(0,16); setPayForm((f) => ({ ...f, cardNumber: r.match(/.{1,4}/g)?.join(' ') || r })); }} /></FieldGroup>
                <FieldGroup label="Cardholder Name *"><input className="gym-input" type="text" placeholder="Name on card" value={payForm.cardHolder} onChange={(e) => setPayForm((f) => ({ ...f, cardHolder: e.target.value }))} /></FieldGroup>
                <FieldGroup label="Bank Name"><input className="gym-input" type="text" placeholder="e.g. Commercial Bank" value={payForm.bankName} onChange={(e) => setPayForm((f) => ({ ...f, bankName: e.target.value }))} /></FieldGroup>
                <div className="grid grid-cols-3 gap-3">
                  <FieldGroup label="Month (MM)"><input className="gym-input font-mono" type="text" maxLength={2} placeholder="MM" value={payForm.expMonth} onChange={(e) => setPayForm((f) => ({ ...f, expMonth: e.target.value.replace(/\D/,'').slice(0,2) }))} /></FieldGroup>
                  <FieldGroup label="Year (YY)"><input className="gym-input font-mono" type="text" maxLength={2} placeholder="YY" value={payForm.expYear} onChange={(e) => setPayForm((f) => ({ ...f, expYear: e.target.value.replace(/\D/,'').slice(0,2) }))} /></FieldGroup>
                  <FieldGroup label="CVC *"><input className="gym-input font-mono" type="password" maxLength={4} placeholder="•••" value={payForm.cvc} onChange={(e) => setPayForm((f) => ({ ...f, cvc: e.target.value.replace(/\D/,'').slice(0,4) }))} /></FieldGroup>
                </div>
              </>
            )}

            {/* Subscription + Amount — shown for both modes */}
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Subscription">
                <select className="gym-input" value={payForm.subscriptionId} onChange={(e) => {
                  const selSub = unpaidSubscriptions.find((s) => String(s.subscriptionId) === e.target.value);
                  const price  = selSub ? (resolvePlanPrice(selSub) || selSub.price || '') : '';
                  setPayForm((f) => ({ ...f, subscriptionId: e.target.value, amount: price }));
                }}>
                  <option value="">Select subscription…</option>
                  {unpaidSubscriptions.map((s) => (
                    <option key={s.subscriptionId} value={s.subscriptionId}>
                      {resolvePlanName(s)} — {formatCurrency(resolvePlanPrice(s) || 0)}
                    </option>
                  ))}
                </select>
              </FieldGroup>
              <FieldGroup label="Amount (LKR)"><input className="gym-input" type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></FieldGroup>
            </div>

            {/* Email — only for card mode */}
            {paymentMode === 'card' && (
              <FieldGroup label="Email for Receipt"><input className="gym-input" type="email" value={payForm.customerEmail} onChange={(e) => setPayForm((f) => ({ ...f, customerEmail: e.target.value }))} /></FieldGroup>
            )}

            {/* Cash payment request button */}
            {paymentMode === 'cash' && (
              <>
                <button className="btn btn-primary w-full justify-center" onClick={handleMemberCashRequest}>
                  💵 Request Cash Payment
                </button>

                {/* Show existing cash requests status */}
                {cashRequests.filter((r) => String(r.memberId) === String(user?.userId)).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gym-muted)' }}>Your Cash Requests</div>
                    {cashRequests.filter((r) => String(r.memberId) === String(user?.userId)).map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--gym-text)' }}>{req.planLabel || `Sub #${req.subscriptionId}`}</div>
                          <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>LKR {req.amount}</div>
                        </div>
                        <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{
                          background: req.status === 'approved' || req.status === 'completed' ? 'rgba(71,255,154,.12)' :
                                      req.status === 'rejected' ? 'rgba(255,71,71,.12)' : 'rgba(255,179,71,.12)',
                          color: req.status === 'approved' || req.status === 'completed' ? 'var(--gym-success)' :
                                 req.status === 'rejected' ? 'var(--gym-accent2)' : 'var(--gym-warning)',
                          border: `1px solid ${req.status === 'approved' || req.status === 'completed' ? 'rgba(71,255,154,.25)' :
                                                req.status === 'rejected' ? 'rgba(255,71,71,.25)' : 'rgba(255,179,71,.25)'}`,
                        }}>
                          {req.status === 'approved' || req.status === 'completed' ? '✅ Approved' :
                           req.status === 'rejected' ? '❌ Rejected' : '⏳ Waiting for Admin'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {payError && <div className="px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,71,71,.08)', color: 'var(--gym-accent2)' }}>⚠ {payError}</div>}
            {payMsg   && <div className="px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(71,255,154,.08)', color: 'var(--gym-success)' }}>✅ {payMsg}</div>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
            {paymentMode === 'card' && (
              <button className="btn btn-primary" onClick={handleCardPayment} disabled={payLoading}>{payLoading ? 'Processing…' : '💳 Initiate Payment'}</button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
