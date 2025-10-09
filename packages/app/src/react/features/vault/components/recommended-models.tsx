import { useRecommendedModels, useUpdateRecommendedModel } from '@react/features/vault/hooks/use-vault';
import { recommendedModelsService } from '@react/features/vault/vault-business-logic';
import { Switch } from '@src/react/shared/components/ui/switch';
import { errorToast, successToast } from '@src/shared/components/toast';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';

const disabledProviders = ['togetherai', 'groq', 'xai'];

export function RecommendedModels({ pageAccess }: { pageAccess: { write: boolean } }) {
  const { data: recommendedModels, isLoading } = useRecommendedModels();
  const { mutate: updateRecommendedModel, isLoading: isUpdating } = useUpdateRecommendedModel();
  const [updatingProviderId, setUpdatingProviderId] = React.useState<string | null>(null);
  const filteredRecommendedModels = useMemo(() => {
    return !recommendedModels
      ? {}
      : Object.fromEntries(
          Object.entries(recommendedModels).filter(
            ([providerId]) => !disabledProviders.includes(providerId),
          ),
        );
  }, [recommendedModels]);

  const onToggle = (providerId: string, checked: boolean) => {
    setUpdatingProviderId(providerId);
    updateRecommendedModel(
      { providerId, enabled: checked },
      {
        onSettled: () => setUpdatingProviderId(null),
        onSuccess: () => {
          successToast('Recommended model updated');
        },
        onError: () => {
          errorToast('Please try again', 'Failed to update recommended model');
        },
      },
    );
  };

  return (
    <div className="rounded-lg bg-card text-card-foreground border border-solid border-gray-200 shadow-sm">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">SmythOS Recommends</h2>
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Use SmythOS API keys out of the box. See{' '}
              <a
                href={`${SMYTHOS_DOCS_URL}/agent-studio/key-concepts/vault#built-in-ai-providers`}
                target="_blank"
                className="underline"
              >
                documentation
              </a>
              .
            </p>
            <div className="mt-4 space-y-4">
              {Object.entries(filteredRecommendedModels).map(([providerId, { enabled }]) => (
                <div key={providerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={`/img/provider_${providerId}.svg`}
                      alt={`${providerId} icon`}
                      className="h-5 w-5"
                    />
                    <span>{recommendedModelsService.getNameByProviderId(providerId)}</span>
                  </div>
                  {updatingProviderId === providerId && isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#3f83f8]" />
                  ) : (
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => onToggle(providerId, checked)}
                      className="bg-gray-200 data-[state=checked]:bg-[#3f83f8]"
                      disabled={!pageAccess?.write}
                      data-qa={`${providerId}-recommended-model-toggle`}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
