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
    return (
      <>
        <div
          role="status"
          className={`w-full p-2 border border-gray-200 shadow animate-pulse dark:border-gray-700 h-2 bg-gray-200 rounded-full dark:bg-gray-700`}
        ></div>
        <span className="sr-only">Loading...</span>
      </>
    );
  };

  return (
    <tr
      key={`${vectorRowData.name}_${index}`}
      className="hover:bg-gray-50 border-b border-solid border-gray-100 h-12"
    >
      {/* Name Column */}
      <td className="px-6 py-4 whitespace-nowrap">
        <Link to={`/data/${vectorRowData.name}`}>
          <p className="text-gray-900">{vectorRowData.name}</p>
        </Link>
      </td>

      {/* Datasource Column */}
      <td className="px-6 py-4 whitespace-nowrap">
        <Link to={`/data/${vectorRowData.name}`}>
          {datasourceLoading ? (
            <div className="flex items-center w-full h-full">{renderSkeletonLoading()}</div>
          ) : !vectorRowData?.dataSourceName ? (
            <div className="text-gray-500">
              <span>No data source</span>
            </div>
          ) : (
            vectorRowData?.dataSourceName && (
              <div className="text-gray-500" key={index}>
                <span className="mr-2 truncate">{vectorRowData?.dataSourceName}</span>
                <span className="mr-2 truncate">{`(${vectorRowData?._count?.dataSources} sources)`}</span>
                <i className="text-blue-500 fas fa-edit cursor-pointer"></i>
              </div>
            )
          )}
        </Link>
      </td>

      {/* Index Status Column */}
      <td className="px-6 py-4 whitespace-nowrap">
        <Link to={`/data/${vectorRowData.name}`}>
          {statusLoading ? (
            <div className="flex items-center w-full h-full">{renderSkeletonLoading()}</div>
          ) : (
            <>
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
            </>
          )}
        </Link>
      </td>

      {/* Actions Column */}
      <td className="px-6 py-4 text-center">
        <div className="flex items-center h-full justify-end gap-4 ">
          <Tooltip content="Delete Data Space" placement="top" className="min-w-max">
            <Trash2
              data-tooltip-target="deleteDataspace"
              onClick={() => openNamespaceDeleteDialog(vectorRowData?.name)}
              className="h-4 w-4 text-[#242424] cursor-pointer"
            />
          </Tooltip>
          <Tooltip content="Add Data Source" placement="top" className="min-w-max">
            <FilePlus
              onClick={() => handleOpenAddDataDialog(vectorRowData?.name)}
              className="h-4 w-4 text-[#242424] cursor-pointer"
            />
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}
