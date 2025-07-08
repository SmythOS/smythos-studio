/* eslint-disable react-hooks/exhaustive-deps */
import { useMutation } from '@tanstack/react-query';
import { FC, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { subTeamsAPI, teamAPI } from '@react/features/teams/clients';
import { InviteMemberWarning } from '@react/features/teams/components/teams';
import { AssignTeamDropdown } from '@react/features/teams/components/teams/assign-team-dropdown';
import { useGetTeamSettings } from '@react/features/teams/hooks';
import Modal from '@react/shared/components/ui/modals/Modal';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { Spinner } from '@react/shared/components/ui/spinner';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings, useStoreUserSettings } from '@react/shared/hooks/useUserSettings';
import { queryClient } from '@react/shared/query-client';
import {
  SmythAPIError,
  TeamMemberWithRole,
  TeamRoleWithMembers,
} from '@react/shared/types/api-results.types';
import { PostHog } from '@shared/posthog';
import { EVENTS } from '@shared/posthog/constants/events';
import { teamSettingKeys } from '@shared/teamSettingKeys';
import { userSettingKeys } from '@shared/userSettingKeys';
import { delay } from '@shared/utils';
import { Tooltip } from 'flowbite-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  newTeamData?: { name: string; id: string; owner: string; organizationId?: string };
  editData?: { id: string; name: string; organizationId?: string };
  memberData?: {
    id: string;
    teamId: string;
    email: string;
    roleId: string;
    roleName: string;
    removeBeforeUpdate?: boolean;
  };
  onSubmit: (teamName: string) => void; // eslint-disable-line no-unused-vars
  options?: Array<{ name: string; id: string; email: string }> | TeamMemberWithRole[];
  excludedOptions?: { key: string; options: string[] };
}

const isValidEmail = (email: string) => {
  // RFC 5322 compliant email regex
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/; // eslint-disable-line max-len
  return emailRegex.test(email);
};

