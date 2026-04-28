
import React from 'react';

export const Badge: React.FC<{
  children: React.ReactNode,
  type?: 'success' | 'danger' | 'warning' | 'info' | 'neutral',
  className?: string,
  onClick?: () => void,
  title?: string
}> = ({ children, type = 'neutral', className = '', onClick, title }) => {
  const styles = {
    success: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    info: 'bg-[#38BDF2]/20 text-[#38BDF2] dark:bg-[#38BDF2]/10',
    neutral: 'bg-[#2E2E2F]/10 text-[#2E2E2F] dark:bg-white/10 dark:text-white',
  };
  return (
    <span
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1 rounded-full text-[13px] sm:text-[13px] font-bold uppercase tracking-wide ${styles[type]} inline-block ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {children}
    </span>
  );
};

export const Card: React.FC<{
  children: React.ReactNode,
  className?: string,
  style?: React.CSSProperties,
  onClick?: () => void,
  overflowHidden?: boolean,
  [key: string]: any;
}> = ({ children, className = '', style, onClick, overflowHidden = false, ...props }) => (
  <div
    onClick={onClick}
    style={style}
    className={`bg-surface border border-sidebar-border rounded-xl ${overflowHidden ? 'overflow-hidden' : ''} ${className} shadow-sm hover:shadow-md transition-shadow`}
    {...props}
  >
    {children}
  </div>
);

export const Button: React.FC<{
  children: React.ReactNode,
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger',
  size?: 'sm' | 'md' | 'lg',
  className?: string,
  disabled?: boolean,
  loading?: boolean,
  type?: 'button' | 'submit',
  style?: React.CSSProperties,
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>
}> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  style,
  onClick
}) => {
    const base = 'inline-flex items-center justify-center font-bold tracking-wide rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] sm:min-h-[44px] active:scale-95 px-4';

    const variants = {
      primary: 'bg-[#38BDF2] text-white hover:bg-[#2E2E2F] dark:hover:bg-white/90 dark:hover:text-[#2E2E2F] transition-all focus:ring-[#38BDF2]',
      secondary: 'bg-[#38BDF2] text-white hover:bg-[#2E2E2F] dark:hover:bg-white/90 dark:hover:text-[#2E2E2F] transition-all focus:ring-[#38BDF2]',
      outline: 'bg-transparent border-2 border-[#38BDF2] text-[#38BDF2] hover:bg-[#38BDF2]/10 active:bg-[#38BDF2]/20 focus:ring-[#38BDF2]',
      ghost: 'bg-transparent text-[#38BDF2] hover:bg-[#38BDF2]/10 active:bg-[#38BDF2]/20 focus:ring-[#38BDF2]',
      danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus:ring-red-500'
    };

    const sizes = {
      sm: 'px-3 py-2 text-[13px] sm:text-[13px] min-h-[40px] sm:min-h-[36px]',
      md: 'px-4 sm:px-4 py-3 sm:py-2.5 text-[13px] sm:text-[14px] min-h-[48px] sm:min-h-[44px]',
      lg: 'px-6 py-3 text-[14px] sm:text-[15px] min-h-[52px] sm:min-h-[48px]',
    };

    return (
      <button
        type={type}
        disabled={disabled || loading}
        onClick={onClick}
        style={style}
        className={`${base} ${variants[variant]} ${sizes[size]} relative overflow-hidden ${className} ${loading ? 'cursor-wait' : ''}`}
      >
        {loading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] z-0" />
        )}
        <span className={`transition-opacity duration-200 ${loading ? 'opacity-40' : 'opacity-100'}`}>
          {children}
        </span>
      </button>
    );
  };

export const Input: React.FC<{
  label?: React.ReactNode;
  error?: string;
  [key: string]: any;
}> = ({ label, error, className = '', ...props }) => {
  const inputProps = { ...props };
  if (Object.prototype.hasOwnProperty.call(inputProps, 'value') && inputProps.value === null) {
    inputProps.value = '';
  }

  return (
    <div className="space-y-2 w-full">
      {label && <label className="block text-[10px] font-bold text-[#2E2E2F] dark:text-white/60 mb-1 uppercase tracking-wider">{label}</label>}
      <input
        className={`block w-full px-4 py-3 bg-background border text-base sm:text-sm min-h-[48px] sm:min-h-[44px] ${error ? 'border-red-500' : 'border-sidebar-border'} rounded-xl focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-300/40' : 'focus:ring-[#38BDF2]/40'} transition-colors font-normal text-[#2E2E2F] dark:text-white ${className}`}
        {...inputProps}
      />
      {error && <p className="text-[13px] text-red-500 font-medium mt-1">{error}</p>}
    </div>
  );
};

