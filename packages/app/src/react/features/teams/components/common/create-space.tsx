import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { subTeamsAPI } from '@react/features/teams/clients';
import { Input } from '@react/shared/components/ui/input';
import Modal from '@react/shared/components/ui/modals/Modal';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { errKeys } from '@react/shared/constants';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { IMembershipTeam } from '@react/shared/types/entities';
import { PostHog } from '@shared/posthog';
import { EVENTS } from '@shared/posthog/constants/events';

const ENTERPRISE_PLAN_REDIRECT = 'https://smythos.com/enterprise-enquiry/';

// TODO: SHOULD NOT BE HARDEDCODED!!!
const MAX_SPACES = { STARTER: 1, PROFESSIONAL: 3, PREMIUM: 10, ENTERPRISE: 30 };

interface Props {
  isOpen: boolean;
  // eslint-disable-next-line no-unused-vars
  onClose: (data?: IMembershipTeam) => void;
  onSubmit: () => void;
  editData?: { id: string; name: string };
  allTeams?: IMembershipTeam[];
  parentTeam?: IMembershipTeam; // TODO: make it required in the future if needed, currently optional
}

type ErrorResponse = { error?: { code: number; message: string; errKey?: string; stack?: string } };
type PlanConfig = { showUpgradeLink: boolean; message: string };

const getPlanQuotaMessage = (
  userType: 'premium' | 'enterprise' | 'starter' | 'pro',
  maxSpaces: number,
  defaultSpaces: typeof MAX_SPACES,
): PlanConfig => {
  const configs: Record<string, PlanConfig> = {
    premium: {
      showUpgradeLink: true,
      message: `Limit reached! You've created the maximum of ${
        maxSpaces || defaultSpaces.PREMIUM
      } spaces.`,
    },
    enterprise: {
      showUpgradeLink: false,
      message: `Maximum of ${
        maxSpaces || defaultSpaces.ENTERPRISE
      } spaces created. Manage your spaces to free up room.`,
    },
    starter: {
      showUpgradeLink: true,
      message: `Maximum of ${maxSpaces || defaultSpaces.STARTER} spaces created.`,
    },
    pro: {
      showUpgradeLink: true,
      message: `Maximum of ${maxSpaces || defaultSpaces.PROFESSIONAL} spaces created.`,
    },
  };

  return configs[userType];
};

