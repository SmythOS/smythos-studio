import { schedulerCacheKeys } from '@react/features/agent-settings/components/ScheduleWidget/meta/cache-keys';
import { calculateDelay } from '@react/features/agent-settings/components/ScheduleWidget/meta/helpers';
import ChooseName from '@react/features/agent-settings/components/ScheduleWidget/modes/create/steps/ChooseName';
import EndpointInputsFillForm from '@react/features/agent-settings/components/ScheduleWidget/modes/create/steps/EndpointInputsFillForm';
import EndpointSelection from '@react/features/agent-settings/components/ScheduleWidget/modes/create/steps/EndpointSelection';
import EventKickOff from '@react/features/agent-settings/components/ScheduleWidget/modes/create/steps/EventKickOff';
import EventOccurences from '@react/features/agent-settings/components/ScheduleWidget/modes/create/steps/EventOccurences';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { Spinner } from '@react/shared/components/ui/spinner';
import { queryClient } from '@react/shared/query-client';
import { CreateAgentScheduledJobRequest } from '@react/shared/types/api-payload.types';
import { AgentScheduledJob } from '@react/shared/types/api-results.types';
import { extractError } from '@react/shared/utils/errors';
import { EVENTS } from '@shared/posthog/constants/events';
import { PostHog } from '@src/shared/posthog';
import { useMutation } from '@tanstack/react-query';
import { Ref, useEffect, useRef, useState } from 'react';

type Props = {
  changeView: (id: 'LIST' | 'EDIT' | 'CREATE', data: { job?: AgentScheduledJob }) => void;
};

export interface CronPatternDetails {
  daysOfWeek: number[];
  repeatEveryUnit: 'min' | 'hour' | 'week';
  repeatEvery: number;
  startDate: string;
}

export type SchedulerFormData = {
  name?: string;
  componentId?: string;
  agentId?: string;
  body?: object;

  shouldRepeat: boolean;
  startDate?: string;
  repeatLimit?: number;
  endDate?: string;
  endOption?: 'never' | 'on-after-occurrences' | 'on-date';
} & Partial<CronPatternDetails>;

