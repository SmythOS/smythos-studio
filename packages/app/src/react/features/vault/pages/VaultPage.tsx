import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { ErrorBoundarySuspense } from '@src/react/features/error-pages/higher-order-components/ErrorBoundary';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { PluginComponents } from '@src/react/shared/plugins/PluginComponents';
import { PluginTarget } from '@src/react/shared/plugins/Plugins';
import { errorToast, successToast } from '@src/shared/components/toast';
import { builderStore } from '@src/shared/state_stores/builder/store';
import { Cpu, KeyRound, Link2, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { CiExport } from 'react-icons/ci';
import { ApiKeys } from '../components/api-keys';
import { OAuthConnections } from '../components/oauth-connections';
import UserCustomModels from '../components/user-custom-models';
import { UserModels } from '../components/user-models';
import { VectorDatabases } from '../components/vector-databases';
import { useVault } from '../hooks/use-vault';

type TabType = 'models' | 'connections' | 'security';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'models',
    label: 'AI Models',
    icon: <Cpu className="w-4 h-4" />,
    description: 'Manage your AI models and configurations'
  },
  {
    id: 'connections',
    label: 'Connections',
    icon: <Link2 className="w-4 h-4" />,
    description: 'Configure integrations and data sources'
  },
  {
    id: 'security',
    label: 'Keys',
    icon: <KeyRound className="w-4 h-4" />,
    description: 'Manage authentication and access'
  }
];

export default function VaultPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('models');
  const { isLoading, exportVault } = useVault();
  const { userInfo, getPageAccess } = useAuthCtx();
  const hasBuiltinModels = useMemo(() => {
    const flags = userInfo?.subs?.plan?.properties?.flags;
    return (
      // @ts-expect-error - flags is not typed
      flags?.hasBuiltinModels || userInfo?.subs?.plan?.isDefaultPlan === true
    );
  }, [userInfo?.subs?.plan]);

  const pageAccess = getPageAccess('/vault');

  const handleExportVault = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const structure = await exportVault();
      const blob = new Blob([JSON.stringify(structure, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smythos_vault_structure.json';
      a.click();

      successToast('Vault structure exported successfully');
    } catch (error) {
      errorToast('Failed to export vault structure');
    } finally {
      setIsExporting(false);
    }
  };

  const isOnDevSAAS = builderStore.getState().serverStatus?.env == 'DEV' &&
  builderStore.getState().serverStatus?.edition == 'enterprise' &&
  !window.location.hostname.includes('smythos.com');

  useEffect(() => {
    if (window.location.hash) {
      async function scrollToHash() {
        const id = window.location.hash.replace('#', '');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
      scrollToHash();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 pl-12 md:pl-0 pr-0">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vault</h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI models, connections, and security settings
          </p>
        </div>
        {pageAccess?.write && (
          <CustomButton
            handleClick={handleExportVault}
            disabled={isExporting}
            Icon={
              isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CiExport className="inline mr-1 w-4 h-4" strokeWidth={1} />
              )
            }
            addIcon
            label={isExporting ? 'Exporting...' : 'Export Vault'}
          />
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group inline-flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }
              `}
            >
              <span className={activeTab === tab.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Models Tab */}
        {activeTab === 'models' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {hasBuiltinModels && (
              <PluginComponents targetId={PluginTarget.VaultPageSmythOSRecommendedModels} />
            )}
            <UserModels pageAccess={pageAccess} />
            <UserCustomModels pageAccess={pageAccess} />
            <PluginComponents targetId={PluginTarget.VaultPageEnterpriseModels} />
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <OAuthConnections />
            {isOnDevSAAS && <VectorDatabases />}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <ErrorBoundarySuspense
              loadingFallback={<div>Loading...</div>}
              errorFallback={() => <div>Error loading Keys</div>}
            >
              <ApiKeys pageAccess={pageAccess} />
            </ErrorBoundarySuspense>
          </div>
        )}
      </div>
    </div>
  );
}

