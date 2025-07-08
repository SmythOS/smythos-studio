import { Tooltip } from 'flowbite-react';
import { Dispatch, FC, SetStateAction, useState } from 'react';
import { Link } from 'react-router-dom';

import { DomainDeletionModal } from '@react/features/domains-space/components';
import { extractError } from '@react/shared/utils/errors';
import { Trash2 } from 'lucide-react';

interface IdName {
  id: string;
  name: string;
}
interface DataItem extends IdName {
  aiAgent: IdName;
  aiAgentEndpoint: { path: string }[];
}

interface DomainsTableProps {
  dataArray: DataItem[];
  setDomainData?: Dispatch<SetStateAction<any[]>>;
}

export const DomainsTable: FC<DomainsTableProps> = ({ dataArray, setDomainData }) => {
  const [state, setState] = useState({
    inputValue: '',
    deleteError: false,
    errorMessage: '',
    deleteLoading: false,
    selectedDomain: '',
    dialogOpen: false,
  });

  const handleDeleteDomain = async (value) => {
    setState({ ...state, deleteLoading: true });

    try {
      const data = await fetch('/api/page/domains/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value }),
      });

      const filteredDomain = dataArray.filter((item) => item.name !== value);

      setDomainData(filteredDomain);
      setState({
        ...state,
        deleteLoading: false,
        deleteError: false,
        inputValue: '',
        dialogOpen: false,
      });
    } catch (error) {
      const _errorMessage =
        error.status === 403 && extractError(error) === 'Forbidden'
          ? 'You are not authorized to delete this domain'
          : extractError(error) || 'An error occurred while deleting the domain';
      setState({ ...state, deleteLoading: false, errorMessage: _errorMessage, deleteError: true });
    }
  };

  const handleChange = (value) => setState({ ...state, inputValue: value, deleteError: false });

  return (
    <div className="relative overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-auto border border-solid border-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-[#242424] uppercase tracking-wider whitespace-nowrap">
                Name
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-[#242424] uppercase tracking-wider whitespace-nowrap">
                Agent
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-[#242424] uppercase tracking-wider whitespace-nowrap">
                Endpoints
              </th>
              <th className="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-[#242424] uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {dataArray?.map((item, index) => (
              <tr
                key={index}
                className="hover:bg-gray-50 border-b border-solid border-gray-100 h-12"
              >
                {/* Name Column */}
                <td className="px-6 py-4 whitespace-nowrap min-w-[200px] text-[#111827]">
                  <div className="flex items-center w-full h-full break-all">
                    <span className="whitespace-normal text-wrap">{item?.name}</span>
                  </div>
                </td>
                {/* Agent Column */}
                <td className="px-6 py-4 whitespace-nowrap min-w-[200px] text-[#6B7280]">
                  <div className="flex items-center w-full h-full">
                    {item.aiAgent && item.aiAgent?.name ? (
                      <Link to={`/builder/${item.aiAgent.id}`} target="_blank">
                        <span className="cursor-pointer domainAgent">{item.aiAgent?.name}</span>
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </div>
                </td>
                {/* Endpoints Column */}
                <td className="px-6 py-4 whitespace-nowrap min-w-[200px] text-[#6B7280]">
                  <div className="flex items-center w-full h-full break-all">
                    {item.aiAgentEndpoint && item.aiAgentEndpoint.length > 0
                      ? item.aiAgentEndpoint.map((agent) => (agent?.path ? agent.path : 'N/A'))
                      : 'N/A'}
                  </div>
                </td>
                {/* Actions Column */}
                <td className="px-6 py-4 whitespace-nowrap text-[#6B7280]">
                  <div className="flex items-center h-full justify-end">
                    <Tooltip content="Delete Domain" placement="top" className="min-w-max">
                      <Trash2
                        data-tooltip-target="deleteDomain"
                        onClick={() =>
                          setState({
                            ...state,
                            inputValue: '',
                            dialogOpen: true,
                            selectedDomain: item?.name,
                          })
                        }
                        id="deleteDomain"
                        className="h-4 w-4 text-[#242424] cursor-pointer"
                      />
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {state.dialogOpen && (
          <DomainDeletionModal
            state={state}
            onClose={() => setState({ ...state, inputValue: '', dialogOpen: false })}
            handleChange={handleChange}
            handleDeleteDomain={handleDeleteDomain}
          />
        )}
      </div>
    </div>
  );
};
