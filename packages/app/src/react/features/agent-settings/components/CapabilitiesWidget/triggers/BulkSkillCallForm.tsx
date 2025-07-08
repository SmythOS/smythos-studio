import ActionCellRenderer from '@react/features/agent-settings/components/CapabilitiesWidget/meta/cellRenderers/ActionCellRenderer';
import ResponseCellRenderer from '@react/features/agent-settings/components/CapabilitiesWidget/meta/cellRenderers/ResponseCellRenderer';
import UploadDataBtn from '@react/features/agent-settings/components/CapabilitiesWidget/meta/UploadDataBtn';
import { keysToLower } from '@react/features/agent-settings/utils';
import { Spinner } from '@react/shared/components/ui/spinner';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { queryClient } from '@react/shared/query-client';
import { Agent, Component } from '@react/shared/types/agent-data.types';
import {
  BulkAgentCallJob,
  DeploymentWithAgentSnapshot,
} from '@react/shared/types/api-results.types';
import { PlanNames } from '@react/shared/types/subscription';
import { createLocalStorageArrayRetriever } from '@react/shared/utils/utils';
import { useQuery } from '@tanstack/react-query';
// import 'ag-grid-community/styles/ag-grid.css';
// import 'ag-grid-community/styles/ag-theme-quartz.css';
import { AgGridReact as AgGridReactType } from 'ag-grid-react';
import classNames from 'classnames';
import { isNil } from 'lodash-es';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { BiExport, BiReset } from 'react-icons/bi';
import { IoMdAdd } from 'react-icons/io';
import { MdDelete } from 'react-icons/md';
import { VscRunAll } from 'react-icons/vsc';
import { toast } from 'react-toastify';

type Props = {
  component: Component;
  agent: Agent;
  agentId: string;
  latestAgentDeploymentQuery: ReturnType<
    typeof useQuery<{ deployment: DeploymentWithAgentSnapshot }>
  > | null;
};

let IS_FIRST_RUN = true;

const AgGridReact = lazy(() =>
  import('ag-grid-react').then((module) => ({ default: module.AgGridReact })),
);
const localStorageRetriever = createLocalStorageArrayRetriever('bulk-skill-call-form');

// const saveLocalStorageState = debounce(
//     ({ rowData, LS_KEY }: { rowData: any[]; LS_KEY: string }) => {
//         localStorageRetriever.set(LS_KEY, rowData);
//     },
//     500,
//     { maxWait: 3_000 },
// );

