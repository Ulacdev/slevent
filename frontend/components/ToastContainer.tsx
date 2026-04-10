import React from 'react';
import { useToast } from '../context/ToastContext';
import { ICONS } from '../constants';

// Animation keyframes as inline styles
const toastStyles = `
  @keyframes toastEnter {
    0% { transform: translateX(100%) scale(0.9); opacity: 0; }
    100% { transform: translateX(0) scale(1); opacity: 1; }
  }
  @keyframes toastExit {
    0% { transform: translateX(0) scale(1); opacity: 1; }
    100% { transform: translateX(100%) scale(0.9); opacity: 0; }
  }
  .toast-blur {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
`;

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <>
      <style>{toastStyles}</style>
      <div
        id="toast-container"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          pointerEvents: 'none',
          zIndex: 9999999,
          gap: '12px',
        }}
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          return (
            <div
              key={toast.id}
              role="alert"
              className="toast-blur"
              style={{
                pointerEvents: 'auto',
                width: '380px',
                maxWidth: '92vw',
                backgroundColor: 'rgba(254, 242, 242, 0.95)',
                border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.4)' : isSuccess ? 'rgba(34, 197, 94, 0.4)' : 'rgba(56, 189, 242, 0.4)'}`,
                borderLeft: `4px solid ${isError ? '#EF4444' : isSuccess ? '#22C55E' : '#38BDF2'}`,
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                animation: 'toastEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                position: 'relative',
                transition: 'all 0.4s ease',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  color: isError ? '#EF4444' : isSuccess ? '#10B981' : '#3B82F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isError ? (
                  <ICONS.AlertCircle style={{ width: 24, height: 24 }} strokeWidth={2.5} />
                ) : isSuccess ? (
                  <ICONS.CheckCircle style={{ width: 24, height: 24 }} strokeWidth={2.5} />
                ) : (
                  <ICONS.Info style={{ width: 24, height: 24 }} strokeWidth={2.5} />
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  color: isError ? '#991B1B' : isSuccess ? '#166534' : '#075985',
                  fontSize: '13px',
                  fontWeight: 700,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  letterSpacing: '0.01em',
                }}
              >
                {toast.message}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Close"
                style={{
                  flexShrink: 0,
                  color: '#9CA3AF',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s, color 0.2s',
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                  e.currentTarget.style.color = '#4B5563';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#9CA3AF';
                }}
              >
                <ICONS.X style={{ width: 20, height: 20 }} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};

