'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UserManagement } from '@/components/admin/UserManagement';
import { TokenManagement } from '@/components/admin/TokenManagement';
import { ClaimsMonitoring } from '@/components/admin/ClaimsMonitoring';
import { SystemConfiguration } from '@/components/admin/SystemConfiguration';
import { ContractBalance } from '@/components/admin/ContractBalance';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminAuth } from '@/components/admin/AdminAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { isAdmin, isLoading, checkAdminStatus } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (isConnected && address) {
      checkAdminStatus();
    }
  }, [isConnected, address, checkAdminStatus]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show auth component if not admin
  if (!isAdmin) {
    return <AdminAuth />;
  }

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <UserManagement />;
      case 'tokens':
        return <TokenManagement />;
      case 'claims':
        return <ClaimsMonitoring />;
      case 'balance':
        return <ContractBalance />;
      case 'system':
        return <SystemConfiguration />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderActiveComponent()}
    </AdminLayout>
  );
}