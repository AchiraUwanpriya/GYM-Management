import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideToast } from '../actions/uiAction';

const ICONS = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

function ToastItem({ toast }) {
  const dispatch = useDispatch();
  useEffect(() => {
    const t = setTimeout(() => dispatch(hideToast(toast.id)), 4000);
    return () => clearTimeout(t);
  }, [toast.id, dispatch]);

  return (
    <div className={`toast toast-${toast.type}`}>
      <span className="flex-shrink-0">{ICONS[toast.type] || ICONS.info}</span>
      <span className="flex-1 text-sm">{toast.message}</span>
      <button
        onClick={() => dispatch(hideToast(toast.id))}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useSelector((s) => s.ui.toasts);
  return (
    <div className="toast-container">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
