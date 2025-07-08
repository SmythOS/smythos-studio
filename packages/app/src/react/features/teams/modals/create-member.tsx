/* eslint-disable max-len */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { useOnboarding } from '@react/features/agents/contexts/OnboardingContext';
import useMutateOnboardingData from '@react/features/onboarding/hooks/useMutateOnboardingData';
import { teamAPI } from '@react/features/teams/clients';
import { InviteMemberWarning } from '@react/features/teams/components/teams';
import { useGetTeamSettings } from '@react/features/teams/hooks';
import { Input } from '@react/shared/components/ui/input';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { useGetUserSettings } from '@react/shared/hooks/useUserSettings';
import { queryClient } from '@react/shared/query-client';
import { OnboardingTaskType } from '@react/shared/types/onboard.types';
import { extractError } from '@react/shared/utils/errors';
import { Analytics } from '@shared/posthog/services/analytics';
import { teamSettingKeys } from '@shared/teamSettingKeys';
import { userSettingKeys } from '@shared/userSettingKeys';
import { UserSettingsKey } from '@src/backend/types/user-data';
import { Tooltip } from 'flowbite-react';

type Props = {
  onClose: () => void;
  editMode?: boolean;
  editData?: { roleId: number; email: string; memberId: number };
  defaultRole?: number;
};

