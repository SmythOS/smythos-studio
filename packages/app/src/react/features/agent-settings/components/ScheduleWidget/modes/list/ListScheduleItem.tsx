import { schedulerCacheKeys } from '@react/features/agent-settings/components/ScheduleWidget/meta/cache-keys';
import { getCronReadableStr } from '@react/features/agent-settings/components/ScheduleWidget/meta/helpers';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { queryClient } from '@react/shared/query-client';
import { AgentScheduledJob } from '@react/shared/types/api-results.types';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useMutation } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { FiTrash } from 'react-icons/fi';
import { toast } from 'react-toastify';

type Props = {
  changeView: (id: 'LIST' | 'EDIT' | 'CREATE' | 'INFO', data: { job?: AgentScheduledJob }) => void;
  job: AgentScheduledJob;
};

const ListScheduleItem = ({ changeView, job }: Props) => {
  const [currTempStatus, setCurrTempStatus] = React.useState(job.status);

  const { agentQuery, agentId } = useAgentSettingsCtx();
  const jobDeleteMutation = useMutation({
    mutationFn: () => fetch(`/api/page/agent_settings/jobs/${job.id}`, { method: 'DELETE' }),
    mutationKey: ['delete_job', job.id],
  });

  const [jobDisplayName, setJobDisplayName] = React.useState(job.name || 'Untitled Routine');

  useEffect(() => {
    async function getCronStr() {
      if (!job.options.repeat?.pattern || job.name) return;
      const cronStr = await getCronReadableStr(job.options.repeat.pattern, true);
      setJobDisplayName(cronStr);
    }
    getCronStr();
  }, []);

  const changeJobStatusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'PAUSED') =>
      fetch(`/api/page/agent_settings/jobs/${job.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
  });

  const handleStatusChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const status = e.target.checked ? 'ACTIVE' : 'PAUSED';
    try {
      await changeJobStatusMutation.mutateAsync(status);
      try {
        queryClient.setQueryData(
          schedulerCacheKeys.getScheduleListKey(agentId),
          (oldData: { jobs: AgentScheduledJob[] }) => {
            return {
              jobs: oldData?.jobs.map((j) => {
                if (j.id === job.id) {
                  return { ...j, status };
                }
                return j;
              }),
            };
          },
        );
      } catch (e) {}

      setCurrTempStatus(status);
    } catch (e) {
      toast.error('Failed to update job status');
    }
  };

  return (
    <div key={job.id} className="flex items-center justify-between">
      <button
        onClick={() => {
          // navigate to info page of the job
          changeView('INFO', { job });
        }}
      >
        <p className="flex-1 text-sm">{jobDisplayName}</p>
      </button>

      <div className="flex items-center">
        <div className="mr-2">
          {jobDeleteMutation.isLoading ? (
            <Spinner classes="w-4 h-4 fill-primary-500" />
          ) : (
            <button
              className="text-[#3E3E3E]"
              onClick={async () => {
                try {
                  await jobDeleteMutation.mutateAsync();
                  queryClient.setQueryData(
                    schedulerCacheKeys.getScheduleListKey(agentId),
                    (oldData: { jobs: AgentScheduledJob[] }) => {
                      return {
                        jobs: oldData?.jobs ? oldData.jobs.filter((j) => j.id !== job.id) : [],
                      };
                    },
                  );
                } catch (e) {
                  toast.error('Failed to delete job');
                }
              }}
            >
              <FiTrash />
            </button>
          )}
        </div>

        {/* <button className="text-[#3E3E3E]">
            <img src="/img/icons/Edit-gray.svg" className="w-4 h-4 mr-2" alt="edit" />
        </button> */}

        {changeJobStatusMutation.isLoading ? (
          <Spinner classes="w-4 h-4 fill-primary-500 mx-2" />
        ) : (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              value=""
              checked={currTempStatus === 'ACTIVE'}
              disabled={changeJobStatusMutation.isLoading}
              onChange={handleStatusChange}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
          </label>
        )}
      </div>
    </div>
  );
};

export default ListScheduleItem;
