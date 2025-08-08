import TableRow from '@react/features/data-space/components/tableRow';
import AddDatasourceDialog from '@react/features/data-space/dialogs/addDatasource';
import DeleteNamespace from '@react/features/data-space/dialogs/deleteNamespace';
import { extractError } from '@react/shared/utils/errors';
import { Dispatch, FC, SetStateAction, useState } from 'react';
import { toast } from 'react-toastify';

interface DataItem {
  name: string;
  id: string;
}

interface VectorsTableProps {
  dataArray: DataItem[];
  setNamespaceData?: Dispatch<SetStateAction<any[]>>;
  handleNamespacesAfterDelete?: () => void;
}

const VectorsTable: FC<VectorsTableProps> = ({
  setNamespaceData,
  handleNamespacesAfterDelete,
  dataArray,
}) => {
  const [namespaceState, setNamespaceState] = useState({
    deleteNamespaceInput: '',
    selectedNamespace: '',
    deleteNamespaceDialog: false,
    deleteNamespaceLoading: false,
    deleteNamespaceError: '',
  });

  const [addDataSourceState, setAddDataSourceState] = useState({
    dataSourceNameInput: '',
    dataSourceDialog: false,
    addDataSourceLoading: false,
    addDataSourceError: false,
    dataSourceType: 'SITEMAP',
    dataSourceURL: '',
    message: false,
    sourceCategory: 'URL',
    uploadedFile: false,
    selectedItem: '',
    fetchStatusFunction: false,
    setDataSourceArray: false,
  });

  const openNamespaceDeleteDialog = (value: string) => {
    setNamespaceState({
      ...namespaceState,
      deleteNamespaceDialog: true,
      selectedNamespace: value,
      deleteNamespaceInput: '',
      deleteNamespaceError: '',
    });
  };

  const handleChange = (value: string) => {
    setNamespaceState({ ...namespaceState, deleteNamespaceInput: value, deleteNamespaceError: '' });
  };

  const handleNamespaceDelete = async (value: string) => {
    setNamespaceState({ ...namespaceState, deleteNamespaceLoading: true });
    try {
      await fetch(`/api/page/vectors/namespaces/${value}`, {
        method: 'DELETE',
      });
      toast.success('Data Space Deleted Successfully');
      setNamespaceData?.(dataArray.filter((item) => item.name !== value));
      handleNamespacesAfterDelete?.();
      setNamespaceState({
        ...namespaceState,
        deleteNamespaceLoading: false,
        deleteNamespaceDialog: false,
      });
    } catch (error: any) {
      const errorMessage =
        error.status === 403 && extractError(error) === 'Forbidden'
          ? 'You are not authorized to delete this data space'
          : extractError(error) || 'An error occurred while deleting the data space';
      setNamespaceState({
        ...namespaceState,
        deleteNamespaceLoading: false,
        deleteNamespaceError: errorMessage,
      });
    }
  };

  return (
    <div className="relative w-full">
      <div className="bg-white rounded-lg w-full">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border border-solid border-gray-100">
            <thead className="bg-gray-50 rounded-lg overflow-hidden">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#242424] uppercase tracking-wider w-1/4">
                  Data Spaces
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#242424] uppercase tracking-wider w-2/5">
                  File Preview
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#242424] uppercase tracking-wider w-1/4">
                  Indexing Status
                </th>
                <th className="px-4 py-3 w-[100px]"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dataArray &&
                dataArray?.map((item, index) => {
                  return (
                    <TableRow
                      item={item}
                      index={index}
                      openNamespaceDeleteDialog={openNamespaceDeleteDialog}
                      handleOpenAddDataDialog={() =>
                        setAddDataSourceState({
                          ...addDataSourceState,
                          dataSourceDialog: true,
                          selectedItem: item.name,
                        })
                      }
                      key={`${item.name}_${index}`}
                    />
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      <DeleteNamespace
        namespaceState={namespaceState}
        open={namespaceState.deleteNamespaceDialog}
        onClose={() => setNamespaceState({ ...namespaceState, deleteNamespaceDialog: false })}
        handleChange={handleChange}
        handleNamespaceDelete={handleNamespaceDelete}
      />
      {addDataSourceState.dataSourceDialog && (
        <AddDatasourceDialog
          namespaceName={addDataSourceState.selectedItem}
          onClose={() => setAddDataSourceState({ ...addDataSourceState, dataSourceDialog: false })}
        />
      )}
    </div>
  );
};

export default VectorsTable;