export const PasswordInput: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  icon?: React.ReactNode;
  hideEye?: boolean;
}> = ({ value, onChange, placeholder, required, className = '', inputClassName = '', icon, hideEye }) => {
  const [showPassword, setShowPassword] = React.useState(false);

  // Use a local copy of ICONS since it's not exported from Shared.tsx
  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  );
  const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
  );

  return (
    <div className={`relative group/input ${className}`}>
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2E2E2F]/20 dark:text-white/20 group-focus-within/input:text-[#38BDF2] transition-colors z-10 w-5 h-5 flex items-center justify-center">
          {icon}
        </div>
      )}
      <input
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder || 'Password'}
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full min-h-[48px] sm:min-h-[44px] text-[14px] ${icon ? 'pl-12' : 'pl-4'} ${hideEye ? 'pr-4' : 'pr-12'} py-3 sm:py-2 bg-background border border-sidebar-border rounded-xl text-[#2E2E2F] dark:text-white placeholder-[#2E2E2F]/40 dark:placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/40 focus:border-[#38BDF2] transition-colors font-normal ${inputClassName}`}
      />
      {!hideEye && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#2E2E2F]/40 dark:text-white/40 hover:text-[#38BDF2] transition-colors z-10 active:scale-95"
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      )}
    </div>
  );
};

