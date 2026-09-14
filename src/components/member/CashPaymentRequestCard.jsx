import React, { useMemo, useState } from 'react';
import Badge from '../Badge';
import { downloadReceiptHtml } from '../../utils/workflowStore';

const getVariant = (status) => {
  if (status === 'completed') return 'active';
  if (status === 'rejected') return 'inactive';
  return 'pending';
};

export default function CashPaymentRequestCard({ requests = [], onConfirmOtp }) {
  const [otpValues, setOtpValues] = useState({});
  const activeRequests = useMemo(
    () => requests.filter((request) => ['pending', 'otp_generated', 'completed', 'rejected'].includes(request.status)),
    [requests]
  );

  if (activeRequests.length === 0) {
    return (
      <div className="gym-card">
        <div className="gym-card-title">Cash Payment Requests</div>
        <div className="text-sm" style={{ color: 'var(--gym-muted)' }}>
          No cash payment requests yet. Use the payment dialog to request a counter payment.
        </div>
      </div>
    );
  }

  return (
    <div className="gym-card">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="gym-card-title mb-0">Cash Payment Requests</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>
            Track admin confirmation, OTP validation, and receipt delivery for counter payments.
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(255,179,71,.12)', color: 'var(--gym-warning)' }}>
          {activeRequests.length} request{activeRequests.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-3">
        {activeRequests.map((request) => (
          <div key={request.id} className="p-4 rounded-2xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>
                  {request.planLabel || `Subscription #${request.subscriptionId}`}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>
                  Request #{request.id} · {request.createdAt?.substring(0, 10) || 'Today'}
                </div>
              </div>
              <Badge variant={getVariant(request.status)}>{request.status.replace('_', ' ')}</Badge>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              {[
                ['Amount', `LKR ${parseFloat(request.amount || 0).toFixed(2)}`],
                ['Admin OTP', request.otpGeneratedAt ? 'Generated' : 'Waiting'],
                ['Member OTP', request.memberConfirmedAt ? 'Verified' : request.status === 'otp_generated' ? 'Enter code' : 'Waiting'],
              ].map(([label, value]) => (
                <div key={label} className="p-3 rounded-xl text-xs" style={{ background: 'var(--gym-surface)' }}>
                  <div style={{ color: 'var(--gym-muted)' }}>{label}</div>
                  <div className="font-medium mt-1" style={{ color: 'var(--gym-text)' }}>{value}</div>
                </div>
              ))}
            </div>

            {request.status === 'otp_generated' && !request.memberConfirmedAt && (
              <div className="mt-4 flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-[180px]">
                  <label className="gym-label">Enter OTP From Admin</label>
                  <input
                    className="gym-input font-mono tracking-[0.25em]"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otpValues[request.id] || ''}
                    onChange={(e) => setOtpValues((current) => ({
                      ...current,
                      [request.id]: e.target.value.replace(/\D/g, '').slice(0, 6),
                    }))}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  disabled={(otpValues[request.id] || '').length !== 6}
                  onClick={() => onConfirmOtp(request, otpValues[request.id] || '')}
                >
                  Confirm OTP
                </button>
              </div>
            )}

            {request.status === 'completed' && request.receipt && (
              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>
                  Receipt ready. {request.receipt.emailMessage || 'The system marked the receipt for email delivery.'}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => downloadReceiptHtml(request.receipt)}>
                  Download Receipt
                </button>
              </div>
            )}

            {request.status === 'rejected' && request.rejectionReason && (
              <div className="mt-4 text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(255,71,71,.08)', color: 'var(--gym-accent2)' }}>
                {request.rejectionReason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

