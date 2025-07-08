import { getCronReadableStr, timeAfter, timeAgo } from '@react/features/agent-settings/components/ScheduleWidget/meta/helpers';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { AgentScheduledJob } from '@react/shared/types/api-results.types';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'flowbite-react';
import React, { useEffect } from 'react';
import { GoLog } from 'react-icons/go';
import { HiArrowNarrowRight, HiCalendar } from 'react-icons/hi';
import { MdArrowBackIos } from 'react-icons/md';

type Props = {
  changeView: (id: 'LIST' | 'EDIT' | 'CREATE' | 'INFO', data: { job?: AgentScheduledJob }) => void;
  contextData: { job?: AgentScheduledJob };
};

const ScheduleInfoView = (props: Props) => {
  const { agentId, agentQuery } = useAgentSettingsCtx();
  const jobQuery = useQuery({
    queryKey: ['agent_routine_job', props.contextData.job?.id],
    queryFn: () =>
      fetch(`/api/page/agent_settings/jobs/${props.contextData.job?.id}`).then((res) =>
        res.json(),
      ) as Promise<{ job: AgentScheduledJob }>,
    refetchInterval: 10_000, // 10 seconds
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    cacheTime: 0,
  });

  const matchingComponent = agentQuery.data?.data.components.find(
    (component) => component.id === props.contextData.job?.componentId,
  );

  const [jobDisplayName, setJobDisplayName] = React.useState<string>('');

  // e.g { '2022-01-01': [log1, log2], '2022-01-02': [log3, log4] }
  const triggersGroupedByDay = jobQuery.data?.job?.jobLogs
    ? jobQuery.data.job.jobLogs
        .filter((log) => typeof log !== 'string')
        .reduce(
          (acc, log) => {
            const date = Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).format(new Date(log.timestamp));
            if (!acc[date]) {
              acc[date] = [];
            }
            acc[date].push(log);

            // show the most recent logs first
            acc[date].sort((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? -1 : 1));
            return acc;
          },
          {} as Record<string, AgentScheduledJob['jobLogs']>,
        )
    : ({} as Record<string, AgentScheduledJob['jobLogs']>);

  const triggersArray = Object.entries(triggersGroupedByDay)
    .map(([date, logs]) => {
      return {
        date,
        triggers: logs,
      };
    })
    .sort((a, b) => (new Date(a.date) > new Date(b.date) ? -1 : 1));

  if (jobQuery.isError) {
    return <div className="text-sm text-gray-600 dark:text-white">Failed to load job info</div>;
  }

  const loadingTabContent = (
    <div className="flex justify-center items-center h-40">
      <Spinner classes="fill-v2-blue w-8 h-8" />
    </div>
  );

  useEffect(() => {
    if (jobQuery.isLoading || jobQuery.isError || !jobQuery.data) return;

    async function fetchJobDisplayName() {
      setJobDisplayName(jobQuery.data.job?.name || 'Untitled Routine');

      if (jobQuery.data.job.options?.repeat?.pattern) {
        const patternReadable = await getCronReadableStr(
          jobQuery.data.job.options.repeat.pattern,
          true,
        );
        setJobDisplayName(`${jobQuery.data.job.name || 'Untitled Routine'} (${patternReadable})`);
      }
    }

    fetchJobDisplayName();
  }, [jobQuery.isLoading, jobQuery.isError, jobQuery.data]);

  return (
    <div className="max-h-[350px] overflow-y-auto px-2">
      <div className="flex items-center mb-4 justify-between">
        <button
          className="flex items-center text-sm text-gray-600 dark:text-white font-semibold"
          onClick={() => props.changeView('LIST', {})}
        >
          <MdArrowBackIos className="text-lg mr-1" />
          {props.contextData.job?.name || 'Job Info'}
        </button>

        {jobQuery.isRefetching && <Spinner classes="w-4 h-4 fill-v2-blue" />}
      </div>

      <Tabs aria-label="Routine job info tabs" style="underline" color="#1A73E8">
        <Tabs.Item active title="Info">
          {jobQuery.isLoading && loadingTabContent}

          {jobQuery.isSuccess && jobQuery.data && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <HiArrowNarrowRight className="text-lg text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-600 dark:text-white">{jobDisplayName}</p>
              </div>

              {/* the endpoint  */}
              <div className="flex items-center gap-2">
                <HiArrowNarrowRight className="text-lg text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-600 dark:text-white">
                  Endpoint:{' '}
                  {matchingComponent ? (
                    ` ${matchingComponent?.title} (/${matchingComponent?.data?.endpoint})`
                  ) : (
                    <span>Not found</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <HiCalendar className="text-lg text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-600 dark:text-white">
                  Created on{' '}
                  {Intl.DateTimeFormat('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(new Date(jobQuery.data.job.createdAt))}
                </p>
              </div>

              {/* Next trigger */}
              {jobQuery.data.job.nextRunAt && (
                <div className="flex items-center gap-2">
                  <HiArrowNarrowRight className="text-lg text-gray-400 dark:text-gray-500" />
                  <p className="text-sm text-gray-600 dark:text-white">
                    {jobQuery.data.job.options?.repeat?.pattern ? 'Next trigger: ' : 'Scheduled: '}
                    {timeAfter(new Date(jobQuery.data.job.nextRunAt))}
                  </p>
                </div>
              )}

              {/* Previous trigger  (job.lastRunAt if available) */}
              {jobQuery.data.job.lastRunAt && (
                <div className="flex items-center gap-2">
                  <HiArrowNarrowRight className="text-lg text-gray-400 dark:text-gray-500" />
                  <p className="text-sm text-gray-600 dark:text-white">
                    {jobQuery.data.job.options?.repeat?.pattern ? 'Last trigger: ' : 'Ran at: '}
                    {timeAgo(new Date(jobQuery.data.job.lastRunAt))}
                  </p>
                </div>
              )}

              {/* Ends on info  (could be after X triggers or on a specific date) */}
              {jobQuery.data.job.options?.repeat?.endDate ? (
                <div className="flex items-center gap-2">
                  <HiArrowNarrowRight className="text-lg text-gray-400 dark:text-gray-500" />
                  <p className="text-sm text-gray-600 dark:text-white">
                    Ends on{' '}
                    {Intl.DateTimeFormat('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }).format(new Date(jobQuery.data.job.options.repeat.endDate))}
                  </p>
                </div>
              ) : jobQuery.data.job.options?.repeat?.limit ? (
                <div className="flex items-center gap-2">
                  <HiArrowNarrowRight className="text-lg text-gray-400 dark:text-gray-500" />
                  <p className="text-sm text-gray-600 dark:text-white">
                    Ends after {jobQuery.data.job.options.repeat.limit} triggers
                  </p>
                </div>
              ) : null}

              {/* Job status */}
            </div>
          )}
        </Tabs.Item>
        <Tabs.Item title="Triggers">
          {jobQuery.isLoading && loadingTabContent}
          <ol className="relative border-s border-gray-200 dark:border-gray-700 border-solid">
            {triggersArray.map((logGroup) => (
              <li className="mb-10 ms-4" key={Math.random().toString(36).substring(7)}>
                <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-gray-900 dark:bg-gray-700"></div>
                <time className="mb-4 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                  {Intl.DateTimeFormat('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(new Date(logGroup.date))}
                </time>

                <ul className="flex flex-col gap-2">
                  {logGroup.triggers.map((trigger) => (
                    <li
                      key={Math.random().toString(36).substring(7)}
                      className="flex items-center justify-between"
                    >
                      <p className="text-sm text-gray-600 dark:text-white flex items-center gap-2">
                        {trigger.isSuccessful ? (
                          <span>Job triggered successfully</span>
                        ) : (
                          <span className="text-red-500 dark:text-red-400">
                            Job failed to trigger
                          </span>
                        )}

                        {trigger.sessionTag && (
                          <a
                            href={`/logs/${agentId}/?tag=${trigger.sessionTag}`}
                            className="text-blue-500 dark:text-blue-400"
                          >
                            <GoLog className="text-sm" />
                          </a>
                        )}
                      </p>

                      <span className="text-sm text-gray-400 dark:text-gray-500">
                        {timeAgo(new Date(trigger.timestamp))}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}

            {triggersArray.length === 0 && !jobQuery.isLoading && (
              <div className="text-gray-500 text-sm text-center">No triggers recorded</div>
            )}
          </ol>
        </Tabs.Item>

        <Tabs.Item title="Logs">
          {jobQuery.isLoading && loadingTabContent}
          {/* <ol className="relative border-s border-gray-200 dark:border-gray-700 border-solid">
                        {logsArray.map((log) => (
                            <li className="mb-10 ms-4" key={Math.random().toString(36).substring(7)}>
                                <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-gray-900 dark:bg-gray-700"></div>
                                <time className="mb-2 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                                    {Intl.DateTimeFormat('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    }).format(new Date(log.date))}
                                </time>

                                <ul className="flex flex-col gap-2">
                                    {log.logs.map((log) => (
                                        <li key={Math.random().toString(36).substring(7)} className="flex items-center justify-between">
                                            <p className="text-sm text-gray-600 dark:text-white">{log.log}</p>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}

                        {logsArray.length === 0 && !jobQuery.isLoading && <div className="text-gray-500 text-sm text-center">No logs recorded</div>}
                    </ol> */}

          <div className="flex flex-col gap-2 justify-center mt-3">
            <a
              href={`/logs/${agentId}/?tag=schedule-run-${props.contextData.job?.id}`}
              className="text-blue-500 dark:text-blue-400 text-sm font-semibold text-center"
            >
              View in logs explorer
            </a>
          </div>
        </Tabs.Item>
      </Tabs>
    </div>
  );
};

export default ScheduleInfoView;