const BulkSkillCallForm = ({ component, agent, agentId, latestAgentDeploymentQuery }: Props) => {
  // ! NOTE: AgGridReact does mutate the rowData array directly without using the setRowData function, so no re-render is triggered.
  const [rowData, setRowData] = useState<{ payload: any; id?: string; result?: any }[]>([]);
  const [isLoadingTableData, setIsLoadingTableData] = useState(true);
  const [selectedRowsIds, setSelectedRowsIds] = useState([]);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [isCancelingJob, setIsCancelingJob] = useState(false);
  const [isJobRunning, setIsJobRunning] = useState(false);

  const grid = useRef<AgGridReactType>(null);
  // const LS_KEY = `agent-${agentId}-component-${component.id}`;
  const {
    userInfo: { subs },
  } = useAuthCtx();

  const planName = subs.plan.name as PlanNames;

  const inputs = component.inputs;

  const currJobQuery = useQuery({
    // @ts-ignore
    queryKey: ['bulk_skill_call_job', agentId, component.id],
    queryFn: () =>
      fetch(
        `/api/page/agent_settings/ai-agent/${agentId}/bulk-calls/progress?componentId=${component.id}`,
      ).then((res) => res.json() as Promise<{ job: BulkAgentCallJob | null }>),

    refetchInterval: isJobRunning ? 5_000 : false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const canCancelJob = useMemo(() => {
    if (!currJobQuery.data?.job?.createdAt || currJobQuery?.data?.job?.status !== 'pending')
      return false;
    const createdAt = new Date(currJobQuery.data.job.createdAt);
    const currentTime = new Date();
    const timeDifference = currentTime.getTime() - createdAt.getTime();
    const minutesDifference = Math.floor(timeDifference / (1000 * 60));
    return minutesDifference >= 1;
  }, [currJobQuery.data]);

  useEffect(() => {
    const { data: res } = currJobQuery;
    if (!res) return;
    const rowData = res.job?.data ? JSON.parse(res.job.data) : [];
    setRowData(
      rowData.map((row) => ({ ...row, id: URL.createObjectURL(new Blob()).split('/').pop() })) ||
        [],
    );
    setIsLoadingTableData(false);

    if (res.job == null || res.job?.status !== 'pending') {
      if (IS_FIRST_RUN) {
        IS_FIRST_RUN = false;
      } else {
        // if (res.job?.status === 'completed') {
        //     toast.success('Bulk job completed successfully!');
        // } else {
        //     toast.error('Bulk job failed!');
        // }
      }
      setIsJobRunning(false);
      return;
    }

    setIsJobRunning(true);
  }, [currJobQuery.data]);

  const fetchSkill = async (values: any) => {
    return await fetch(`/api/page/agent_settings/ai-agent/${agentId}/skill-call`, {
      method: 'POST',
      body: JSON.stringify({
        payload: values,
        componentId: component.id,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((res) => res.json());
  };

  // Column Definitions: Defines & controls grid columns.
  const colDefs = [
    ...component.inputs.map((input, index) => {
      return {
        field: input.name,
        valueGetter: (p) => {
          return p.data.payload[input.name];
        },
        valueSetter: (p) => {
          p.data.payload[input.name] = p.newValue;
          return true;
        },
        flex: 1,
        ...(index === 0 && {
          checkboxSelection: true,
          headerCheckboxSelection: true,
        }),
      };
    }),

    // RESULT COLUMN
    {
      headerName: 'Response',
      field: '_result',
      flex: 1,
      editable: false,
      valueGetter: (p) => {
        return p.data.result;
      },
      cellRenderer: ResponseCellRenderer,
      cellRendererParams: {
        isRunning: isJobRunning,
      },
    },

    // ACTION COLUMN
    {
      headerName: 'Action',
      editable: false,

      cellRenderer: ActionCellRenderer,
      cellRendererParams: {
        isRunning: isJobRunning,
        completedIds: currJobQuery.data?.job?.completedIds,
        inputs,
        fetchSkill,
        setRowData,
      },
    },
  ];

  const handleAddRow = () => {
    // Add a new row to the grid
    setRowData([
      {
        payload: inputs.reduce(
          (acc, input) => ({
            ...acc,
            [input.name]: '',
          }),
          {},
        ),
        id: URL.createObjectURL(new Blob()).split('/').pop(),
      },
      ...rowData,
    ]);
  };

  // Apply settings across all columns
  const defaultColDef = useMemo(
    () => ({
      filter: true,
      editable: true,
    }),
    [],
  );

  // #region Handlers
  const handleDeleteSelectedRows = () => {
    // Delete the selected rows from the grid
    const newRows = rowData.filter((row) => !selectedRowsIds.includes(row.id));
    setRowData((prev) => prev.filter((row) => !selectedRowsIds.includes(row.id)));
    setSelectedRowsIds([]);
    // saveLocalStorageState(newRows);
  };

  const handleRunAll = async () => {
    try {
      setIsSubmittingJob(true);

      const resettedRowData = rowData.map((row) => ({
        payload: row.payload,
      }));

      const res = await fetch(`/api/page/agent_settings/ai-agent/${agentId}/bulk-calls/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          componentId: component.id,
          rows: resettedRowData,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to run bulk skill call');
      }

      handleResetResponseColumn();
      setIsJobRunning(true);
      queryClient.setQueryData(['bulk_skill_call_job'], null);
      currJobQuery.refetch(); // start polling for job status

      toast.info('Your bulk operation is now underway!', {
        hideProgressBar: true,
        autoClose: 10_000,
      });
      if (planName == 'SmythOS Free') {
        toast.info(
          <div>
            <p>
              Note: As part of our free plan, there may be some delays between executions. Upgrade
              your plan for instant processing!
              <a
                href="https://smythos.com/pricing"
                target="_blank"
                className="text-blue-500 underline"
              >
                {' '}
                Learn more
              </a>
            </p>
          </div>,
          {
            hideProgressBar: true,
            autoClose: 10_000,
          },
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error?.error?.message ||
          'An error occurred while processing your request. Please try again later.',
      );
    } finally {
      setIsSubmittingJob(false);
    }
  };

  const handleCsvUpload = async (data: any) => {
    const validPayload = data
      .map((d) => keysToLower(d))
      .filter((d) => {
        // Filter out rows that does not have any matching column
        return inputs.map((i) => i.name).some((i) => !isNil(d[i]));
      });

    if (validPayload.length <= 0) {
      toast.error('No valid data found in the CSV file.');
      return;
    }
    const newRows = validPayload.map((payload) => ({
      payload,
      id: URL.createObjectURL(new Blob()).split('/').pop(),
    }));

    setRowData((prev) => [...prev, ...newRows]);
  };

  const handleExport = async () => {
    // if (!grid.current) return;
    // const api = grid.current.api;
    // api.exportDataAsCsv({
    //     fileName: `bulk-skill-call-${agentId}-${new Date().toISOString()}.csv`,
    //     columnKeys: [...inputs.map((i) => i.name), '_result'],
    // });
    const Papa = await import('papaparse');
    const payloadsWithResults = rowData.map((row) => ({ ...row.payload, _result: row.result }));
    // Convert JSON data to CSV
    const csv = Papa.unparse(payloadsWithResults);
    // Create a blob link to download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `bulk-skill-call-${agentId}-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    // Clean up and remove the link
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const handleResetResponseColumn = () => {
    setRowData((prev) => {
      return prev.map((row) => {
        row.result = null;
        return row;
      });
    });
  };
  // #endregion

  const tableUpperToolbarButtons = [
    {
      content: (
        <>
          <MdDelete />
          <p>Delete</p>
        </>
      ),
      onClick: handleDeleteSelectedRows,
      isDisabled: selectedRowsIds.length <= 0,
    },
    {
      // Reset response column btn
      content: (
        <>
          <BiReset />
          <p title="reset the response column for all rows">Reset</p>
        </>
      ),
      onClick: handleResetResponseColumn,
      isDisabled: false,
    },

    {
      content: (
        <>
          {isSubmittingJob ? (
            <>
              <Spinner classes="w-4 h-4" />
              <p>Run in Bulk</p>
            </>
          ) : (
            <>
              <VscRunAll />

              <p>Run in Bulk</p>
            </>
          )}
        </>
      ),
      onClick: handleRunAll,
      isDisabled: rowData.length <= 0,
    },
    {
      content: (
        <>
          <BiExport />
          <p>Export</p>
        </>
      ),
      onClick: handleExport,
      isDisabled: rowData.length <= 0,
    },
    {
      content: (
        <>
          <IoMdAdd />
          <p>Add Row</p>
        </>
      ),
      onClick: handleAddRow,
      isDisabled: false,
    },
  ];

  const handleStopJob = async () => {
    // Stop the job if the job.createdAt is 5 mins at least behind

    if (!canCancelJob || isCancelingJob) {
      toast.error('You can only stop a job that has been running for at least 1 minute.');
      return;
    }

    try {
      setIsCancelingJob(true);
      const res = await fetch(
        `/api/page/agent_settings/ai-agent/${agentId}/bulk-calls/?componentId=${component.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      if (!res.ok) {
        throw new Error('Failed to stop the job');
      }

      setIsJobRunning(false);
      toast.info('Bulk job stopped successfully!');
    } catch (error) {
      console.error(error);
      toast.error(
        error?.error?.message ||
          'An error occurred while processing your request. Please try again later.',
      );
    } finally {
      setIsCancelingJob(false);
    }
  };

  return (
    <div className=" h-[70vh]">
      {!isJobRunning && !isLoadingTableData && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold">Run "{component.title}" on your data</h2>
          <p className="mt-[10px]">
            Using our Table Data feature, you can now run agents in bulk on tables of data.
          </p>
          <UploadDataBtn onUpload={handleCsvUpload} />
        </div>
      )}

      {isJobRunning && (
        <div className="flex items-center gap-2 justify-center mb-6 py-4">
          <Spinner classes="w-6 h-6" />
          <p className="text-lg">Processing bulk job...</p>
          {canCancelJob && (
            <button
              onClick={handleStopJob}
              disabled={isCancelingJob}
              className="text-red-500 underline font-semibold"
            >
              Stop Job
            </button>
          )}
        </div>
      )}

      {!isLoadingTableData && (
        <div className="flex justify-end mb-2 gap-5 flex-wrap">
          {tableUpperToolbarButtons.map((button, index) => (
            <button
              key={index}
              onClick={(e) => {
                if (button.isDisabled || isJobRunning) return;
                button.onClick();
              }}
              disabled={button.isDisabled || isJobRunning}
              className="flex items-center gap-1 text-base"
            >
              {button.content}
            </button>
          ))}
        </div>
      )}

      <div
        className={classNames('ag-theme-quartz', isLoadingTableData ? 'hidden' : '')}
        id="ag-grid-internal-id"
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={<div>Loading...</div>}>
          <AgGridReact
            rowData={rowData}
            // @ts-ignore
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            pagination={true}
            paginationPageSize={30}
            rowSelection="multiple"
            suppressScrollOnNewData={true}
            suppressRowClickSelection
            paginationPageSizeSelector={false}
            ref={grid}
            onSelectionChanged={(event) => {
              setSelectedRowsIds(event.api.getSelectedRows().map((row: { id: any }) => row.id));
            }}
            // onRowDataUpdated={(e) => {
            //     saveLocalStorageState({ rowData, LS_KEY });
            // }}
            // onCellValueChanged={(e) => {
            //     saveLocalStorageState({ rowData, LS_KEY });
            // }}
          />
        </Suspense>
      </div>
      {isLoadingTableData && (
        <div className="w-full h-full flex items-center justify-center">
          <Spinner />
        </div>
      )}
    </div>
  );
};

export default BulkSkillCallForm;
