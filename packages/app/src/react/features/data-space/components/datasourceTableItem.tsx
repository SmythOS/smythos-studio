import {
  getDSSitemapStatus,
  getDSStatus,
} from '@react/features/data-space/client/dataspace.api-client.service';
import DatasourceInfoModal from '@react/features/data-space/dialogs/datasourceInfo';
import DeleteDatasourceDialog from '@react/features/data-space/dialogs/deleteDatasource';
import { Datasource } from '@react/shared/types/api-results.types';
import { useQuery } from '@tanstack/react-query';
import { Tooltip } from 'flowbite-react';
import { random } from 'lodash-es';
import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { IoIosInformationCircleOutline } from 'react-icons/io';

type Props = {
  item: Datasource;
  namespaceName: string;
  remove: () => void;
};

const calculateCompletionPercentage = (stats?: {
  completed?: number;
  pending?: number;
  failed?: number;
  total?: number;
}) => {
  // const completed = stats?.completed || 0;
  const processed = stats?.total - stats?.pending;
  const total = stats?.total || 0;
  return Math.round((processed / total) * 100);
};

export default function DatasourceTableItem({ item, namespaceName, remove }: Props) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewingInfoModal, setIsViewingInfoModal] = useState(false);

  const randomRefetchInerval = random(10_000, 20_000, true); // to avoid all sitemaps refetching at the same time (thundering herd problem)
  const statusQuery = useQuery({
    queryKey: [`datasource-status-${item.id}`],
    queryFn: () => getDSStatus(item.id),
    refetchInterval: item.type == 'SITEMAP' ? randomRefetchInerval : false,
  });

  const sitemapStatusQuery = useQuery({
    queryKey: [`datasource-sitemap-status-${item.id}`],
    queryFn: () => getDSSitemapStatus(item.id),
    enabled: item.type == 'SITEMAP' ? true : false,
    refetchInterval: item.type == 'SITEMAP' ? randomRefetchInerval : false,
  });

  const percentageSpan = (
    <div className="pl-1">
      {isNaN(calculateCompletionPercentage(sitemapStatusQuery?.data?.status))
        ? '0%'
        : calculateCompletionPercentage(sitemapStatusQuery?.data?.status) < 100
        ? calculateCompletionPercentage(sitemapStatusQuery?.data?.status) + '%'
        : ''}
    </div>
  );

  const getStatusText = () => {
    const status = statusQuery?.data?.status;
    const sitemapStatus = sitemapStatusQuery?.data?.status;

    const percentage = calculateCompletionPercentage(sitemapStatus);
    if (status === 'indexing') {
      return (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
          <span className="text-yellow-500">Indexing</span>
          {item.type === 'SITEMAP' && percentageSpan}
        </div>
      );
    } else if (status === 'pending') {
      return (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
          <span className="text-yellow-500">Pending</span>
        </div>
      );
    } else if (percentage === 100) {
      return (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-green-500">Complete</span>
        </div>
      );
    } else if (status === 'done' && percentage < 100) {
      //* NESTED IF
      if (sitemapStatus?.pending > 0) {
        return (
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-yellow-500">Indexing</span>
            {percentageSpan}
          </div>
        );
      }

      return (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-green-500">Complete</span>
        </div>
      );
    } else if (status === 'done') {
      return (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-green-500">Complete</span>
        </div>
      );
    } else if (status === 'failed-retry' || status === 'failed') {
      return (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          <span className="text-red-500">Indexing Error</span>
        </div>
      );
    } else if (status == 'done-duplicate') {
      return (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          <span className="text-red-500">Duplicate</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
          <span className="text-gray-500">{status || 'Unknown'}</span>
        </div>
      );
    }
  };

  const memorizedStatusText = useMemo(() => getStatusText(), [statusQuery, sitemapStatusQuery]);

  const statusColumn = statusQuery?.data ? (
    memorizedStatusText
  ) : (
    <div className="flex items-center">
      <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
      <span className="text-gray-500">Loading...</span>
    </div>
  );

  return (
    <>
      <tr className="hover:bg-gray-50 border-b border-solid border-gray-100 h-12">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">{item?.name}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-500 truncate max-w-[220px]">
            {item?.url?.startsWith('storage:') ? 'File Upload' : item?.url}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {statusColumn}
            {item.type === 'SITEMAP' && (
              <IoIosInformationCircleOutline
                cursor="pointer"
                color="#6B7280"
                className="ml-2"
                size={20}
                onClick={() => {
                  setIsViewingInfoModal(true);
                }}
              />
            )}
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end">
            <Tooltip content="Delete Data Source" placement="top" className="min-w-max">
              <Trash2
                className="h-4 w-4 text-[#242424] cursor-pointer"
                onClick={() => setIsDeleteDialogOpen(true)}
              />
            </Tooltip>
          </div>
        </td>
      </tr>

      {isViewingInfoModal &&
        item.type === 'SITEMAP' &&
        createPortal(
          <DatasourceInfoModal
            item={item}
            onClose={() => setIsViewingInfoModal(false)}
            status={statusQuery.data?.statusData?.status}
            sitemapStatus={sitemapStatusQuery.data?.status}
            lastCrawledAt={statusQuery.data?.statusData?.lastCrawledAt}
          />,
          document.getElementById('root') as HTMLElement,
        )}

      {isDeleteDialogOpen &&
        createPortal(
          <DeleteDatasourceDialog
            item={item}
            onClose={() => setIsDeleteDialogOpen(false)}
            remove={remove}
            namespaceName={namespaceName}
          />,
          document.getElementById('root') as HTMLElement,
        )}
    </>
  );
}
