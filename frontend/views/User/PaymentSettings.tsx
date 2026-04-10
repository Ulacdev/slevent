import React from 'react';
import { HitPayGatewaySettings } from '../../components/HitPayGatewaySettings';
import { ManagedPayoutSettings } from '../../components/ManagedPayoutSettings';

export const PaymentSettings: React.FC = () => {
  return (
    <div className="space-y-12">
      {/* Option 1: Managed Payouts (Easiest) */}
      <section>
        <div className="mb-4">
          <span className="px-3 py-1 rounded-full bg-[#2E2E2F]/40 text-black text-[10px] font-bold uppercase tracking-widest shadow-sm">Casual Organizers</span>
          <h2 className="text-sm font-bold text-black mt-2 uppercase tracking-tight">1. StartupLab Managed Payouts</h2>
        </div>
        <ManagedPayoutSettings />
      </section>

      {/* Divider */}
      <div className="max-w-4xl border-t border-[#2E2E2F]/10"></div>

      {/* Option 2: Direct Gateway (Professional) */}
      <section>
        <div className="mb-4">
          <span className="px-3 py-1 rounded-full bg-[#2E2E2F]/40 text-black text-[10px] font-bold uppercase tracking-widest shadow-sm">Professional Businesses</span>
          <h2 className="text-sm font-bold text-black mt-2 uppercase tracking-tight">2. Direct HitPay Gateway</h2>
        </div>
        <HitPayGatewaySettings
          scope="organizer"
          badgeLabel="Organizer Payouts"
          headline="Direct HitPay Configuration"
          description="Connect your own HitPay account to receive ticket revenue directly. This bypasses StartupLab's collection system."
          ownerLabel="Organizer Account"
          usagePoints={[
            'Daily or weekly payouts depending on your HitPay plan.',
            'Direct control over your own payment webhooks and security.',
            'No additional platform-level payout fees (Merchant fees only).',
          ]}
        />
      </section>
    </div>
  );
};
