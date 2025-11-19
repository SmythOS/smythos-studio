/**
 * Namespace Table Component
 *
 * Displays namespaces in a table with actions
 */

import { Button } from '@src/react/shared/components/ui/button';
import { Tooltip } from 'flowbite-react';
import { Trash2 } from 'lucide-react';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import credentialsSchema from '../../credentials/credentials-schema.json';
import { useDataPoolContext } from '../contexts/data-pool.context';
import type { NamespaceWithProvider } from '../types';

interface NamespaceTableProps {
  namespaces: NamespaceWithProvider[];
  onDelete: (namespace: NamespaceWithProvider) => void;
}

interface ProviderSchema {
  id: string;
  name: string;
  logo_url?: string;
}

export const NamespaceTable: FC<NamespaceTableProps> = ({
  namespaces,
  onDelete,
}) => {
  const { getCredentialById } = useDataPoolContext();
  const navigate = useNavigate();

  /**
   * Get provider logo URL from schema
   */
  const getProviderLogo = (providerId: string): string | undefined => {
    const provider = (credentialsSchema as ProviderSchema[]).find((p) => p.id === providerId);
    return provider?.logo_url;
  };

  return (
    <div className="overflow-x-auto">
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

            return (
              <tr key={namespace.label} className="border-b hover:bg-gray-100 cursor-pointer hover:underline transition-colors text-left"
              onClick={() => navigate(`/data-pool/${encodeURIComponent(namespace.label)}/datasources`)}
              >
                {/* Name */}
                <td className="px-6 py-4 cursor-pointer font-medium text-gray-900" title={namespace.label}
                >
                  {namespace.label}
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
                    <span>{credential?.name || 'Unknown'}</span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4"
                onClick={(e) =>{
                  e.stopPropagation();
                }}
                >
                  <div className="flex items-center justify-center gap-2">
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
    </div>
  );
};

