import { prepareRowData } from '@react/features/agent-settings/components/CapabilitiesWidget/meta/skill-calls-utils';
import { CustomCellRendererProps } from 'ag-grid-react';
import { memo, useState } from 'react';
import { FaRegCirclePlay } from 'react-icons/fa6';
import { IoIosCheckmarkCircleOutline } from 'react-icons/io';
import { MdOutlineErrorOutline } from 'react-icons/md';

type Props = CustomCellRendererProps & {
  inputs: any[];
  fetchSkill: any;
  setRowData: any;
};

const ActionCellRenderer = memo((params: Props) => {
  const [isRunningSingleRun, setIsRunningSingleRun] = useState(false);
  const handleRowSingleRun = async () => {
    params.data.result = null;
    // Run the skill for the selected row
    setIsRunningSingleRun(true);
    let fieldValue;
    try {
      const data = prepareRowData(params.inputs, params.data.payload);
      // const result = await callSkillMutation.mutateAsync(data);
      const result = await params.fetchSkill(data);
      const agentResponse = result?.response;
      // save the result to the grid
      fieldValue = JSON.stringify(agentResponse, null, 2);
    } catch (error) {
      fieldValue = `Error: ${JSON.stringify(error, null, 2)}`;
    } finally {
      setIsRunningSingleRun(false);
    }

    params.setRowData((prev) => {
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].id === params.data.id) {
          prev[i].result = JSON.stringify(fieldValue, null, 2);
          break;
        }
      }
      return [...prev];
    });
  };

  const _ID_KEY = '__id'; // This is a salted id key to avoid conflicts with other id keys

  const loadingCondition = isRunningSingleRun || (params as any).isRunning;
  // const completedIds = (params as any).completedIds ? JSON.parse((params as any).completedIds) : [];
  // const hasResult = params.data.result && params.data.result !== 'null';
  const hasResult = params.data?.done;

  //! TEMP, we now check if there is an error in the result by checking if the result is a string and starts with 'Error:'
  const hasError =
    typeof params.data.result === 'string' && params.data.result.startsWith('Error:');

  return (
    <>
      {!loadingCondition && (
        <button
          onClick={handleRowSingleRun}
          disabled={loadingCondition}
          className="h-full flex items-center justify-center ml-2 mr-1 cursor-pointer gap-1"
        >
          <FaRegCirclePlay size={16} />
          Run
        </button>
      )}

      <div className="ml-2 h-full flex items-center ">
        {loadingCondition ? (
          hasResult ? (
            hasError ? (
              <MdOutlineErrorOutline size={20} className="text-red-500" />
            ) : (
              <IoIosCheckmarkCircleOutline size={20} className="text-smythos-blue-500" />
            )
          ) : (
            <p>Preparing...</p>
          )
        ) : null}
      </div>
    </>
  );
});

export default ActionCellRenderer;
