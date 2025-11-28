/**
 * Datasources Table Component
 *
 * Displays datasources in a table with actions
 */

import { Button } from '@src/react/shared/components/ui/button';
import { Tooltip } from 'flowbite-react';
import { Eye, FileText, Trash2 } from 'lucide-react';
import { FC } from 'react';
import type { Datasource } from '../types/datasource.types';

interface DatasourcesTableProps {
  datasources: Datasource[];
  onDelete: (datasource: Datasource) => void;
  onView: (datasource: Datasource) => void;
}

export const DatasourcesTable: FC<DatasourcesTableProps> = ({ datasources, onDelete, onView }) => {
  const formatSize = (sizeMb: number | undefined): string => {
    if (!sizeMb) return '0 B';
    
    if (sizeMb < 0.001) {
      // Less than 1 KB, show in Bytes
      return `${Math.round(sizeMb * 1024 * 1024)} B`;
    } else if (sizeMb < 1) {
      // Less than 1 MB, show in KB
      return `${(sizeMb * 1024).toFixed(2)} KB`;
    } else {
      // Show in MB
      return `${sizeMb.toFixed(2)} MB`;
    }
  };

  const formatDate = (dateString: Date | string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(dateString);
    }
  };

  const getFileIcon = () => {
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm text-left">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3">Name</th>
            <th className="px-6 py-3">Size</th>
            <th className="px-6 py-3">Created</th>
            <th className="px-6 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {datasources.map((datasource) => (
            <tr key={datasource.id} className="border-b hover:bg-gray-50">
              {/* Name */}
              <td className="px-6 py-4 font-medium text-gray-900" title={datasource.name}>
                <div className="flex items-center gap-2">
                  {getFileIcon()}
                  <span>{datasource.name}</span>
                </div>
              </td>

             

              {/* Size */}
              <td className="px-6 py-4 text-gray-700">{formatSize(datasource.datasourceSizeMb)}</td>

              {/* Created */}
              <td className="px-6 py-4 text-gray-700">{formatDate(datasource.createdAt)}</td>

              {/* Actions */}
              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-2">
                  <Tooltip content="View Details">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(datasource)}
                      className="hover:text-blue-500"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Delete">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(datasource)}
                      className="hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

