import { UserSettingsKey } from '@src/backend/types/user-data';
import { useOnboarding } from '@src/react/features/agents/contexts/OnboardingContext';
import useMutateOnboardingData from '@src/react/features/onboarding/hooks/useMutateOnboardingData';
import { OnboardingTaskProps, OnboardingTaskType } from '@src/react/shared/types/onboard.types';
import { Analytics } from '@src/shared/posthog/services/analytics';
import classNames from 'classnames';
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// Use React.memo to prevent unnecessary re-renders of the TaskCard component
const TaskCard = React.memo(
  ({
    handleClick,
    icon,
    title,
    description,
    completed,
  }: {
    handleClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    icon: string;
    title: string;
    description: string;
    completed: boolean;
  }) => {
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      // Set the image source only once when the component mounts
      if (imgRef.current) {
        imgRef.current.src = icon;
      }
    }, [icon]);

    return (
      <div
        onClick={handleClick}
        className={classNames(
          'relative border border-solid flex items-start rounded-lg p-3 gap-2 bg-[#F9FAFB] border-[#D1D5DB] group hover:border-v2-blue hover:shadow-md cursor-pointer h-[120px]',
        )}
      >
        <div className="flex flex-col w-full">
          <img ref={imgRef} width={23} height={23} alt="onboarding-task" loading="lazy" />
          <h3 className={classNames('font-medium', 'text-base', 'my-1', 'text-[#0F172A]')}>
            {title}
          </h3>
          <p className={classNames('text-sm text-[#6B7280] max-w-[95%]')}>{description}</p>
          {completed && (
            <span className="mif-checkmark text-sm text-v2-blue absolute top-0 right-0"></span>
          )}
        </div>
        <span className="mif-arrow-right text-[#6B7280] text-sm group-hover:text-v2-blue absolute bottom-4 right-4"></span>
      </div>
    );
  },
);

const OnboardingTask = ({
  title,
  description,
  completed,
  buttons,
  type,
  icon,
}: OnboardingTaskProps) => {
  const saveUserSettingsMutation = useMutateOnboardingData();
  const { setTaskCompleted, setInviteMemberModalOpen } = useOnboarding();

  const completeTask = (button) => {
    const effectiveType = button.type || type;
    saveUserSettingsMutation.mutate({
      key: UserSettingsKey.OnboardingTasks,
      data: { [effectiveType]: true, [OnboardingTaskType.COMPLETED_TASK]: effectiveType },
      operation: 'insertOrUpdate',
    });
    setTaskCompleted(type);
    Analytics.track(`onboarding_task_${type}`, { action: `${button?.label?.toLowerCase()}` });
  };

  const handleClick = () => {
    if (buttons[0].completeOnClick) {
      completeTask(buttons[0]);
    }
  };

  const handleInviteTeamMembers = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setInviteMemberModalOpen(true);
  };

  if (type === OnboardingTaskType.INVITE_TEAM_MEMBERS) {
    return (
      <TaskCard
        handleClick={handleInviteTeamMembers}
        icon={icon}
        title={title}
        description={description}
        completed={completed}
      />
    );
  }

  return (
    <Link
      to={buttons[0].link}
      target={buttons[0].external ? '_blank' : undefined}
      onClick={handleClick}
    >
      <TaskCard icon={icon} title={title} description={description} completed={completed} />
    </Link>
  );
};

export default OnboardingTask;
