import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AccountSettings } from './AccountSettings';
import { OrganizerSettings } from './OrganizerSettings';
import { EmailSettings } from './EmailSettings';
import { PaymentSettings } from './PaymentSettings';
import { TeamSettings } from './TeamSettings';

type SettingsTab = 'organizer' | 'payments' | 'account' | 'email' | 'team';

const tabItems: Array<{
  id: SettingsTab;
  label: string;
  description: string;
}> = [
    {
      id: 'organizer',
      label: 'Org Profile',
      description: 'Brand, socials, and event page defaults',
    },
    {
      id: 'team',
      label: 'Team & Access',
      description: 'Invite members and manage permissions',
    },
    {
      id: 'email',
      label: 'Email Settings',
      description: 'Professional SMTP server configuration',
    },
    {
      id: 'payments',
      label: 'Payment Gateway',
      description: 'HitPay credentials and payout routing',
    },
    {
      id: 'account',
      label: 'Account',
      description: 'Name, avatar, and login preferences',
    },
  ];

const normalizeTab = (value: string | null): SettingsTab => {
  if (value === 'email') return 'email';
  if (value === 'payments') return 'payments';
  if (value === 'team') return 'team';
  return value === 'account' ? 'account' : 'organizer';
};

export const UserSettings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = normalizeTab(searchParams.get('tab'));
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(tabFromUrl);
  const activeTabMeta = tabItems.find((item) => item.id === activeTab) || tabItems[0];

  React.useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  React.useEffect(() => {
    if (!searchParams.get('tab')) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', tabFromUrl);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, tabFromUrl]);

  return (
    <div className="pb-16 space-y-6 px-4 md:px-0">
      <div className="px-2 pt-6">
        <h1 className="text-2xl sm:text-4xl lg:text-[2.5rem] font-black text-[#2E2E2F] dark:text-white tracking-tight uppercase">Settings</h1>
        <p className="mt-2 text-xs sm:text-sm font-bold text-[#2E2E2F]/50 dark:text-white/50 max-w-md">
          Update your organizer identity, cover imagery, and branding preferences.
        </p>
      </div>

      {/* Premium Swipeable Tab Navigation Bar for Mobile and Desktop Viewports */}
      <div 
        className="flex gap-2 p-1.5 bg-background border border-sidebar-border rounded-2xl w-full overflow-x-auto scrollbar-none scroll-smooth"
        style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        {tabItems.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('tab', tab.id);
                setSearchParams(next);
              }}
              className={`whitespace-nowrap rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${
                isActive
                  ? 'bg-[#38BDF2] text-white shadow-md shadow-[#38BDF2]/20'
                  : 'text-[#2E2E2F] dark:text-white/40 hover:text-[#2E2E2F] dark:hover:text-white/60 bg-transparent hover:bg-[#38BDF2]/5'
              }`}
              style={{ flexShrink: 0, minWidth: 'auto', height: 'auto', padding: '10px 20px' }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        {activeTab === 'organizer' && <OrganizerSettings />}
        {activeTab === 'email' && <EmailSettings />}
        {activeTab === 'payments' && <PaymentSettings />}
        {activeTab === 'team' && <TeamSettings />}
        {activeTab === 'account' && <AccountSettings />}
      </div>
    </div>
  );
};
