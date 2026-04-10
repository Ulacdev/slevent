import React from 'react';
import { HitPayGatewaySettings } from '../../components/HitPayGatewaySettings';

export const PaymentSettings: React.FC = () => {
  return (
    <div className="space-y-8">
      <section>
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
