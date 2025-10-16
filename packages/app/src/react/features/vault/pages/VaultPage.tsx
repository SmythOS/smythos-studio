import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { ErrorBoundarySuspense } from '@src/react/features/error-pages/higher-order-components/ErrorBoundary';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { PluginComponents } from '@src/react/shared/plugins/PluginComponents';
import { PluginTarget } from '@src/react/shared/plugins/Plugins';
import { errorToast, successToast } from '@src/shared/components/toast';
import { Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { CiExport } from 'react-icons/ci';
import { ApiKeys } from '../components/api-keys';
import { OAuthConnections } from '../components/oauth-connections';
import UserCustomModels from '../components/user-custom-models';
import { UserModels } from '../components/user-models';
import { useVault } from '../hooks/use-vault';

export default function VaultPage() {
  const [isExporting, setIsExporting] = React.useState(false);
  const { isLoading, exportVault } = useVault();
  const { userInfo, getPageAccess } = useAuthCtx();
  const hasBuiltinModels = useMemo(() => {
    const flags = userInfo?.subs?.plan?.properties?.flags;
    return (
      // @ts-ignore
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 pl-12 md:pl-0 pr-0">
      <div className="flex items-center justify-between md:justify-end">
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
            label={isExporting ? 'Exporting...' : 'Export Vault Structure'}
          />
        )}
      </div>

      {hasBuiltinModels && (
        <PluginComponents targetId={PluginTarget.VaultPageSmythOSRecommendedModels} />
      )}

      <UserModels pageAccess={pageAccess} />
      {!window.location.hostname.includes('smythos.com') && (
        <UserCustomModels pageAccess={pageAccess} />
      )}
      <PluginComponents targetId={PluginTarget.VaultPageEnterpriseModels} />
      <OAuthConnections />

      <ErrorBoundarySuspense
        loadingFallback={<div>Loading...</div>}
        errorFallback={() => <div>Error loading API keys</div>}
      >
        <ApiKeys pageAccess={pageAccess} />
      </ErrorBoundarySuspense>
    </div>
  );
}
