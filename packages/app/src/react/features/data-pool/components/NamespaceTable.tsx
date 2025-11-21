/**
 * Namespace Table Component
 *
 * Displays namespaces in a table with actions
 */

import { Button } from '@src/react/shared/components/ui/button';
import { Tooltip } from 'flowbite-react';
import { FilePlus, Sparkles, Trash2 } from 'lucide-react';
import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import credentialsSchema from '../../credentials/credentials-schema.json';
import { useDataPoolContext } from '../contexts/data-pool.context';
import type { NamespaceWithProvider } from '../types';
import { UploadDatasourceDialog } from './UploadDatasourceDialog';

interface NamespaceTableProps {
  namespaces: NamespaceWithProvider[];
  onDelete: (namespace: NamespaceWithProvider) => void;
}

interface ProviderSchema {
  id: string;
  name: string;
  logo_url?: string;
}

export const NamespaceTable: FC<NamespaceTableProps> = ({ namespaces, onDelete }) => {
  const { getCredentialById } = useDataPoolContext();
  const navigate = useNavigate();
  const [uploadDialogNamespace, setUploadDialogNamespace] = useState<string | null>(null);

  /**
   * Get provider logo URL from schema
   */
  const getProviderLogo = (providerId: string): string | undefined => {
    const provider = (credentialsSchema as ProviderSchema[]).find((p) => p.id === providerId);
    return provider?.logo_url;
  };

  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <table className="w-full min-w-[600px] text-sm text-left">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3">Data Space Name</th>
            <th className="px-6 py-3">Provider</th>
            <th className="px-6 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {namespaces.map((namespace) => {
            const credential = getCredentialById(namespace.credentialId);
            const providerLogo = credential ? getProviderLogo(credential.provider) : undefined;

            // Format model name for display (truncate if too long)
            const getShortModelName = (modelId: string) => {
              const maxLength = 20;
              if (modelId.length > maxLength) {
                return modelId.substring(0, maxLength) + '...';
              }
              return modelId;
            };

            return (
              <tr
                key={namespace.label}
                className="border-b hover:bg-gray-100 cursor-pointer transition-colors text-left"
                onClick={() =>
                  navigate(`/data-pool/${encodeURIComponent(namespace.label)}/datasources`)
                }
              >
                {/* Name with Embeddings Badge */}
                <td className="px-6 py-4 cursor-pointer" title={namespace.label}>
                  <div className="flex items-center gap-2 flex-wrap min-h-0">
                    <span className="font-medium text-gray-900 hover:underline truncate">
                      {namespace.label}
                    </span>
                    {namespace.embeddings && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                        title={`${namespace.embeddings.modelId}${namespace.embeddings.dimensions ? ` · ${namespace.embeddings.dimensions} dimensions` : ''}`}
                      >
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-md text-purple-700 hover:bg-purple-100 transition-colors">
                          <Sparkles className="h-3 w-3 shrink-0" />
                          <span className="text-xs font-medium hidden sm:inline">
                            {getShortModelName(namespace.embeddings.modelId)}
                          </span>
                          {namespace.embeddings.dimensions && (
                            <span className="text-xs text-purple-500">
                              <span className="hidden sm:inline">· </span>
                              {namespace.embeddings.dimensions}d
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </td>

                {/* Provider */}
                <td className="px-6 py-4 text-gray-700">
                  <div className="flex items-center gap-2">
                    {providerLogo && (
                      <img
                        src={providerLogo}
                        alt={credential?.name || 'Provider'}
                        className="w-5 h-5 object-contain"
                      />
                    )}
                    <span>{credential?.name || 'Deleted'}</span>
                  </div>
                </td>

                {/* Actions */}
                <td
                  className="px-6 py-4"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="flex items-center justify-center">
                    <Tooltip content="Add Datasource">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadDialogNamespace(namespace.label)}
                        className="hover:text-blue-500"
                      >
                        <FilePlus className="h-4 w-4 text-[#242424] cursor-pointer hover:text-blue-600" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Delete">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(namespace)}
                        className="hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Upload Datasource Dialog */}
      {uploadDialogNamespace && (
        <UploadDatasourceDialog
          isOpen={!!uploadDialogNamespace}
          namespaceLabel={uploadDialogNamespace}
          onClose={() => setUploadDialogNamespace(null)}
          onSuccess={() => {
            setUploadDialogNamespace(null);
            // Optionally show success message
          }}
        />
      )}
    </div>
  );
};