const CreateMemberModal = (props: Props) => {
  const [memberEmail, setMemberEmail] = useState(props.editData?.email ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState(
    props.editData?.roleId ?? props.defaultRole ?? -1,
  );
  const [validationError, setValidationError] = useState('');
  const saveUserSettingsMutation = useMutateOnboardingData();
  const { setTaskCompleted } = useOnboarding();

  const { data: userTeamSettings } = useGetUserSettings(userSettingKeys.USER_TEAM);
  const { data: roleSettings } = useGetTeamSettings(teamSettingKeys.DEFAULT_ROLE);
  const currentTeamId = userTeamSettings?.userSelectedTeam;

  const teamRolesQuery = useQuery({ queryKey: ['team_roles'], queryFn: teamAPI.getTeamRoles });

  // Helper function to check if a role exists in available roles
  const isRoleAvailable = useCallback(
    (roleId: number | string) => {
      return teamRolesQuery.data?.roles?.some((role) => role.id.toString() === roleId.toString());
    },
    [teamRolesQuery.data?.roles],
  );

  // Helper function to find the owner role
  const findOwnerRole = useCallback(() => {
    return teamRolesQuery.data?.roles?.find((r) => r.isOwnerRole);
  }, [teamRolesQuery.data?.roles]);

  // Helper function to get the effective role ID
  const getEffectiveRoleId = useCallback(() => {
    // Use team-specific default role if available
    const defaultRole = roleSettings?.data?.defaultRoles?.[currentTeamId];
    if (defaultRole?.id && isRoleAvailable(defaultRole.id)) {
      return Number(defaultRole.id);
    }

    // Fallback to owner role
    const ownerRole = findOwnerRole();
    return ownerRole?.id;
  }, [roleSettings, currentTeamId, isRoleAvailable, findOwnerRole]);

  // Update the role selection when default role changes
  useEffect(() => {
    if (!props.editMode && selectedRoleId === -1) {
      const effectiveRoleId = getEffectiveRoleId();
      if (effectiveRoleId) {
        setSelectedRoleId(Number(effectiveRoleId));
      }
    }
  }, [props.editMode, roleSettings, currentTeamId, getEffectiveRoleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update the select element's default option text
  const getDefaultRoleText = useCallback(() => {
    const effectiveRoleId = getEffectiveRoleId();
    if (!effectiveRoleId) return 'Choose a role';

    const roleName = teamRolesQuery.data?.roles?.find((r) => r.id === effectiveRoleId)?.name;

    return `Choose a role (default: ${roleName})`;
  }, [getEffectiveRoleId, teamRolesQuery.data?.roles]);

  const inviteMember = useMutation({
    mutationFn: () => {
      return teamAPI.inviteTeamMember({
        email: memberEmail?.trim(),
        roleId: Number(selectedRoleId), // Use the effective role ID
      });
    },

    onError: (error) =>
      handleApiError(
        error,
        'An error occurred. Please try again later.',
        'You are not authorized to invite a new member',
      ),

    onSuccess: () => {
      toast('Invitation sent');
      props.onClose();
      queryClient.invalidateQueries({ queryKey: ['team_roles'] });
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: () => {
      return teamAPI.updateTeamMemberRole(props.editData.memberId, {
        roleId: Number(selectedRoleId), // Use the effective role ID
      });
    },

    onError: (error) =>
      handleApiError(
        error,
        'An error occurred. Please try again later.',
        'You are not authorized to update this member',
      ),

    onSuccess: () => {
      props.onClose();
      queryClient.invalidateQueries({ queryKey: ['team_members_list'] });
    },
  });

  const handleApiError = (error, defaultMsg, unauthorizedMsg) => {
    let _errorMessage =
      error.status === 403 && extractError(error).toLowerCase().indexOf('unauthorized') !== -1
        ? unauthorizedMsg
        : extractError(error) || defaultMsg;
    setErrorMessage(_errorMessage);
  };

  async function handleSubmit() {
    const trimmedEmail = memberEmail?.trim();
    const emailRegex = /\S+@\S+\.\S+/;

    if (!emailRegex?.test(trimmedEmail)) {
      setValidationError('Invalid email');
      return;
    }

    // Validate that we have a valid role (either selected or default)
    const effectiveRoleId = getEffectiveRoleId();
    if (!effectiveRoleId) {
      setValidationError('No role selected and no default role available');
      return;
    }

    if (props.editMode) await updateMemberRole.mutateAsync();
    else await inviteMember.mutateAsync();

    saveUserSettingsMutation.mutate({
      key: UserSettingsKey.OnboardingTasks,
      data: {
        [OnboardingTaskType.INVITE_TEAM_MEMBERS]: true,
        [OnboardingTaskType.COMPLETED_TASK]: OnboardingTaskType.INVITE_TEAM_MEMBERS,
      },
      operation: 'insertOrUpdate',
    });
    setTaskCompleted(OnboardingTaskType.INVITE_TEAM_MEMBERS);

    Analytics.track(`onboarding_task_${OnboardingTaskType.INVITE_TEAM_MEMBERS}`);
  }

  return (
    <div
      id="defaultModal"
      // @ts-expect-error tabIndex expects a number but we're passing a string
      tabIndex="-1"
      className="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-screen max-h-full justify-center items-center flex bg-black bg-opacity-50"
      onClick={props.onClose}
    >
      <div className="relative w-full max-w-xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
          <div className="flex items-start justify-between pt-4 px-6 border-b rounded-t dark:border-gray-600">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {props.editMode ? 'Edit Member' : 'Invite Member'}
            </h3>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
              onClick={props.onClose}
            >
              <svg
                className="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
              <span className="sr-only">Close modal</span>
            </button>
          </div>
          {!props.editMode && (
            <div className="px-6 pt-2">
              <p className="text-sm text-gray-500 block w-full">
                Add a new team member to your workspace.
              </p>
            </div>
          )}

          {/* Warning block for and check for unlimited seats*/}
          {!props.editMode && <InviteMemberWarning classes="mx-6" newMemberCount={1} />}
          <div className="flex gap-6 px-6">
            <div className="mb-6 flex-grow">
              <label
                htmlFor="member-email-input"
                className="block mb-2 text-md font-medium text-gray-900 dark:text-white"
              >
                Email Address
              </label>
              <Input
                id="member-email-input"
                placeholder="member@example.com"
                value={memberEmail}
                disabled={props.editMode}
                onChange={(e) => {
                  setValidationError('');
                  setMemberEmail(e.target.value);
                }}
                fullWidth
              />
            </div>
            <div className="mb-6 flex-grow">
              <label
                htmlFor="role-name-input"
                className="block mb-2 text-md font-medium text-gray-900 dark:text-white"
              >
                Role{' '}
                <Tooltip
                  content={
                    <div className="text-sm">
                      Different roles have different permissions.
                      <br />
                      See{' '}
                      <a
                        href="/teams/roles"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-smythos-blue-500 font-semibold hover:text-smythos-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        manage roles
                      </a>
                    </div>
                  }
                  trigger="hover"
                  placement="top"
                  style="light"
                  theme={{
                    target: 'inline-flex items-center w-5 h-5 align-top',
                  }}
                >
                  <img src="/img/icons/Info.svg" className="w-5 h-5" alt="Info" />
                </Tooltip>
              </label>
              <select
                value={selectedRoleId}
                id="role-name-input"
                className={`py-2 px-3 border text-gray-900 rounded block w-full outline-none
            focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none
            text-sm font-normal placeholder:text-sm placeholder:font-normal box-border mb-[1px] focus:mb-0

            ${'border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500'}`}
                onChange={(e) => {
                  setSelectedRoleId(Number(e.target.value));
                }}
              >
                {!props.editMode && selectedRoleId === -1 && (
                  <option value={-1}>{getDefaultRoleText()}</option>
                )}
                {!teamRolesQuery.isLoading &&
                  teamRolesQuery.data?.roles?.map((option) => {
                    const defaultRoleId = getEffectiveRoleId();
                    return (
                      <option key={option.id} value={option.id}>
                        {option.name}
                        {option.id === defaultRoleId ? ' (Default)' : ''}
                        {option.isOwnerRole ? ' (System Admin)' : ''}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>
          <div className="px-6 pb-0 pt-0">
            {(inviteMember?.isError || updateMemberRole?.isError) && errorMessage ? (
              <p className="text-red-500 text-xs">{errorMessage}</p>
            ) : null}
            {validationError && <p className="text-red-500">{validationError}</p>}
          </div>
          <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b dark:border-gray-600 mt-6">
            <Button
              className="w-full"
              handleClick={handleSubmit}
              disabled={inviteMember.isLoading || updateMemberRole.isLoading || !memberEmail}
            >
              {props.editMode ? 'Update' : 'Invite'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateMemberModal;
