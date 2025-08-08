import {
  calculateCompletionPercentage,
  fetchSitemapStatus,
  fetchStatusData,
} from '@react/shared/utils/utils';
import { Tooltip } from 'flowbite-react';
import { FilePlus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const intervals = {};

export default function TableRow({
  index,
  item,
  openNamespaceDeleteDialog,
  handleOpenAddDataDialog,
}) {
  const [vectorRowData, setVectorRowData] = useState(item);
  const [datasourceLoading, setDatasourceLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Preload the hovered state image
  useEffect(() => {
    const img = new Image();
    img.src = '/img/icons/PaperPlusBlue.svg';
  }, []);

  useEffect(() => {
    if (vectorRowData?.id) {
      (async () => {
        try {
          setDatasourceLoading(true);
          const res = await fetch(
            `/api/page/vectors/datasourceList?namespaceName=${vectorRowData.name}`,
            {
              method: 'GET',
            },
          );
          const data = (await res.json())?.res;
          const dataSource = data.dataSources[0];
          if (dataSource) {
            const { id, name } = dataSource;

            setVectorRowData((prev) => ({
              ...prev,
              dataSourceId: id,
              dataSourceName: name,
            }));
            setDatasourceLoading(false);

            await fetchStatus(dataSource, vectorRowData.name, setVectorRowData);
          }
        } catch (error) {
          console.error('Error fetching namespace list:', error.message);
        } finally {
          setDatasourceLoading(false);
        }
      })();
    }
    return () => {
      if (intervals[vectorRowData?.dataSourceId]) {
        clearInterval(intervals[vectorRowData?.dataSourceId]);
        delete intervals[vectorRowData?.dataSourceId];
      }
    };
  }, [item]);

  const fetchStatus = async (dataSource, name, setData) => {
    try {
      setStatusLoading(true);
      let res = await fetchStatusData(dataSource.id);
      let sitemapStatus = {};
      if (dataSource.type === 'SITEMAP') {
        sitemapStatus = await fetchSitemapStatus(dataSource.id);
        if (
          calculateCompletionPercentage({
            type: dataSource.type,
            statusData: { res, sitemapStatus },
          }) < 100
        ) {
          if (!intervals[dataSource.id]) {
            intervals[dataSource.id] = setInterval(async () => {
              const updatedStatus = await fetchSitemapStatus(dataSource.id);

              if (
                calculateCompletionPercentage({
                  type: dataSource.type,
                  statusData: { res, sitemapStatus: updatedStatus },
                }) === 100
              ) {
                const updatedGlobalStatus = await fetchStatusData(dataSource.id);

                setData((prev) => ({
                  ...prev,
                  statusData: {
                    res: updatedGlobalStatus,
                    sitemapStatus: updatedStatus,
                  },
                }));

                clearInterval(intervals[dataSource.id]);
                delete intervals[dataSource.id];
              }

              setData((prev) => ({
                ...prev,
                statusData: {
                  ...prev.statusData,
                  sitemapStatus: updatedStatus,
                },
              }));
            }, 10000);
          }
        } else if (intervals[dataSource.id]) {
          clearInterval(intervals[dataSource.id]);
          delete intervals[dataSource.id];
        }
      }

      setData((prev) => ({
        ...prev,
        type: dataSource.type,
        statusData: { res, sitemapStatus },
      }));
    } catch (error) {
      setData((prev) => ({
        ...prev,
        type: dataSource.type,
        statusData: {
          res: {
            res: {
              status: 'failed-retry',
            },
          },
          sitemapStatus: {
            res: {
              status: null,
            },
          },
        },
      }));
    } finally {
      setStatusLoading(false);
    }
  };

  const renderSkeletonLoading = () => {
    return <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>;
  };

  // Helper function to format file preview content
  const formatFilePreview = () => {
    if (!vectorRowData?.dataSourceName) {
      return 'No data source';
    }

    const sourceName = vectorRowData?.dataSourceName;
    const sourceCount = vectorRowData?._count?.dataSources;
    return `${sourceName} (${sourceCount} sources)`;
  };

  return (
    <tr
      key={`${vectorRowData.name}_${index}`}
      className="hover:bg-gray-50 border-b border-solid border-gray-100 h-12"
    >
      {/* Data Space Name Column */}
      <td className="px-4 py-4 whitespace-nowrap">
        <Link to={`/data/${vectorRowData.name}`}>
          <Tooltip
            content={vectorRowData.name}
            trigger="hover"
            placement="top"
            className="min-w-max max-w-xs break-words"
            style="dark"
            arrow={false}
          >
            <div className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600 inline-block">
              {vectorRowData.name}
            </div>
          </Tooltip>
        </Link>
      </td>

      {/* File Preview Column */}
      <td className="px-4 py-4 whitespace-nowrap">
        {datasourceLoading ? (
          <div className="flex items-center">{renderSkeletonLoading()}</div>
        ) : !vectorRowData?.dataSourceName ? (
          <Link to={`/data/${vectorRowData.name}`}>
            <div className="text-sm text-gray-500">No data source</div>
          </Link>
        ) : (
          <Link to={`/data/${vectorRowData.name}`}>
            <div className="text-sm text-gray-500 flex items-center cursor-pointer hover:text-blue-600">
              <Tooltip
                content={formatFilePreview()}
                trigger="hover"
                placement="top"
                className="min-w-max max-w-md break-words"
                style="dark"
                arrow={false}
              >
                <div className="flex items-center">
                  <span className="truncate max-w-[200px]">{vectorRowData?.dataSourceName}</span>
                  <span className="ml-2 whitespace-nowrap">{`(${vectorRowData?._count?.dataSources} sources)`}</span>
                </div>
              </Tooltip>
              <i className="ml-2 text-blue-500 fas fa-edit cursor-pointer flex-shrink-0"></i>
            </div>
          </Link>
        )}
      </td>

      {/* Index Status Column - No tooltip needed for status */}
      <td className="px-4 py-4 whitespace-nowrap">
        <Link to={`/data/${vectorRowData.name}`}>
          {statusLoading ? (
            <div className="flex items-center">{renderSkeletonLoading()}</div>
          ) : (
            <div className="text-sm">
              {vectorRowData?.statusData && vectorRowData?.statusData.res?.res?.status ? (
                vectorRowData?.type === 'SITEMAP' ? (
                  <div className="flex items-center">
                    <div className="capitalize">
                      {vectorRowData?.statusData.res?.res?.status === 'indexing' ? (
                        <div className="flex items-center text-yellow-500">
                          <span>● Indexing</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-green-500">
                          <span>● Complete</span>
                        </div>
                      )}
                    </div>
                    {vectorRowData?.statusData.res?.res?.status !== 'failed-retry' && (
                      <div className="pl-1">
                        {isNaN(calculateCompletionPercentage(item))
                          ? ''
                          : calculateCompletionPercentage(item) < 100
                          ? calculateCompletionPercentage(item) + '%'
                          : ''}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="capitalize">
                      {vectorRowData?.statusData.res?.res?.status == 'indexing' ? (
                        <div className="flex items-center text-yellow-500">
                          <span>● Indexing</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-green-500">
                          <span>● Complete</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="text-gray-500">
                  <span className="capitalize">Not Indexed</span>
                </div>
              )}
            </div>
          )}
        </Link>
      </td>

      {/* Actions Column */}
      <td className="px-4 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end space-x-2">
          <Tooltip
            content="Add Data Source"
            trigger="hover"
            placement="top"
            style="dark"
            arrow={false}
          >
            <FilePlus
              className="h-4 w-4 text-[#242424] cursor-pointer hover:text-blue-600"
              onClick={handleOpenAddDataDialog}
            />
          </Tooltip>
          <Tooltip
            content="Delete Data Space"
            trigger="hover"
            placement="top"
            style="dark"
            arrow={false}
          >
            <Trash2
              className="h-4 w-4 text-[#242424] cursor-pointer hover:text-red-600"
              onClick={() => openNamespaceDeleteDialog(vectorRowData.name)}
            />
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}