export const PasswordRequirements: React.FC<{ password: string }> = ({ password }) => {
  const requirements = [
    { label: '8+ characters', test: password.length >= 8 },
    { label: 'Uppercase & Lowercase', test: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'Includes numbers', test: /[0-9]/.test(password) },
    { label: 'Special character', test: /[!@#$%^&*]/.test(password) },
  ];

  const hasPassword = password.length > 0;

  return (
    <div className={`mt-1 space-y-1 p-2 bg-background rounded-[4px] border border-sidebar-border transition-all duration-300 ${hasPassword ? 'opacity-100 translate-y-0 max-h-[300px]' : 'opacity-0 -translate-y-2 pointer-events-none max-h-0 !mt-0 !p-0 border-0 overflow-hidden'}`}>
      <p className="text-[9px] font-black uppercase tracking-widest text-[#2E2E2F] dark:text-white/30 mb-1">Passcode Security</p>
      <div className="grid grid-cols-1 gap-y-0.5">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-1 h-1 rounded-full transition-all duration-300 ${req.test ? 'bg-[#38BDF2] scale-110' : 'bg-sidebar-border'}`} />
            <span className={`text-[9px] font-bold tracking-tight transition-colors duration-300 ${req.test ? 'text-[#38BDF2]' : 'text-[#2E2E2F] dark:text-white/30'}`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
  contentClassName?: string;
  variant?: 'dialog' | 'page';
  zoom?: boolean;
  zIndex?: number;
  hideHeader?: boolean;
}> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  footer,
  showClose = true,
  closeOnBackdrop = true,
  className = '',
  contentClassName = '',
  variant = 'dialog',
  zoom = false,
  zIndex = 1000,
  hideHeader = false
}) => {
    if (!isOpen) return null;

    if (variant === 'page') {
      return (
        <div className={className}>
          <div className={contentClassName}>
            {children}
          </div>
          {footer && (
            <div className="border-t border-sidebar-border bg-background">
              {footer}
            </div>
          )}
        </div>
      );
    }

    const sizes = {
      sm: 'max-w-xs sm:max-w-md',
      md: 'max-w-sm sm:max-w-xl',
      lg: 'max-w-md sm:max-w-3xl',
      xl: 'max-w-lg sm:max-w-5xl'
    };

    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-3 sm:p-4"
        style={{ zIndex: zIndex }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-[#2E2E2F]/60 backdrop-blur-sm transition-opacity"
          style={{ zIndex: zIndex - 10 }}
          onClick={closeOnBackdrop ? onClose : undefined}
        />

        {/* Content */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`relative w-full overflow-hidden bg-surface border-2 border-sidebar-border rounded-2xl shadow-2xl animate-in ${zoom ? '' : 'zoom-in-95'} duration-300 flex flex-col ${sizes[size]} max-h-[90vh] sm:max-h-[85vh] origin-center ${className}`}
          style={{
            zIndex: zIndex,
            transform: zoom ? 'scale(0.8)' : undefined
          }}
        >
          {!hideHeader && (title || showClose) && (
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-sidebar-border flex items-start justify-between gap-3 sticky top-0 bg-surface z-10">
              <div className="min-w-0">
                {title && (
                  <h2 id="modal-title" className="text-base sm:text-xl font-black text-[#2E2E2F] dark:text-white break-words tracking-tight">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="mt-1 text-[13px] sm:text-[13px] uppercase tracking-[0.15em] font-bold text-[#2E2E2F] dark:text-white/60">
                    {subtitle}
                  </p>
                )}
              </div>
              {showClose && (
                <button
                  onClick={onClose}
                  className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-[#38BDF2]/10 text-[#38BDF2] hover:bg-[#38BDF2] hover:text-[#F2F2F2] transition-all shrink-0 active:scale-95"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          )}
          <div className={`p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-120px)] sm:max-h-[calc(85vh-100px)] ${contentClassName}`}>
            {children}
          </div>
          {footer && (
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-sidebar-border bg-background">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  };

export const PageLoader: React.FC<{
  label?: string;
  variant?: 'page' | 'section' | 'viewport';
  className?: string;
}> = ({
  label,
  variant = 'section',
  className = ''
}) => {
    const SkeletonContent = () => (
      <div className={`flex flex-col gap-10 w-full px-4 sm:px-8 py-10 animate-in fade-in duration-700 ${className}`}>
        {/* Header Skeleton (Top Nav) */}
        <div className="w-full flex items-center justify-between mb-2">
          <div className="w-32 h-10 bg-sidebar-border/30 rounded-xl" />
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-[#E0E0E0]/20 rounded-full" />
            <div className="w-10 h-10 bg-[#E0E0E0]/20 rounded-full" />
          </div>
        </div>

        {/* Skeleton Hero Layout */}
        <div className="w-full h-64 sm:h-80 bg-[#E0E0E0]/30 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-x-8 bottom-12 space-y-4">
            <div className="h-10 w-2/3 bg-[#E0E0E0]/50 rounded-lg" />
            <div className="h-6 w-1/2 bg-[#E0E0E0]/50 rounded-lg" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        </div>

        {/* Skeleton Content Grid (3 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="aspect-video bg-[#E0E0E0]/30 rounded-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              </div>
              <div className="h-6 w-2/3 bg-[#E0E0E0]/30 rounded-lg" />
              <div className="h-4 w-full bg-[#E0E0E0]/20 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Sub-grid of smaller items */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-[#E0E0E0]/15 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );

    if (variant === 'viewport') {
      return (
        <div className="fixed inset-0 z-[10000] bg-background flex flex-col overflow-hidden">
          <div className="w-full h-1 bg-[#38BDF2]/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#38BDF2] w-1/2 animate-[suspense-loading_2s_infinite]" />
          </div>
          {label && (
            <div className="mt-8 px-8 py-2 text-center">
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-[#2E2E2F] dark:text-white animate-pulse">{label}</p>
            </div>
          )}
          <SkeletonContent />
        </div>
      );
    }

    return (
      <div className="relative">
        <SkeletonContent />
        {label && (
          <div className="absolute inset-x-0 top-1/3 z-10 flex items-center justify-center pointer-events-none">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F] dark:text-white animate-pulse bg-background/90 px-6 py-3 rounded-2xl border border-sidebar-border shadow-xl backdrop-blur-md">{label}</p>
          </div>
        )}
      </div>
    );
  };

export const Checkbox: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}> = ({ checked, onChange, label, className = '', size = 'md', rounded = 'md' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const rounding = {
    sm: 'rounded-sm',
    md: 'rounded-[4px]',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <label className={`flex items-start gap-3 cursor-pointer group select-none ${className}`}>
      <div
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        className={`${sizes[size]} ${rounding[rounded]} border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#38BDF2] border-[#38BDF2]' : 'border-sidebar-border bg-background group-hover:border-[#38BDF2]/50'}`}
      >
        {checked && (
          <svg xmlns="http://www.w3.org/2000/svg" className={`${iconSizes[size]} text-white`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      {label && <span className="text-[13px] font-medium text-[#2E2E2F] dark:text-white leading-tight group-hover:text-[#2E2E2F] dark:group-hover:text-[#38BDF2] transition-colors mt-0.5">{label}</span>}
    </label>
  );
};

export const Branding: React.FC<{ className?: string, light?: boolean }> = ({ className = '', light = false }) => (
  <img
    src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
    alt="StartupLab Business Ticketing Logo"
    className={`h-20 lg:h-32 w-auto drop-shadow-xl transform transition-all duration-300 hover:scale-[1.03] cursor-pointer ${className}`}
    style={{ filter: light ? 'invert(1) grayscale(1) brightness(2)' : undefined }}
  />
);

export const PortalHeader: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, icon, actions, className = '' }) => {
  return (
    <div className={`bg-surface border-2 border-sidebar-border rounded-xl p-8 md:p-12 mb-8 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="max-w-2xl">
          <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center mb-6">
            <div className="w-6 h-6 text-[#2E2E2F] dark:text-white">
              {icon}
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#2E2E2F] dark:text-white tracking-tighter leading-tight mb-4 uppercase">
            {title}
          </h1>
          <p className="text-[#2E2E2F] dark:text-white/80 text-base md:text-lg font-bold leading-relaxed max-w-xl italic">
            {subtitle}
          </p>
        </div>
        {actions && (
          <div className="flex gap-4 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
