import React from 'react';
import { useToast } from '../context/ToastContext';
import { ICONS } from '../constants';

// Animation keyframes as inline styles
const toastStyles = `
  @keyframes slideIn {
    0% { transform: translateX(120%); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }
  @keyframes bounceIn {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); opacity: 1; }
  }
`;

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  console.log('📺 ToastContainer rendering. Count:', toasts.length, toasts);

  if (!toasts.length) return null;

  return (
    <>
      <style>{toastStyles}</style>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 999999,
            width: '360px',
            maxWidth: 'calc(100% - 32px)',
            animation: 'slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            backgroundColor: toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : '#3b82f6',
            borderColor: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#2563eb',
            color: '#FFFFFF',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              backgroundColor: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#2563eb',
              color: 'white',
              animation: 'bounceIn 0.6s cubic-bezier(0.68, -0.6, 0.32, 1.6) forwards',
              animationDelay: '0.15s',
            }}
          >
            {toast.type === 'success' ? <ICONS.CheckCircle style={{ width: 24, height: 24 }} /> : toast.type === 'error' ? <ICONS.XCircle style={{ width: 24, height: 24 }} /> : <ICONS.Info style={{ width: 24, height: 24 }} />}
          </div>
          <div style={{ flex: 1, fontSize: '14px', fontWeight: 600, lineHeight: 1.4 }}>{toast.message}</div>
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              fontWeight: 'bold',
              opacity: 0.6,
              color: 'inherit',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </>
  );
};