export const AssignMemberModal: FC<Props> = ({
  isOpen,
  onClose,
  options,
  onSubmit,
  editData,
  newTeamData,
  excludedOptions,
  memberData,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [roleData, setRoleData] = useState([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasRoles, setHasRoles] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [isContinuing, setIsContinuing] = useState<boolean>(false);
  const [isEmailNewMember, setIsEmailNewMember] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const storeUserSettings = useStoreUserSettings(userSettingKeys.USER_TEAM);
  const [isAddBtnDisabled, setIsAddBtnDisabled] = useState<boolean>(false);

  const { refreshUserData, currentUserTeam, getPageAccessParentTeam, getPageAccess } = useAuthCtx();
  const membersAccess = getPageAccess('/teams/members');
  const parentTeamMembersAccess = getPageAccessParentTeam('/teams/members');
  const finalMemberAccess = !currentUserTeam.parentId
    ? membersAccess?.write
    : parentTeamMembersAccess?.write;
  // Add these hooks for team-specific roles
  const { data: userTeamSettings } = useGetUserSettings(userSettingKeys.USER_TEAM);
  const { data: roleSettings } = useGetTeamSettings(teamSettingKeys.DEFAULT_ROLE);
  const currentTeamId = userTeamSettings?.userSelectedTeam;

  const isUpdatingRole = memberData?.removeBeforeUpdate;

  const findOwnerRole = useCallback((roles) => roles?.find((r) => r.isOwnerRole), []);

  // Helper function to check if a role exists in current team roles
  const isRoleAvailable = useCallback(
    (roleId: string) => roleData.some((role) => role.id.toString() === roleId.toString()),
    [roleData],
  );

  useEffect(() => {
    if (emailError) setIsAddBtnDisabled(true);
    else if (!(selectedMemberId || emailInput) || isLoading) {
      setIsAddBtnDisabled(true);
    } else setIsAddBtnDisabled(false);
  }, [emailError, selectedMemberId, isLoading, emailInput]);

  const isRoleDefault = useCallback(
    (roleId: string, roleName: string) => {
      const defaultRole = roleSettings?.data?.defaultRoles?.[currentTeamId];

      return (
        roleId.toString() === defaultRole?.id.toString() || roleName.toLowerCase() === 'super admin'
      );
    },
    [roleSettings?.data?.defaultRoles, currentTeamId],
  );

  const getEffectiveRoleId = useCallback(() => {
    if (selectedRoleId && isRoleAvailable(selectedRoleId)) return selectedRoleId;

    // If editing, use the member's current role if it exists
    if (memberData?.roleId && isRoleAvailable(memberData.roleId)) return memberData.roleId;

    // Use team-specific default role if available
    const defaultRole = roleSettings?.data?.defaultRoles?.[currentTeamId];
    if (defaultRole?.id && isRoleAvailable(defaultRole.id)) return defaultRole.id.toString();

    // Fallback to owner role
    const ownerRole = findOwnerRole(roleData);
    return ownerRole?.id?.toString();
  }, [
    selectedRoleId,
    memberData?.roleId,
    roleSettings?.data?.defaultRoles,
    currentTeamId,
    roleData,
    isRoleAvailable,
  ]);

  useEffect(() => {
    if (memberData) {
      if (excludedOptions?.options) {
        excludedOptions.options = excludedOptions?.options?.filter(
          (option) => option !== memberData?.email,
        );
      }
      setSelectedMemberId(memberData.id);
      setEmailInput(memberData.email);
      setSelectedRoleId(memberData.roleId);
    }
  }, [memberData]);

  const onCloseModal = async () => {
    // Only refresh and redirect if explicitly continuing in space creation flow
    if (newTeamData?.id && isContinuing) await refreshUserData();
    onClose();
  };

  interface CreateAssignMemberMutationProps {
    teamId: string;
    memberId: string;
    roleId: string;
    notifyEmail: boolean;
  }
  const createAssignMemberMutation = useMutation({
    mutationFn: async (props: CreateAssignMemberMutationProps) => {
      const response = await subTeamsAPI.assignMemberToTeam(props);

      // Parse the response to check for errors
      if (response?.error) throw new Error(response.error?.message || 'Failed to assign member');
      return response;
    },
    onSuccess: async () => {
      await refreshUserData();
      setIsLoading(false);
      PostHog.track(EVENTS.ACCOUNT_HIERARCHY_EVENTS.SPACE_MEMBER_INVITED, {});

      // Only close modal and refresh if we're not in the space creation flow
      if (!newTeamData?.id) {
        onSubmit('');
        onClose();
      }

      // Show success message only on confirmed success
      toast('Member added successfully');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast(error?.message || error?.error?.message || 'Failed to assign member');
      setIsAddBtnDisabled(false);
      setIsLoading(false);
    },
  });

  const getRolesMutation = useMutation({
    mutationFn: (teamId: string) => subTeamsAPI.getTeamRoles(teamId),
    onSuccess: async (response) => {
      const roles = response?.roles || [];
      setRoleData(roles);

      // Check if current default role exists in new team roles
      const defaultRole = roleSettings?.data?.defaultRoles?.[currentTeamId];
      const isCurrentDefaultValid =
        defaultRole?.id && roles.some((role) => role.id.toString() === defaultRole.id.toString());

      // If no valid role is selected, set the default role if valid
      if (!selectedRoleId && !memberData?.roleId) {
        if (isCurrentDefaultValid) setSelectedRoleId(defaultRole.id.toString());
        else {
          const ownerRole = findOwnerRole(roles);
          if (ownerRole) setSelectedRoleId(ownerRole.id.toString());
        }
      }

      setTimeout(setHasRoles, 1000, true);
      return roles;
    },
    onError: (error: SmythAPIError) => {
      // console.error('Error fetching team roles:', error);
      toast(error?.error?.message);
    },
  });

  const getRoles = (teamId: string) => getRolesMutation.mutate(teamId);

  interface InviteMembersMutationProps {
    email: string;
    roleId: string;
    organizationId: string;
    spaceId: string;
  }
  const inviteMembersMutation = useMutation({
    mutationFn: async ({ roleId, spaceId, ...others }: InviteMembersMutationProps) => {
      const response = await teamAPI.inviteTeamMemberWithSubTeam(
        { roleId: Number(roleId), spaceId, ...others },
        spaceId,
      );

      // Parse response first
      const data = await response.json();

      // If response is not ok, throw error with parsed message
      if (!response.ok) {
        throw new Error(data?.message || data?.error?.message || 'An error occurred');
      }

      return data;
    },
    onError: (error: Error | SmythAPIError) => {
      const errorMessage = error instanceof Error ? error.message : error?.error?.message;
      toast(errorMessage);
      setIsAddBtnDisabled(false);
      setIsLoading(false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team_invites'] }),
  });

  useEffect(() => {
    if (newTeamData?.id) {
      editData = {
        id: newTeamData.id,
        name: newTeamData.name,
        organizationId: newTeamData?.organizationId,
      };
    }

    if (editData?.id || newTeamData?.id) getRoles(editData?.id);
  }, [newTeamData]);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setIsAddBtnDisabled(true);

      const isAddingMember =
        !isUpdatingRole && !options?.find((option) => option.email === emailInput);

      if (finalMemberAccess && isAddingMember) {
        try {
          await inviteMembersMutation.mutateAsync({
            email: emailInput,
            roleId: getEffectiveRoleId(),
            spaceId: newTeamData?.id ? newTeamData.id : currentUserTeam.id,
            organizationId: currentUserTeam.parentId
              ? currentUserTeam.parentId
              : currentUserTeam.id,
          });

          // Show success message only after confirmed success
          toast('Member added successfully');

          // Clear the form for next invitation
          setEmailInput('');
          setSelectedMemberId('');
          setSelectedRoleId('');
          setEmailError('');

          await refreshUserData();

          if (!newTeamData?.id) onSubmit('');

          // Reset button state
          setIsAddBtnDisabled(false);
          setIsLoading(false);
        } catch {
          return;
        }
      } else if ((editData?.id || newTeamData?.id) && selectedMemberId) {
        const effectiveRoleId = getEffectiveRoleId();

        if (!effectiveRoleId) {
          toast('No role selected and no default role available');
          setIsAddBtnDisabled(false);
          setIsLoading(false);
          return;
        }

        if (isUpdatingRole) {
          const response = await subTeamsAPI.unassignMemberFromTeam({
            teamId: memberData?.teamId,
            memberId: memberData.id.toString(),
            roleId: Number(memberData?.roleId),
          });
          if (response?.error) {
            toast(response?.error);
            setIsAddBtnDisabled(false);
            setIsLoading(false);
            return;
          }
          PostHog.track(EVENTS.ACCOUNT_HIERARCHY_EVENTS.SPACE_MEMBER_UPDATED, {});
        }

        try {
          await createAssignMemberMutation.mutateAsync({
            teamId: editData?.id || newTeamData?.id,
            memberId: selectedMemberId,
            roleId: effectiveRoleId,
            notifyEmail: !isUpdatingRole,
          });
          // Success is handled in mutation's onSuccess
        } catch {
          // Error is handled in mutation's onError
        }
      }
    } catch (error) {
      // Only log unexpected top-level errors
      // eslint-disable-next-line no-console
      console.error('Unexpected error in form submission:', error);
    }
  };

  // Helper function to get role display name
  const getRoleDisplayName = useCallback(
    (role: TeamRoleWithMembers) => {
      const isDefault = isRoleDefault(role.id.toString(), role.name);
      const isOwner = role.isOwnerRole;

      return `${role.name}${isDefault ? ' (Default)' : ''}${isOwner ? ' (System Admin)' : ''}`;
    },
    [isRoleDefault],
  );

  // Helper function to get placeholder text
  const getPlaceholderText = useCallback(() => {
    const effectiveRoleId = getEffectiveRoleId();
    if (!effectiveRoleId) return 'Select a role';

    const defaultRole = roleData.find((r) => r.id.toString() === effectiveRoleId);
    return `Select a role (default: ${defaultRole?.name})`;
  }, [getEffectiveRoleId, roleData]);

  // Add debounced validation
  const debouncedValidate = useCallback(
    async (email: string) => {
      if (isValidating) return;

      setIsValidating(true);
      await delay(300); // Add a small delay to prevent rapid updates

      if (!email) {
        setIsEmailNewMember(false);
        setEmailError('');
        setSelectedMemberId('');
        setIsValidating(false);
        return false;
      }

      const isExistingMember = options?.some(
        ({ email: optionEmail }) => optionEmail.toLowerCase() === email.toLowerCase(),
      );

      // Batch state updates
      const updates = {
        isEmailNewMember: !isExistingMember && !!email.trim(),
        emailError: '',
        selectedMemberId: '',
      };

      if (!isValidEmail(email)) {
        updates.emailError = 'Please enter a valid email address.';
      } else if (!isExistingMember && !finalMemberAccess) {
        updates.emailError =
          'Entered email is not part of organization. You do not have access to add members out of your organization.';
      } else {
        const member = options?.find(
          (option) => option.email.toLowerCase() === email.toLowerCase(),
        );
        if (member) updates.selectedMemberId = member.id.toString();
      }

      // Apply all state updates at once
      setIsEmailNewMember(updates.isEmailNewMember);
      setEmailError(updates.emailError);
      setSelectedMemberId(updates.selectedMemberId);

      setIsValidating(false);
      return !!updates.selectedMemberId;
    },
    [options, finalMemberAccess, isValidating],
  );

  // Update the continue button handler to only redirect when explicitly clicked
  const handleContinue = async () => {
    if (newTeamData?.id) {
      setIsContinuing(true);
      await storeUserSettings.mutateAsync(newTeamData?.id);
      window.location.href = '/';
    } else onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCloseModal}
      title={
        newTeamData?.name
          ? 'Space created successfully'
          : isUpdatingRole
          ? 'Edit Member'
          : 'Add member'
      }
      applyMaxWidth={false}
      panelWrapperClasses={'w-[540px]'}
      hideCloseIcon={true}
      showOverflow={true}
      // panelClasses={'h-[500px]'}
    >
      <div
        className={`${
          createAssignMemberMutation.isLoading ? 'opacity-80 pointer-events-none' : ''
        }`}
      >
        {newTeamData?.name && (
          <>
            <p className="text-sm text-gray-500">
              You will be now redirected to the new space. Would you like to switch to it now and
              start collaborating with your team?
            </p>
            <div className="p-2 bg-gray-100 w-full rounded-lg my-6 flex items-center">
              <div className="inline-block w-[40px] align-middle">
                <div>
                  <div
                    className="w-10 h-10 max-w-10 max-h-10 rounded-full overflow-hidden
                  bg-orange-400 dark:bg-orange-400 text-white dark:text-white
                  font-medium flex items-center justify-center"
                  >
                    <p className="capitalize text-lg text-center w-full">
                      {newTeamData?.name
                        ?.split(' ')
                        ?.slice(0, 2)
                        ?.map((t) => t[0])
                        ?.join('')
                        ?.toUpperCase()}
                    </p>
                  </div>
                  <div
                    className="absolute inset-0 transition-opacity duration-300 w-3 h-3 
                  left-[calc(14.6447%_-_6.5px)] top-[calc(14.6447%_-_6.5px)] z-12
                  rounded-full border border-white border-solid opacity-0 bg-v2-blue"
                  />
                </div>
              </div>
              <div className="inline-block align-middle pl-4 flex-1 w-0">
                <h2 className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {newTeamData?.name}
                </h2>
                {newTeamData?.owner && (
                  <p className="text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                    by {newTeamData?.owner}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
        {/* <p className={classNames('text-sm text-gray-500 pt-2', { hidden: isUpdatingRole })}>
          {finalMemberAccess
            ? 'Invite team members to collaborate. If the email entered is not part of the organization, 
            they will be added automatically.'
            : ' Invite a new person to join your team or workspace.'}
        </p> */}
        {!hasRoles && (
          <div className="w-full h-6 my-20">
            <Spinner classes="w-full h-6 mr-10" />
          </div>
        )}
        {hasRoles && isEmailNewMember && <InviteMemberWarning classes="mb-2" />}
        {hasRoles && (
          <>
            <div className="flex flex-row gap-6 mb-2">
              <div className="text-left text-md font-medium text-gray-900 dark:text-white w-full">
                Invite colleagues <span className="text-red-500">*</span>
              </div>

              <div className="text-left text-md font-medium text-gray-900 dark:text-white w-full">
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
              </div>
            </div>
            <div className="flex flex-row gap-6">
              <div className="w-full">
                <AssignTeamDropdown
                  options={
                    options
                      ?.filter(
                        (option) =>
                          !excludedOptions ||
                          !excludedOptions?.options.includes(option[excludedOptions?.key]),
                      )
                      ?.map((option) => ({
                        id: option.id.toString(),
                        name: option.email,
                      })) || []
                  }
                  dropDownClasses="max-h-[236px] overflow-y-auto"
                  onChange={(value) => {
                    setSelectedMemberId(value);
                    const selectedOption = options?.find(
                      (option) => option.id.toString() === value,
                    );
                    setEmailInput(selectedOption ? selectedOption.email : '');
                  }}
                  disabled={isUpdatingRole}
                  value={selectedMemberId}
                  placeholder="Select a member"
                  isEmailDropdown
                />
                {emailError && (
                  <p className="w-[calc(100%_-_4px)] ml-[2px] text-left text-xs text-red-500 mt-1">
                    {emailError}
                  </p>
                )}
              </div>
              <div className="w-full">
                <AssignTeamDropdown
                  options={
                    roleData
                      ? roleData.map((role) => ({
                          id: role.id.toString(),
                          name: getRoleDisplayName(role),
                        }))
                      : []
                  }
                  dropDownClasses="max-h-[236px] overflow-y-auto"
                  onChange={(value) => setSelectedRoleId(value)}
                  value={selectedRoleId}
                  placeholder={getPlaceholderText()}
                  disabled={isUpdatingRole}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button
                handleClick={handleContinue}
                disabled={isContinuing || isLoading}
                variant="secondary"
                className="mr-2"
                label={newTeamData?.name ? 'Go To Space' : 'Cancel'}
                loading={isContinuing}
              />
              <Button
                handleClick={handleSubmit}
                disabled={isAddBtnDisabled || isContinuing}
                variant="primary"
                label={isUpdatingRole ? 'Save' : 'Add Member'}
                loading={isLoading}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
