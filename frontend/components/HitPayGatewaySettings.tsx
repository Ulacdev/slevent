import React from 'react';
import { ICONS } from '../constants';
import { apiService } from '../services/apiService';
import { HitPaySettings } from '../types';
import { useToast } from '../context/ToastContext';

type HitPayScope = 'admin' | 'organizer';

type HitPayGatewaySettingsProps = {
  scope: HitPayScope;
  badgeLabel: string;
  headline: string;
  description: string;
  ownerLabel: string;
  usagePoints: string[];
};

type FormState = {
  enabled: boolean;
  mode: 'sandbox' | 'live';
  hitpayApiKey: string;
  hitpaySalt: string;
};

const EMPTY_FORM: FormState = { enabled: false, mode: 'live', hitpayApiKey: '', hitpaySalt: '' };

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const maskValue = (value: string | null | undefined): string | null => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (normalized.length <= 6) return '*'.repeat(normalized.length);
  return `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
};

const AlertCircleIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);

const EyeIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);

const EyeOffIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
);

const DummyGatewayCard = ({ name }: { name: string }) => (
  <div className="flex items-center justify-between border border-sidebar-border bg-background rounded-xl p-4 mb-4">
    <div className="flex items-center gap-3">
      <ICONS.CreditCard className="w-5 h-5 text-[#2E2E2F] dark:text-white/40" />
      <span className="font-semibold text-[#2E2E2F] dark:text-white text-sm">{name}</span>
    </div>
    <div className="w-11 h-6 bg-sidebar-border rounded-full flex items-center px-1">
      <div className="w-4 h-4 bg-white dark:bg-white/20 rounded-full shadow-sm"></div>
    </div>
  </div>
);

export const HitPayGatewaySettings: React.FC<HitPayGatewaySettingsProps> = ({
  scope,
}) => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [backendReady, setBackendReady] = React.useState(true);
  const [formData, setFormData] = React.useState<FormState>(EMPTY_FORM);
  const [storedSettings, setStoredSettings] = React.useState<HitPaySettings | null>(null);

  const [showApiKey, setShowApiKey] = React.useState(false);
  const [showSalt, setShowSalt] = React.useState(false);

  const [editingApiKey, setEditingApiKey] = React.useState(false);
  const [editingSalt, setEditingSalt] = React.useState(false);
  const { showToast } = useToast();

  const hasStoredApiKey = !!storedSettings?.maskedHitpayApiKey;
  const hasStoredSalt = !!storedSettings?.maskedHitpaySalt;

  const hydrateForm = React.useCallback((settings: HitPaySettings | null) => {
    setStoredSettings(settings);
    setFormData({
      enabled: !!settings?.enabled,
      mode: (settings?.mode as 'sandbox' | 'live') || 'live',
      hitpayApiKey: settings?.hitpayApiKey || '',
      hitpaySalt: settings?.hitpaySalt || ''
    });
    setEditingApiKey(!settings?.hitpayApiKey && !settings?.maskedHitpayApiKey);
    setEditingSalt(!settings?.hitpaySalt && !settings?.maskedHitpaySalt);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await apiService.getHitPaySettings(scope);
        if (!isMounted) return;
        setBackendReady(response.backendReady);
        hydrateForm(response.settings);
      } catch (error) {
        if (!isMounted) return;
        showToast('error', extractErrorMessage(error, 'Failed to load HitPay settings.'));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadSettings();
    return () => { isMounted = false; };
  }, [hydrateForm, scope]);


  const handleInputChange = (field: keyof FormState, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (updatedData?: Partial<FormState>) => {
    const currentData = { ...formData, ...updatedData };

    try {
      setSaving(true);

      const payload: any = {
        enabled: currentData.enabled,
        mode: currentData.mode,
        hitpayApiKey: currentData.hitpayApiKey,
        hitpaySalt: currentData.hitpaySalt,
      };

      const response = await apiService.updateHitPaySettings(scope, payload);

      if (!response.backendReady) {
        setBackendReady(false);
        showToast('error', 'HitPay settings endpoint is not available.');
        return;
      }

      const nextSettings: HitPaySettings = response.settings || {
        enabled: currentData.enabled,
        mode: currentData.mode,
        maskedHitpayApiKey: maskValue(currentData.hitpayApiKey.trim()),
        maskedHitpaySalt: maskValue(currentData.hitpaySalt.trim()),
        isConfigured: currentData.enabled,
        updatedAt: new Date().toISOString(),
      };

      hydrateForm(nextSettings);
      showToast('success', 'Settings saved.');
    } catch (error) {
      showToast('error', extractErrorMessage(error, 'Failed to save settings.'));
      if (updatedData?.enabled !== undefined) {
        setFormData(prev => ({ ...prev, enabled: !updatedData.enabled }));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    setFormData(prev => ({ ...prev, enabled: checked }));
  };

  const handleModeChange = (val: 'live' | 'sandbox') => {
    setFormData(prev => ({ ...prev, mode: val }));
  };

  const renderInput = (
    label: string,
    value: string,
    maskedValue: string | null | undefined,
    field: keyof FormState,
    show: boolean,
    setShow: (val: boolean) => void,
    isEditing: boolean,
    setIsEditing: (val: boolean) => void,
    hasStored: boolean
  ) => {

    const handleEditClick = () => {
      setIsEditing(true);
      setFormData(prev => ({ ...prev, [field]: '' }));
    };

    return (
      <div className="flex-1">
        <label className="block text-sm font-semibold text-[#2E2E2F] dark:text-white mb-1.5">{label}</label>
        <div className="relative group">
          <input
            type={isEditing ? (show ? "text" : "password") : (show ? "text" : "password")}
            value={isEditing ? value : (hasStored ? (show ? value || '••••••••' : maskedValue || '') : '')}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={hasStored && !isEditing ? "••••••••••••••••" : "Enter credential..."}
            className={`w-full text-sm font-mono border border-sidebar-border rounded-xl py-2.5 pl-3 pr-10 focus:outline-none focus:border-[#38BDF2] focus:ring-1 focus:ring-[#38BDF2] text-[#2E2E2F] dark:text-white transition-colors bg-background`}
            disabled={!formData.enabled}
            readOnly={!isEditing && hasStored && !show}
          />
          {hasStored && !isEditing && (
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2E2E2F]/40 dark:text-white/20 hover:text-[#38BDF2] focus:outline-none"
              disabled={!formData.enabled}
            >
              {show ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          )}
          {isEditing && (
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2E2E2F]/40 dark:text-white/20 hover:text-[#38BDF2] focus:outline-none"
            >
               {show ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          )}
        </div>
        {hasStored && !isEditing && formData.enabled && (
          <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-[#38BDF2] cursor-pointer hover:text-[#2E2E2F] dark:hover:text-white transition-colors flex items-center gap-1.5" onClick={handleEditClick}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit / Clear Credential
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-[#2E2E2F] dark:text-white/60 text-sm">Loading gateways...</div>;
  }

  return (
    <div className="max-w-4xl pt-4">

      {/* Disabled / Dummy Gateways to match the screenshot layout */}

      {/* HitPay Gateway */}
      <div className="border border-sidebar-border bg-surface rounded-xl mb-6 shadow-sm overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <ICONS.CreditCard className="w-5 h-5 text-[#2E2E2F] dark:text-white/60" />
            <span className="font-semibold text-[#2E2E2F] dark:text-white text-sm">HitPay</span>
          </div>

          <button
            type="button"
            onClick={() => handleToggle(!formData.enabled)}
            className={`w-11 h-6 rounded-full flex items-center px-[3px] transition-colors duration-200 ease-in-out focus:outline-none ${formData.enabled ? 'bg-[#38BDF2]' : 'bg-sidebar-border'}`}
          >
            <div className={`w-[18px] h-[18px] bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${formData.enabled ? 'translate-x-[20px]' : 'translate-x-0'}`}></div>
          </button>
        </div>

        {formData.enabled && (
          <div className="p-5 md:p-6 space-y-6 animate-in slide-in-from-top-2 fade-in duration-200">

            <div className="flex items-start gap-3 bg-background border border-sidebar-border rounded-xl p-4">
              <AlertCircleIcon className="w-4 h-4 mt-[3px] text-[#2E2E2F]/60 dark:text-white/40 shrink-0" />
              <p className="text-sm text-[#2E2E2F] dark:text-white/60">
                Get your HitPay API credentials from your{' '}
                <a href="https://dashboard.hit-pay.com" target="_blank" rel="noopener noreferrer" className="text-[#38BDF2] underline hover:text-[#2E2E2F] dark:hover:text-white font-medium">Dashboard</a>
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#2E2E2F] dark:text-white">Mode</label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-[#2E2E2F] dark:text-white/70 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="hitpay-mode"
                      className="peer sr-only"
                      checked={formData.mode === 'sandbox'}
                      onChange={() => handleModeChange('sandbox')}
                    />
                    <div className="w-4 h-4 rounded-full border border-sidebar-border peer-checked:border-[#38BDF2] flex items-center justify-center transition-colors">
                      {formData.mode === 'sandbox' && <div className="w-2 h-2 rounded-full bg-[#38BDF2]"></div>}
                    </div>
                  </div>
                  Sandbox
                </label>

                <label className="flex items-center gap-2 text-sm text-[#2E2E2F] dark:text-white/70 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="hitpay-mode"
                      className="peer sr-only"
                      checked={formData.mode === 'live'}
                      onChange={() => handleModeChange('live')}
                    />
                    <div className="w-4 h-4 rounded-full border border-sidebar-border peer-checked:border-[#38BDF2] flex items-center justify-center transition-colors">
                      {formData.mode === 'live' && <div className="w-2 h-2 rounded-full bg-[#38BDF2]"></div>}
                    </div>
                  </div>
                  Live
                </label>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {renderInput(
                "API Key",
                formData.hitpayApiKey,
                storedSettings?.maskedHitpayApiKey,
                'hitpayApiKey',
                showApiKey,
                setShowApiKey,
                editingApiKey,
                setEditingApiKey,
                hasStoredApiKey
              )}
              {renderInput(
                "Salt (Webhook Secret)",
                formData.hitpaySalt,
                storedSettings?.maskedHitpaySalt,
                'hitpaySalt',
                showSalt,
                setShowSalt,
                editingSalt,
                setEditingSalt,
                hasStoredSalt
              )}
            </div>
          </div>
        )}

        {/* Global Save Button for HitPay Gateway */}
        <div className="px-6 py-5 bg-background border-t border-sidebar-border flex justify-end">
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-8 py-3 bg-[#38BDF2] hover:bg-[#2E2E2F] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save HitPay Settings'}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-surface border border-sidebar-border rounded-xl p-4">
        <AlertCircleIcon className="w-4 h-4 mt-[3px] text-[#2E2E2F]/60 dark:text-white/40 shrink-0" />
        <p className="text-sm text-[#2E2E2F] dark:text-white/60 leading-relaxed font-medium">
          These payment settings will be used for all {scope === 'admin' ? 'subscription plan payments' : 'event ticket payments'}. Make sure to test your configuration before going live.
        </p>
      </div>

    </div>
  );
};

