// ============================================================
//  Notifications.jsx — Admin notification triggers
//  APIs: /Notification/RunExpiryCheck, /Notification/RunIncompleteSchedule
// ============================================================
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import * as api from '../services/api';

function ResultCard({ title, data }) {
  if (!data) return null;
  const list = Array.isArray(data) ? data : data?.ResultSet || [];
  return (
    <div className="gym-card mt-4">
      <div className="gym-card-title">{title}</div>
      {list.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--gym-muted)' }}>No items found.</p>
      ) : (
        <div className="space-y-2">
          {list.map((item, i) => (
            <div key={i} className="p-3 rounded-xl text-sm" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
              <pre className="text-xs overflow-auto whitespace-pre-wrap" style={{ color: 'var(--gym-text2)', fontFamily: "'Space Mono', monospace" }}>
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Notifications() {
  const adminId = useSelector((s) => s.ui.currentUserId);
  const [expiryLoading,    setExpiryLoading]    = useState(false);
  const [scheduleLoading,  setScheduleLoading]  = useState(false);
  const [expiryResult,     setExpiryResult]     = useState(null);
  const [scheduleResult,   setScheduleResult]   = useState(null);
  const [expiryMsg,        setExpiryMsg]        = useState('');
  const [scheduleMsg,      setScheduleMsg]      = useState('');

  const runExpiry = async () => {
    setExpiryLoading(true); setExpiryMsg(''); setExpiryResult(null);
    try {
      const res  = await api.runExpiryCheck(adminId);
      const data = res?.data;
      setExpiryMsg(data?.Result || data?.Message || 'Expiry check completed. WhatsApp notifications sent.');
      setExpiryResult(data);
    } catch { setExpiryMsg('Failed to run expiry check.'); }
    setExpiryLoading(false);
  };

  const runIncomplete = async () => {
    setScheduleLoading(true); setScheduleMsg(''); setScheduleResult(null);
    try {
      const res  = await api.runIncompleteSchedule(adminId);
      const data = res?.data;
      setScheduleMsg(data?.Result || data?.Message || 'Incomplete schedule check completed. WhatsApp notifications sent.');
      setScheduleResult(data);
    } catch { setScheduleMsg('Failed to run incomplete schedule check.'); }
    setScheduleLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-sub">Send WhatsApp reminders & alerts to members</div>
        </div>
      </div>

      {/* Info banner */}
      <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(71,200,255,.06)', border: '1px solid rgba(71,200,255,.18)' }}>
        <span className="text-xl mt-0.5">💬</span>
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--gym-accent3)' }}>WhatsApp Notification System</div>
          <div className="text-xs mt-1" style={{ color: 'var(--gym-muted)' }}>
            These triggers will send automatic WhatsApp messages to members. Make sure the WhatsApp API credentials are configured in the backend before running these.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Expiry Check */}
        <div className="gym-card space-y-4">
          <div>
            <div className="gym-card-title">Subscription Expiry Check</div>
            <p className="text-sm" style={{ color: 'var(--gym-muted)' }}>
              Checks all subscriptions expiring soon and sends WhatsApp reminders to the affected members.
            </p>
          </div>
          <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
            <code style={{ color: 'var(--gym-accent3)', fontFamily: "'Space Mono', monospace" }}>
              GET /Notification/RunExpiryCheck?adminId={'{adminId}'}
            </code>
          </div>
          <button className="btn btn-primary w-full justify-center" onClick={runExpiry} disabled={expiryLoading}>
            {expiryLoading
              ? <><svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>Running…</>
              : <>📩 Run Expiry Check &amp; Notify</>}
          </button>
          {expiryMsg && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(71,255,154,.06)', border: '1px solid rgba(71,255,154,.2)', color: 'var(--gym-success)' }}>
              ✓ {expiryMsg}
            </div>
          )}
          {expiryResult && <ResultCard title="Expiry Check Results" data={expiryResult} />}
        </div>

        {/* Incomplete Schedule Check */}
        <div className="gym-card space-y-4">
          <div>
            <div className="gym-card-title">Incomplete Schedule Check</div>
            <p className="text-sm" style={{ color: 'var(--gym-muted)' }}>
              Finds members with incomplete workout schedules and sends WhatsApp reminders to motivate them.
            </p>
          </div>
          <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
            <code style={{ color: 'var(--gym-accent3)', fontFamily: "'Space Mono', monospace" }}>
              GET /Notification/RunIncompleteSchedule?adminId={'{adminId}'}
            </code>
          </div>
          <button className="btn btn-primary w-full justify-center" onClick={runIncomplete} disabled={scheduleLoading}>
            {scheduleLoading
              ? <><svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>Running…</>
              : <>📅 Run Schedule Check &amp; Notify</>}
          </button>
          {scheduleMsg && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(71,255,154,.06)', border: '1px solid rgba(71,255,154,.2)', color: 'var(--gym-success)' }}>
              ✓ {scheduleMsg}
            </div>
          )}
          {scheduleResult && <ResultCard title="Schedule Check Results" data={scheduleResult} />}
        </div>
      </div>
    </div>
  );
}