export const CreateSpace: React.FC<Props> = ({
  isOpen,
  onSubmit,
  editData,
  parentTeam,
  allTeams,
  onClose = () => {},
}) => {
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  const queryClient = useQueryClient();
  const { refreshUserData, isPremiumUser, isEnterpriseUser, isStarterUser, isProUser, userInfo } =
    useAuthCtx();
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const maxSpaces = Number(userInfo?.subs?.plan?.properties?.limits?.spaces) + 1;

  function planQuotaMessage(
    userIsPremium: boolean,
    userIsEnterprise: boolean,
    userIsStarter: boolean,
    userIsPro: boolean,
  ) {
    const type = userIsPremium
      ? 'premium'
      : userIsEnterprise
      ? 'enterprise'
      : userIsStarter
      ? 'starter'
      : userIsPro
      ? 'pro'
      : '';
    return (
      <>
        {type && getPlanQuotaMessage(type, maxSpaces, MAX_SPACES).message}
        {type && getPlanQuotaMessage(type, maxSpaces, MAX_SPACES).showUpgradeLink && (
          <>
            {' Please '}
            <Link
              to={ENTERPRISE_PLAN_REDIRECT}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-500 font-semibold"
            >
              Contact us
            </Link>
            {' to upgrade.'}
          </>
        )}
      </>
    );
  }

  const createTeamMutation = useMutation({
    mutationFn: (name: string) => subTeamsAPI.createSubTeam({ name, parentTeamId: parentTeam?.id }),
    onSuccess: async (data) => {
      const res = await data.json();
      queryClient.invalidateQueries(['team_roles']);
      onSubmit();
      setTeamName('');
      PostHog.track(EVENTS.ACCOUNT_HIERARCHY_EVENTS.SPACE_CREATED, {});
      onClose(res?.team);
      toast('Space created successfully');
      setQuotaExceeded(false);
    },
    onError: (error: ErrorResponse) => {
      console.error('Error creating team:', error); // eslint-disable-line no-console
      if (error?.error?.errKey === errKeys.QUOTA_EXCEEDED) {
        setQuotaExceeded(true);
        onClose();
        toast("You've reached the maximum space limit for your current plan."); // eslint-disable-line quotes
      } else toast(error?.error?.message || 'Error creating team');
    },
  });
  const updateTeamMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      subTeamsAPI.updateSubTeam({ id, name }),

    onSuccess: async () => {
      queryClient.invalidateQueries(['team_roles']);
      await refreshUserData(); // Refresh user data after creating a team
      onSubmit();
      setTeamName('');
      PostHog.track(EVENTS.ACCOUNT_HIERARCHY_EVENTS.SPACE_UPDATED, {});
      onClose();
      toast('Space updated successfully');
    },
    onError: (error: ErrorResponse) => {
      console.error('Error creating team:', error); // eslint-disable-line no-console
      toast(error?.error?.message || 'Error updating team');
    },
  });

  useEffect(() => {
    if (editData) {
      setTeamName(editData.name);
      setTeamId(editData.id);
    }
  }, [editData]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (allTeams) {
      const isDuplicate = allTeams.some((team) => team.name === teamName);
      if (isDuplicate) return toast('Team name already exists');
    }
    const trimmedTeamName = teamName.trim();
    if (trimmedTeamName && !teamId) createTeamMutation.mutate(trimmedTeamName);
    else if (teamId) updateTeamMutation.mutate({ id: teamId, name: trimmedTeamName });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 50);
    setTeamName(value);
  };

  return (
    <Modal
      panelWidthClasses="min-w-[460px]"
      isOpen={isOpen}
      onClose={onClose}
      title={teamId ? 'Space Name' : 'Create a space'}
    >
      <div
        className={
          createTeamMutation.isLoading || updateTeamMutation.isLoading
            ? 'opacity-80 pointer-events-none'
            : ''
        }
      >
        <form onSubmit={handleSubmit}>
          {!teamId && (
            <p className="text-xs pb-6">
              Organize your team effortlessly. Collaborate, share Agents, and invite members.
            </p>
          )}
          <div className={`mb-12 ${teamId ? 'mt-6' : ''}`}>
            {!teamId && (
              <label
                htmlFor="space-name"
                className="block mb-2 text-base font-medium text-[#1E1E1E] dark:text-white "
              >
                <>
                  <span>Space Name</span>
                  <span className="text-red-500">*</span>
                </>
              </label>
            )}
            <Input
              type="text"
              id="space-name"
              className="bg-gray-white border border-gray-300 text-gray-900 
              text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block
               w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400
                dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Enter space name.."
              value={teamName}
              onChange={handleInputChange}
              maxLength={50}
              required
              fullWidth
              disabled={createTeamMutation.isLoading || updateTeamMutation.isLoading}
            />
            <p className="absolute right-0 bottom-[-20px] text-xs text-gray-500">{`${teamName.length}/50`}</p>
          </div>
          {quotaExceeded && (
            <div className="text-red-600 text-sm mb-2">
              {planQuotaMessage(isPremiumUser, isEnterpriseUser, isStarterUser, isProUser)}
            </div>
          )}
          <div className="flex justify-end">
            <Button
              disabled={
                createTeamMutation.isLoading || updateTeamMutation.isLoading || !teamName.trim()
              }
              type="submit"
              className={'w-[100px] h-[48px] rounded-lg'}
            >
              {(createTeamMutation.isLoading || updateTeamMutation.isLoading) && (
                <div id="loader" className="circular-loader mr-1" />
              )}
              {teamId ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
