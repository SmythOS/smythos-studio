/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { OnboardingTaskProps, OnboardingTaskType } from '@react/shared/types/onboard.types';
import { PRICING_PLANS_V4 } from '@src/react/shared/enums';
import { createContext, FC, ReactNode, useContext, useEffect, useState } from 'react';
import { useGetOnboardingData } from '../../onboarding/hooks/useGetUserOnboardingSettings';
import { onboardingTasks } from '../data/onboarding-tasks';

type OnboardingContextType = {
  isOnboardingCompleted: boolean;
  toggleOnboardingCompleted: () => void;

  isToastOpen: boolean;
  toggleToastOpen: () => void;

  isOnboardLoading: boolean;

  tasks: OnboardingTaskProps[];
  setTasks: (tasks: OnboardingTaskProps[]) => void;

  setTaskCompleted: (task: OnboardingTaskType) => void;
  lastCompletedTask: OnboardingTaskType | null;
  nextTask: OnboardingTaskType | null;

  isOnboardingDismissed: boolean;
  setOnboardingDismissed: (isOnboardingDismissed: boolean) => void;

  isInviteMemberModalOpen: boolean;
  setInviteMemberModalOpen: (isInviteMemberModalOpen: boolean) => void;

  isAssignMemberModalOpen: boolean;
  setAssignMemberModalOpen: (isAssignMemberModalOpen: boolean) => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { userInfo, loading } = useAuthCtx();
  const [isOnboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isToastOpen, setToastOpen] = useState(false);
  const { data: userSettings, isLoading } = useGetOnboardingData({
    options: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    },
  });
  const [tasks, setTasks] = useState<OnboardingTaskProps[]>([]);
  const [lastCompletedTask, setLastCompletedTask] = useState<OnboardingTaskType | null>(null);
  const [nextTask, setNextTask] = useState<OnboardingTaskType | null>(null);
  const [isOnboardingDismissed, setOnboardingDismissed] = useState(false);
  const [isOnboardingFinished, setIsOnboardingFinished] = useState(false);
  const [isInviteMemberModalOpen, setInviteMemberModalOpen] = useState(false);
  const [isAssignMemberModalOpen, setAssignMemberModalOpen] = useState(false);

  const setTasksWrapper = (tasks: OnboardingTaskProps[]) => {
    setTasks(tasks);
    if (areTasksCompleted(tasks)) {
      setTimeout(() => {
        setIsOnboardingFinished(true);
      }, 1000);
    }
  };

  useEffect(() => {
    if (!lastCompletedTask) return;

    const uncompletedTasks = tasks.filter((t) => !t.completed && t.type !== lastCompletedTask);
    if (uncompletedTasks.length > 0) setNextTask(uncompletedTasks[0].type);
    else setNextTask(null);
  }, [lastCompletedTask]);

  const areTasksCompleted = (allTasks: OnboardingTaskProps[]) => {
    return (
      allTasks.filter((task) => {
        return task.completed;
      }).length === allTasks.length
    );
  };

  useEffect(() => {
    if (loading) return;
    if (!isLoading && userSettings) {
      const completedTasks = userSettings?.onboardingTasks || {};
      const isBuilderPlan = (userInfo?.subs?.plan?.name ?? '') === PRICING_PLANS_V4.BUILDER;
      const isPaidUser = userInfo?.subs?.plan?.paid;
      setTasksWrapper(
        onboardingTasks
          .filter((t) => {
            /* For paid users who are not on the builder plan, 
            show all onboarding tasks except the "Create First Agent" task */
            if (!isBuilderPlan && isPaidUser)
              return t.type !== OnboardingTaskType.CREATE_FIRST_AGENT;
            // For free and builder plan users, show all tasks except the "Invite Team Members" task
            return t.type !== OnboardingTaskType.INVITE_TEAM_MEMBERS;
          })
          .map((task) => (completedTasks[task.type] ? { ...task, completed: true } : task)),
      );

      setOnboardingDismissed(
        completedTasks[OnboardingTaskType.ONBOARDING_LIST_DISMISSED] ? true : false,
      );

      if (completedTasks[OnboardingTaskType.COMPLETED_TASK]) {
        setLastCompletedTask(completedTasks[OnboardingTaskType.COMPLETED_TASK]);
      }
    }
  }, [isLoading, userSettings, loading, userInfo?.subs?.plan?.name]);

  useEffect(() => {
    if (isOnboardingDismissed) {
      setNextTask(null);
      setToastOpen(false);
    }
  }, [isOnboardingDismissed]);

  const toggleOnboardingCompleted = () =>
    setOnboardingCompleted(!isOnboardingCompleted && !isOnboardingFinished);
  const toggleToastOpen = () => setToastOpen(!isToastOpen);

  const setTaskCompleted = (task: OnboardingTaskType) => {
    if (tasks.find((t) => t.type === task)?.completed) return;

    setTasksWrapper(tasks.map((t) => (t.type === task ? { ...t, completed: true } : t)));
    setLastCompletedTask(task);
    if (
      !isOnboardingFinished &&
      tasks.filter((task) => task.completed).length === tasks.length - 1
    ) {
      setOnboardingCompleted(true);
      return;
    }

    if (!isOnboardingCompleted) setToastOpen(true);
  };

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingCompleted,
        toggleOnboardingCompleted,
        isToastOpen,
        toggleToastOpen,
        tasks,
        setTasks: setTasksWrapper,
        isOnboardLoading: isLoading,
        setTaskCompleted,
        lastCompletedTask,
        nextTask,
        isOnboardingDismissed,
        setOnboardingDismissed,
        isInviteMemberModalOpen,
        setInviteMemberModalOpen,
        isAssignMemberModalOpen,
        setAssignMemberModalOpen,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within a OnboardingProvider');
  }
  return context;
};
