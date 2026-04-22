import React from 'react';
import { HitPayGatewaySettings } from '../../components/HitPayGatewaySettings';

export const PaymentSettings: React.FC = () => {
  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-[#0F0F10] border border-[#2E2E2F]/10 dark:border-white/10 rounded-xl p-6">
        <HitPayGatewaySettings
          scope="organizer"
          badgeLabel="Universal Payout System"
          headline="Direct Revenue Configuration"
          description="Link your professional HitPay credentials below. This allows StartupLab to route your ticket revenue directly to your verified bank account in real-time."
          ownerLabel="Organizer Wallet"
          usagePoints={[
            'Daily automated settlements via HitPay.',
            'Direct access to HitPay analytics dashboard.',
            'No manual platform-level payout requests.',
          ]}
        />
      </section>
    </div>
  );
};
