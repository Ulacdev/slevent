import React from 'react';
import { ICONS } from '../constants';
import { BankIcon } from './PayoutLogos';
import { apiService } from '../services/apiService';
import { useToast } from '../context/ToastContext';

const AlertCircleIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);

const BANK_OPTIONS = [
  'BDO Unibank', 'BPI', 'Metrobank', 'Landbank', 'UnionBank',
  'Security Bank', 'PNB', 'China Bank', 'EastWest Bank', 'RCBC', 'Other Bank'
];

export const ManagedPayoutSettings: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isManaged, setIsManaged] = React.useState(false);
  const [payoutDetails, setPayoutDetails] = React.useState({ accountName: '', accountNumber: '', bankName: '' });

  const { showToast } = useToast();

  React.useEffect(() => {
    const loadPayoutSettings = async () => {
      try {
        setLoading(true);
        const settings = await apiService.getPayoutSettings() as any;
        setIsManaged(settings.isManaged);
        if (settings.gcash) setPayoutDetails(settings.gcash);
        else if (settings.maya) setPayoutDetails(settings.maya);
        else if (settings.bank) setPayoutDetails(settings.bank);
        else {
           setPayoutDetails({ accountName: (settings as any).accountName || '', accountNumber: (settings as any).accountNumber || '', bankName: (settings as any).bankName || '' });
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
    try {
      setSaving(true);
      await apiService.updatePayoutSettings({
        isManaged,
        accountName: payoutDetails.accountName,
        accountNumber: payoutDetails.accountNumber,
        bankName: payoutDetails.bankName
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
              <span className="text-[10px] text-gray-500 font-medium">Configure where you want to receive your funds</span>
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
                </p>
              </div>
            </div>

            <div className="space-y-4">
               <label className="block text-sm font-semibold text-gray-800 tracking-tight text-center">Payout Account Details</label>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-black text-black uppercase tracking-wider">Bank or E-Wallet Name</label>
                  <input
                    type="text"
                    value={payoutDetails.bankName}
                    onChange={(e) => setPayoutDetails({ ...payoutDetails, bankName: e.target.value })}
                    placeholder="e.g. BDO, UnionBank, Digital Bank"
                    className="w-full text-sm font-medium border border-[#2E2E2F]/20 rounded-xl py-3 px-4 focus:outline-none focus:border-[#2E2E2F] focus:ring-1 focus:ring-[#2E2E2F] text-black transition-all bg-[#F2F2F2]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-black uppercase tracking-wider">Account Name</label>
                  <input
                    type="text"
                    value={payoutDetails.accountName}
                    onChange={(e) => setPayoutDetails({ ...payoutDetails, accountName: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full text-sm font-medium border border-[#2E2E2F]/20 rounded-xl py-3 px-4 focus:outline-none focus:border-[#2E2E2F] focus:ring-1 focus:ring-[#2E2E2F] text-black transition-all bg-[#F2F2F2]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-black uppercase tracking-wider">Account / Mobile Number</label>
                  <input
                    type="text"
                    value={payoutDetails.accountNumber}
                    onChange={(e) => setPayoutDetails({ ...payoutDetails, accountNumber: e.target.value })}
                    placeholder="Enter account number"
                    className="w-full text-sm font-mono border border-[#2E2E2F]/20 rounded-xl py-3 px-4 focus:outline-none focus:border-[#2E2E2F] focus:ring-1 focus:ring-[#2E2E2F] text-black transition-all bg-[#F2F2F2]"
                  />
                </div>
              </div>
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
