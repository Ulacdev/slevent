import React from 'react';
import { ICONS } from '../constants';
import { GcashIcon, MayaIcon, BankIcon } from './PayoutLogos';
import { apiService } from '../services/apiService';
import { useToast } from '../context/ToastContext';

const AlertCircleIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);

const BANK_OPTIONS = [
  'BDO Unibank', 'BPI', 'Metrobank', 'Landbank', 'UnionBank',
  'Security Bank', 'PNB', 'China Bank', 'EastWest Bank', 'RCBC', 'Digital Bank (Maya/GCash/etc)'
];

export const ManagedPayoutSettings: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isManaged, setIsManaged] = React.useState(false);
  const [method, setMethod] = React.useState<'GCASH' | 'MAYA' | 'BANK' | null>(null);
  
  // Independent data for each "Wallet"
  const [gcashDetails, setGcashDetails] = React.useState({ accountName: '', accountNumber: '' });
  const [mayaDetails, setMayaDetails] = React.useState({ accountName: '', accountNumber: '' });
  const [bankDetails, setBankDetails] = React.useState({ accountName: '', accountNumber: '', bankName: '' });

  const { showToast } = useToast();

  React.useEffect(() => {
    const loadPayoutSettings = async () => {
      try {
        setLoading(true);
        const settings = await apiService.getPayoutSettings() as any;
        setIsManaged(settings.isManaged);
        setMethod(settings.method);
        
        // Load independent data if available
        if (settings.gcash) setGcashDetails(settings.gcash);
        if (settings.maya) setMayaDetails(settings.maya);
        if (settings.bank) setBankDetails(settings.bank);

        // Fallback for legacy single-field data
        if (settings.method === 'GCASH' && !settings.gcash) {
           setGcashDetails({ accountName: (settings as any).accountName || '', accountNumber: (settings as any).accountNumber || '' });
        } else if (settings.method === 'MAYA' && !settings.maya) {
           setMayaDetails({ accountName: (settings as any).accountName || '', accountNumber: (settings as any).accountNumber || '' });
        } else if (settings.method === 'BANK' && !settings.bank) {
           setBankDetails({ accountName: (settings as any).accountName || '', accountNumber: (settings as any).accountNumber || '', bankName: (settings as any).bankName || '' });
        }
      } catch (error) {
        console.error('Failed to load payout settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPayoutSettings();
  }, []);

  const handleSave = async () => {
    const currentDetails = method === 'GCASH' ? gcashDetails : method === 'MAYA' ? mayaDetails : bankDetails;

    try {
      setSaving(true);
      await apiService.updatePayoutSettings({
        isManaged,
        method,
        // Send everyone's details so we save all "Wallets"
        gcash: gcashDetails,
        maya: mayaDetails,
        bank: bankDetails,
        // Legacy support
        accountName: currentDetails.accountName,
        accountNumber: currentDetails.accountNumber,
        bankName: method === 'BANK' ? bankDetails.bankName : null
      });
      showToast('success', 'Payout settings updated successfully.');
    } catch (error: any) {
      console.error('Failed to save payout settings:', error);
      showToast('error', error.message || 'Failed to save payout settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 text-sm">Loading payout settings...</div>;
  }

  return (
    <div className="max-w-4xl pt-4">
      <div className="border border-[#2E2E2F]/10 bg-[#F2F2F2] rounded-xl mb-6 shadow-sm overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ICONS.CreditCard className="w-5 h-5 text-gray-700" />
            <div className="flex flex-col">
              <span className="font-bold text-gray-800 text-sm">StartupLab Managed Payouts</span>
              <span className="text-[10px] text-gray-500 font-medium">Earn through GCash, Maya, or Bank</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsManaged(!isManaged)}
            className={`w-11 h-6 rounded-full flex items-center px-[3px] transition-colors duration-200 ease-in-out focus:outline-none ${isManaged ? 'bg-[#2E2E2F]' : 'bg-gray-200'}`}
          >
            <div className={`w-[18px] h-[18px] bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${isManaged ? 'translate-x-[20px]' : 'translate-x-0'}`}></div>
          </button>
        </div>

        {isManaged && (
          <div className="p-5 md:p-6 space-y-8 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex items-start gap-4 bg-[#F2F2F2] border border-[#2E2E2F]/20 rounded-xl p-5">
              <AlertCircleIcon className="w-5 h-5 mt-[2px] text-black shrink-0" />
              <div className="space-y-1">
                <p className="text-sm text-black font-bold">How it works</p>
                <p className="text-xs text-black/70 font-medium leading-relaxed">
                  Attendees pay through StartupLab's gateway. We collect the funds and send them to your provided account after the event. 
                  <span className="block mt-2 font-black text-black uppercase tracking-tight text-[10px]">Managed payouts are subject to a 5% platform fee.</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-800 tracking-tight">Select Payout Method</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { 
                    id: 'GCASH', 
                    name: 'GCash', 
                    component: <GcashIcon className="w-20 h-20" /> 
                  },
                  { 
                    id: 'MAYA', 
                    name: 'Maya', 
                    component: <MayaIcon className="w-20 h-20" />
                  },
                  { 
                    id: 'BANK', 
                    name: 'Bank Transfer', 
                    component: <BankIcon className="w-20 h-20" /> 
                  }
                ].map((item: any) => {
                  const isActive = method === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMethod(item.id as any)}
                      className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-4 transition-all min-h-[160px] ${
                        isActive 
                          ? 'border-[#38BDF2] bg-[#F2F2F2] shadow-2xl scale-[1.05] z-10' 
                          : 'border-[#2E2E2F]/5 bg-[#F2F2F2] hover:border-gray-300 opacity-60'
                      }`}
                    >
                      {/* Selection Indicator Badge */}
                      {isActive && (
                        <div className="absolute top-2 right-2 bg-[#38BDF2]/20 text-[#38BDF2] text-[9px] font-black px-2.5 py-1 rounded shadow-sm border border-[#38BDF2]/30 flex items-center gap-1 animate-in zoom-in duration-300">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                          </svg>
                          ACTIVE
                        </div>
                      )}

                      <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'} flex flex-col items-center gap-4`}>
                        <div className={
                           item.id === 'BANK' 
                             ? isActive 
                               ? 'text-black' 
                               : 'text-[#2E2E2F]'
                             : ''
                         }>
                          {item.component}
                       </div>
                       <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-black' : 'text-[#2E2E2F]/40'}`}>
                         {item.name}
                       </span>
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>

            {method && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {method === 'BANK' && (
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-xs font-black text-black uppercase tracking-wider">Bank Name</label>
                    <select
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                      className="w-full text-sm font-medium border border-[#2E2E2F]/20 rounded-xl py-3 px-4 focus:outline-none focus:border-[#2E2E2F] focus:ring-1 focus:ring-[#2E2E2F] text-black transition-all bg-[#F2F2F2]"
                    >
                      <option value="">Select Bank...</option>
                      {BANK_OPTIONS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-black uppercase tracking-wider">Account Name</label>
                  <input
                    type="text"
                    value={
                      method === 'GCASH' ? gcashDetails.accountName : 
                      method === 'MAYA' ? mayaDetails.accountName : 
                      bankDetails.accountName
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (method === 'GCASH') setGcashDetails({ ...gcashDetails, accountName: val });
                      else if (method === 'MAYA') setMayaDetails({ ...mayaDetails, accountName: val });
                      else setBankDetails({ ...bankDetails, accountName: val });
                    }}
                    placeholder="Enter full name"
                    className="w-full text-sm font-medium border border-[#2E2E2F]/20 rounded-xl py-3 px-4 focus:outline-none focus:border-[#2E2E2F] focus:ring-1 focus:ring-[#2E2E2F] text-black transition-all bg-[#F2F2F2]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-black uppercase tracking-wider">
                    {method === 'BANK' ? 'Account Number' : 'Mobile Number'}
                  </label>
                  <input
                    type="text"
                    value={
                      method === 'GCASH' ? gcashDetails.accountNumber : 
                      method === 'MAYA' ? mayaDetails.accountNumber : 
                      bankDetails.accountNumber
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (method === 'GCASH') setGcashDetails({ ...gcashDetails, accountNumber: val });
                      else if (method === 'MAYA') setMayaDetails({ ...mayaDetails, accountNumber: val });
                      else setBankDetails({ ...bankDetails, accountNumber: val });
                    }}
                    placeholder={method === 'BANK' ? "0000 0000 00" : "0917 XXX XXXX"}
                    className="w-full text-sm font-mono border border-[#2E2E2F]/20 rounded-xl py-3 px-4 focus:outline-none focus:border-[#2E2E2F] focus:ring-1 focus:ring-[#2E2E2F] text-black transition-all bg-[#F2F2F2]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-5 bg-[#F2F2F2] border-t border-[#2E2E2F]/5 flex justify-end items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-[#38BDF2] hover:bg-[#2E2E2F] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Payout Info'}
          </button>
        </div>
      </div>
    </div>
  );
};