const CreateSchedule = ({ changeView }: Props) => {
  const { agentId, latestAgentDeploymentQuery } = useAgentSettingsCtx();
  const coreSteps = [
    { title: 'Choose Endpoint', component: EndpointSelection },
    { title: 'Endpoint Inputs', component: EndpointInputsFillForm },
    { title: 'Date and Time', component: EventKickOff },
    { title: 'Repeat', component: EventOccurences },
    { title: 'Choose A Name', component: ChooseName },
  ];

  const [formData, setFormData] = useState<SchedulerFormData>({
    agentId: agentId,
    shouldRepeat: false,
  });

  const [steps, setSteps] = useState(coreSteps);
  const [currStep, setCurrStep] = useState(0);
  const [stepsValdity, setStepsValidy] = useState<boolean[]>(
    Array(Object.keys(steps).length).fill(false),
  );
  const StepComponent = Object.values(steps)[currStep].component;
  const stepIsValid = stepsValdity[currStep];
  const stepRef = useRef<StepChildMethods>(null);
  const stepHolderRef = useRef<HTMLDivElement>(null);

  const [submitNow, setSubmitNow] = useState(false);

  const addScheduleMutation = useMutation({
    mutationFn: (data: CreateAgentScheduledJobRequest) =>
      fetch('/api/page/agent_settings/jobs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    mutationKey: ['add_schedule', agentId],
  });

  const submitForm = async () => {
    if (!latestAgentDeploymentQuery.isSuccess) return;

    const isOneTimeJob = !formData.shouldRepeat;
    const options: CreateAgentScheduledJobRequest['options'] = {};

    if (!isOneTimeJob) {
      const {
        daysOfWeek,
        repeatEveryUnit,
        repeatEvery,
        startDate,
        endDate,
        repeatLimit,
        endOption,
      } = formData;
      options['repeat'] = {
        patternDetails: {
          daysOfWeek,
          repeatEveryUnit,
          repeatEvery,
        },
        startDate,
      };
      if (endOption == 'on-after-occurrences') {
        options['repeat']['limit'] = repeatLimit;
      } else if (endOption == 'on-date') {
        options['repeat']['endDate'] = endDate;
      }
    } else {
      options['delay'] = calculateDelay(formData.startDate);
    }

    const data: CreateAgentScheduledJobRequest = {
      jobType: 'AGENT_SCHEDULE',
      name: formData.name,
      data: {
        componentId: formData.componentId,
        agentId: formData.agentId,
        body: formData.body || {},
      },
      options,
    };

    try {
      const newJobRes = await addScheduleMutation.mutateAsync(data);
      const newJobResJson = await newJobRes.json();
      if (newJobResJson?.job) {
        queryClient.setQueryData(
          schedulerCacheKeys.getScheduleListKey(agentId),
          (oldData: { jobs: AgentScheduledJob[] }) => {
            return { jobs: [...oldData.jobs, newJobResJson.job] };
          },
        );
      } else {
        queryClient.invalidateQueries(schedulerCacheKeys.getScheduleListKey(agentId));
      }
      PostHog.track(EVENTS.AGENT_SETTINGS_EVENTS.app_add_new_work_schedule, {});
      changeView('LIST', {});
    } catch (error) {
      console.error('Error adding schedule:', error);
    }
  };

  useEffect(() => {
    if (submitNow) {
      submitForm();
      setSubmitNow(false); // Reset the trigger
    }
  }, [submitNow, formData]); // Dependency on formData ensures we're working with latest state

  // It was causing a bug on the builder page and causing layout issues. Uncomment if it can be fixed.
  // useEffect(
  //   function scrollToStepView() {
  //     const stepHolder = stepHolderRef.current;
  //     if (!stepHolder) return;

  //     stepHolder.scrollIntoView({ behavior: 'smooth', block: 'start' });
  //   },
  //   [currStep],
  // );

  const stepProps: StepProps = {
    actions: {
      handleFormDataChange(data: SchedulerFormData) {
        setFormData((prev) => ({ ...prev, ...data }));
      },
      setCanSubmit: (isValid: boolean) =>
        setStepsValidy((prev) => prev.map((_, i) => (i === currStep ? isValid : prev[i]))),
      // setSubmitBtnVisibility,

      nextStep: () => {
        if (currStep === Object.keys(steps).length - 1) {
          setSubmitNow(true);
        } else {
          setCurrStep((prev) => prev + 1);
        }
      },

      removeStepByTitle: (title: string) => {
        const newSteps = steps.filter((step) => step.title !== title);
        setSteps(newSteps);
      },
    },

    formData: formData,
  };

  if (latestAgentDeploymentQuery.isLoading) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <Spinner classes="w-12 h-12" />
      </div>
    );
  }

  if (latestAgentDeploymentQuery.isError) {
    return (
      <div className="text-red-500 text-sm text-center">
        An error occurred while fetching agent data.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6" ref={stepHolderRef}>
        {<StepComponent {...stepProps} ref={stepRef} />}
      </div>

      {addScheduleMutation.isError && (
        <div className="mb-3 text-red-500 text-sm text-center">
          {extractError(addScheduleMutation.error) ||
            'An error occurred while adding the schedule.'}
        </div>
      )}

      <div className="m-auto flex justify-end w-full items-center">
        {currStep > 0 ? (
          <button
            onClick={() => {
              if (currStep === 0) return;

              stepRef.current?.handleBeforeStepChange &&
                stepRef.current?.handleBeforeStepChange(currStep - 1);
              setCurrStep((prev) => prev - 1);
            }}
            disabled={currStep === 0}
            className="mt-4 bg-transparent text-sm text-gray-400 font-semibold"
          >
            Back
          </button>
        ) : (
          <button
            className="mt-4 bg-transparent text-sm  text-gray-400 font-semibold "
            onClick={() => {
              console.log('Cancel');
              changeView('LIST', {});
            }}
            // disabled={isSubmitting}
            // loading={isSubmitting}
          >
            Cancel
          </button>
        )}

        {currStep < Object.keys(steps).length - 1 ? (
          <button
            onClick={() => {
              stepRef.current?.handleBeforeStepChange &&
                stepRef.current?.handleBeforeStepChange(currStep + 1);

              if (stepRef.current?.handleNextClick) {
                const isStepValid = stepRef.current.handleNextClick();
                if (!isStepValid) return;
              }

              if (!stepIsValid || currStep === Object.keys(steps).length - 1) return;
              setCurrStep((prev) => prev + 1);
            }}
            disabled={currStep === Object.keys(steps).length - 1 || !stepIsValid}
            className="mt-4 bg-transparent text-sm text-v2-blue ml-5 font-semibold disabled:opacity-50 "
          >
            Next
          </button>
        ) : (
          <div className="ml-5">
            {addScheduleMutation.isLoading && <Spinner classes="w-4 h-4 fill-v2-blue mr-1" />}
            <button
              className="mt-4 bg-transparent text-sm text-v2-blue font-semibold  disabled:opacity-50 "
              onClick={() => {
                stepRef.current?.handleBeforeStepChange &&
                  stepRef.current?.handleBeforeStepChange(currStep + 1);
                if (stepRef.current?.handleNextClick) {
                  const isStepValid = stepRef.current.handleNextClick();
                  if (!isStepValid) return;
                }
                if (!stepIsValid) return;

                // handleFormSubmit();
                setSubmitNow(true);
              }}
              disabled={!stepIsValid || addScheduleMutation.isLoading}
              // loading={isSubmitting}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export type StepChildMethods = {
  handleNextClick?: () => boolean;
  handleBeforeStepChange?: (newStep: number) => void;
};

export type StepProps = {
  actions: {
    handleFormDataChange: (data: Partial<SchedulerFormData>) => void;
    setCanSubmit: (isValid: boolean) => void;
    // setSubmitBtnVisibility?: (isVisible: boolean) => void;
    nextStep: () => void;
    removeStepByTitle: (title: string) => void;
  };
  formData: SchedulerFormData;
  ref?: Ref<StepChildMethods>;
};

export default CreateSchedule;
