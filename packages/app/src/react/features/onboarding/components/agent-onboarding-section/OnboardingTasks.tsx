import { useOnboarding } from '@src/react/features/agents/contexts/OnboardingContext';
import OnboardingTask from '@src/react/features/onboarding/components/agent-onboarding-section/OnboardingTask';
import CreateMemberModal from '@src/react/features/teams/modals/create-member';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { OnboardingTaskType } from '@src/react/shared/types/onboard.types';
import { Suspense, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { GoChevronDown } from 'react-icons/go';

const ProgressBar = ({ progress }): JSX.Element => {
  return (
    <div className="w-full h-1 bg-v2-gray-light rounded-full relative mb-4">
      <div
        className="h-full bg-v2-blue rounded-full flex items-center justify-center transition-all"
        style={{ width: progress > 0 ? `${progress}%` : '0px' }}
      ></div>
    </div>
  );
};

// Extracted ChecklistHeader component for better readability
const ChecklistHeader = ({ progress, isChecklistVisible, onToggleChecklist, onDismiss }) => (
  <div className="flex items-center">
    <h3 className="text-lg font-medium text-[#424242]">
      Getting Started with SmythOS <span className="text-v2-blue font-normal">({progress}%)</span>
    </h3>
    <GoChevronDown
      size={24}
      className={`ml-2 cursor-pointer text-[#616161] transition-transform duration-300 ${
        isChecklistVisible ? 'rotate-180' : ''
      }`}
      onClick={onToggleChecklist}
    />
    {progress === 100 && (
      <button className="ml-auto text-gray-600" onClick={onDismiss}>
        Dismiss checklist
      </button>
    )}
  </div>
);

export const OnboardingTasks = ({ onDismiss }: { onDismiss: () => void }) => {
  // Always call all hooks first, regardless of any conditional logic
  const { tasks, isOnboardLoading, isInviteMemberModalOpen, setInviteMemberModalOpen } =
    useOnboarding();

  const [isChecklistVisible, setIsChecklistVisible] = useState(
    (window?.localStorage?.getItem('showOnboardingChecklist') ?? 'true') === 'true',
  );

  // Memoize progress calculation
  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
  }, [tasks]);

  // Memoize the task list rendering
  const taskList = useMemo(() => {
    return tasks
      .sort((a, b) => (a.completed ? 1 : b.completed ? -1 : 0))
      .map((task) => (
        <div key={task.title} className="h-full">
          <OnboardingTask {...task} />
        </div>
      ));
  }, [tasks]);

  // Memoize the toggle function to prevent unnecessary re-renders
  const onToggleChecklist = useMemo(() => {
    return () => {
      setIsChecklistVisible(!isChecklistVisible);
      window?.localStorage?.setItem('showOnboardingChecklist', (!isChecklistVisible).toString());
    };
  }, [isChecklistVisible]);

  // Early return for loading state
  if (isOnboardLoading) {
    return (
      <div className="flex justify-center items-center">
        <div className="circular-loader" />
      </div>
    );
  }

  // Check if we should show the onboarding tasks
  const shouldShowOnboarding =
    tasks && !tasks[OnboardingTaskType.ONBOARDING_LIST_DISMISSED] && progress < 100;

  // Don't render anything if conditions aren't met
  if (!shouldShowOnboarding) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 mb-20">
      <ChecklistHeader
        progress={progress}
        isChecklistVisible={isChecklistVisible}
        onToggleChecklist={onToggleChecklist}
        onDismiss={onDismiss}
      />

      <ProgressBar
        progress={tasks ? (tasks.filter((task) => task.completed).length / tasks.length) * 100 : 0}
      />

      {isChecklistVisible && (
        <div className="grid grid-cols-4 gap-4 max-sm:grid-cols-1 max-lg:grid-cols-2 grid-auto-rows-1">
          {taskList}
        </div>
      )}

      {isInviteMemberModalOpen &&
        createPortal(
          <Suspense fallback={<Spinner />}>
            <CreateMemberModal onClose={() => setInviteMemberModalOpen(false)} />
          </Suspense>,
          document.body,
        )}
    </div>
  );
};
