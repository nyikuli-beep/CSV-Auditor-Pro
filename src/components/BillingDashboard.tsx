import React from 'react';
import SettingsBillingSection from './SettingsBillingSection.tsx';
import { CSVFile } from '../types.ts';

interface BillingDashboardProps {
  isDarkMode?: boolean;
  currentUserEmail?: string;
  files?: CSVFile[];
  onOpenUpgradeModal?: () => void;
  onOpenEnterpriseModal?: () => void;
}

export default function BillingDashboard({
  isDarkMode = true,
  currentUserEmail = 'nyikulibramwel@gmail.com',
  files = [],
  onOpenUpgradeModal,
  onOpenEnterpriseModal
}: BillingDashboardProps) {
  return (
    <SettingsBillingSection
      isDarkMode={isDarkMode}
      currentUserEmail={currentUserEmail}
      files={files}
      onOpenUpgradeModal={onOpenUpgradeModal}
      onOpenEnterpriseModal={onOpenEnterpriseModal}
    />
  );
}
