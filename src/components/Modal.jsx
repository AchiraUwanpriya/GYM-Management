import React, { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 560 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-colors duration-150"
            style={{ color: 'var(--gym-muted)', background: 'var(--gym-surface2)' }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
