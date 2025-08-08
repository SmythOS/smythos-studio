import { schedulerCacheKeys } from '@react/features/agent-settings/components/ScheduleWidget/meta/cache-keys';
import ListScheduleItem from '@react/features/agent-settings/components/ScheduleWidget/modes/list/ListScheduleItem';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { AgentScheduledJob } from '@react/shared/types/api-results.types';
import { useQuery } from '@tanstack/react-query';
import { Tooltip } from 'flowbite-react';
import { Info } from 'lucide-react';

type Props = {
  changeView: (id: 'LIST' | 'EDIT' | 'CREATE', data: { job?: AgentScheduledJob }) => void;
};

const ListSchedules = ({ changeView }: Props) => {
  const { agentQuery, agentId, latestAgentDeploymentQuery } = useAgentSettingsCtx();

  const jobsQuery = useQuery({
    queryKey: schedulerCacheKeys.getScheduleListKey(agentId),
    queryFn: () =>
      fetch(`/api/page/agent_settings/jobs/agents/${agentId}`).then(
        (res) => res.json() as Promise<{ jobs: AgentScheduledJob[] }>,
      ),
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const isAgentHasDeployment =
    latestAgentDeploymentQuery.isSuccess &&
    !latestAgentDeploymentQuery.isError &&
    latestAgentDeploymentQuery.data?.deployment !== null;
  return (
    <div className="flex justify-between items-center flex-col ">
      <div className="w-full">
        <h3 className="flex items-center gap-2 font-semibold mb-2 text-sm">
          Schedule
          <Tooltip
            className="w-52 text-center"
            content="Plan and automate task execution with agent work scheduler."
          >
            <Info className="w-4 h-4" />
          </Tooltip>
        </h3>
      </div>

      <div className="mt-2 w-full">
        {(jobsQuery.isLoading || latestAgentDeploymentQuery.isLoading) && (
          <div className="flex flex-col gap-3 w-full mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )}

        {jobsQuery.isSuccess &&
          jobsQuery.data?.jobs.filter((job) => job.status !== 'DELETED').length === 0 &&
          isAgentHasDeployment && (
            <div className="text-gray-500 text-sm text-center mt-3">No scheduled jobs</div>
          )}

        {jobsQuery.isError && (
          <div className="text-red-500 text-sm text-center">Failed to fetch scheduled jobs</div>
        )}

        <div className="flex flex-col gap-3 w-full max-h-[145px] overflow-y-auto mt-4 p-1">
          {jobsQuery.isSuccess &&
            isAgentHasDeployment &&
            jobsQuery.data?.jobs
              .filter((job) => job.status !== 'DELETED') // Filter out deleted jobs
              .map((job) => <ListScheduleItem key={job.id} job={job} changeView={changeView} />)}

          {jobsQuery.isSuccess &&
            !latestAgentDeploymentQuery.isLoading &&
            !isAgentHasDeployment && (
              <div className="h-[394px] flex items-center justify-center">
                <p className="text-gray-500 text-sm">Please deploy your agent to schedule a job</p>
              </div>
            )}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => {
              if (!isAgentHasDeployment) return;
              changeView('CREATE', {});
            }}
            className="rounded-md flex items-center disabled:opacity-50"
            disabled={!isAgentHasDeployment}
          >
            <img src="/img/icons/Edit-blue.svg" className="w-4 h-4 mr-2" alt="edit" />
            <p className="text-[#1A73E8] text-sm font-semibold">Add New</p>
          </button>
        </div>
      </div>
    </div>
  );
};

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between animate-pulse">
      <div className="h-3 bg-gray-200 rounded-sm dark:bg-gray-700 w-1/2"></div>
      <div className="h-3 bg-gray-200 rounded-sm dark:bg-gray-700 w-1/4"></div>
    </div>
  );
}

export default ListSchedules;
