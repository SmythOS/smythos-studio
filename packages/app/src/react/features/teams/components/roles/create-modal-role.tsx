/* eslint-disable max-len */
import { extractError } from '@react/shared/utils/errors';
import { Analytics } from '@src/shared/posthog/services/analytics';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

import { useOnboarding } from '@react/features/agents/contexts/OnboardingContext';
import useMutateOnboardingData from '@react/features/onboarding/hooks/useMutateOnboardingData';
import { teamAPI } from '@react/features/teams/clients';
import { AclSelectForm, HandleAclChange } from '@react/features/teams/components/roles';
import ToolTip from '@react/shared/components/_legacy/ui/tooltip/tooltip';
import { Input } from '@react/shared/components/ui/input';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { queryClient } from '@react/shared/query-client';
import { OnboardingTaskType } from '@react/shared/types/onboard.types';
import { AclAccessSymbols, CombinedAclRules } from '@shared/constants/acl.constant';
import templateAcls from '@shared/constants/acl.constant.json';
import { hasAnyAccess } from '@shared/utils';
import { UserSettingsKey } from '@src/backend/types/user-data';

type Props = {
  onClose: () => void;
  editMode?: boolean;
  editData?: {
    roleId: string;
    existingAcls?: CombinedAclRules;
    name: string;
    permissions: { canManageTeam: boolean };
  };
};

export const CreateRoleModal = (props: Props) => {
  const [roleName, setRoleName] = React.useState(props.editData?.name ?? '');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [currentAcls, setCurrentAcls] = useState({
    ...templateAcls.page,
    ...(props.editData?.existingAcls?.page ?? {}), // current applied acls (for edit)
  });
  const [rolePermissions, setRolePermissions] = React.useState<{ canManageTeam: boolean }>({
    canManageTeam: props.editData?.permissions?.canManageTeam ?? false,
  });
  const saveUserSettingsMutation = useMutateOnboardingData();
  const { setTaskCompleted } = useOnboarding();
  const createRole = useMutation({
    mutationFn: (currentAcls: object) => {
      return teamAPI.createTeamRole({
        acl: { page: currentAcls, api: {} },
        canManageTeam: rolePermissions.canManageTeam,
        name: roleName,
      });
    },

    onError: (error) =>
      handleApiError(
        error,
        'An error occurred. Please try again later.',
        'You are not authorized to add a new role',
      ),

    onSuccess: () => {
      toast('Role created', { type: 'success' });
      props.onClose();
      queryClient.invalidateQueries({ queryKey: ['team_roles'] });
    },
  });

  // const { userTeams } = useAuthCtx();
  // const { data: userSettings, isLoading: isUserSettingsLoading } = useGetUserSettings(
  //   userSettingKeys.USER_TEAM,
  // );
  // const currTeam = userTeams.find((team: ITeam) => team.id === userSettings?.userSelectedTeam);
  // const organization = userTeams.filter((t) => t.parentId === null)[0];
  // const canGiveSpaceAccess = currTeam?.id === organization?.id;

  const updateRole = useMutation({
    mutationFn: (currentAcls: object) => {
      return teamAPI.updateTeamRole({
        acl: { page: currentAcls, api: {} },
        canManageTeam: rolePermissions.canManageTeam,
        name: roleName,
        roleId: props.editData.roleId,
      });
    },

    onError: (error) =>
      handleApiError(
        error,
        'An error occurred. Please try again later.',
        'You are not authorized to update this role',
      ),

    onSuccess: () => {
      toast('Role updated', { type: 'success' });
      props.onClose();
      queryClient.invalidateQueries({ queryKey: ['team_roles'] });
    },
  });

  const handleApiError = (error, defaultMsg, unauthorizedMsg) => {
    const _errorMessage =
      error.status === 403 ? unauthorizedMsg : extractError(error) || defaultMsg;
    setErrorMessage(_errorMessage);
  };

  const handleAclChange = ({ key, checked, ruleSymbol }: HandleAclChange) => {
    setCurrentAcls((prev) => {
      const newAccessParts = prev[key].access.split('');

      if (checked) {
        if (!newAccessParts.includes(ruleSymbol)) newAccessParts.push(ruleSymbol);
      } else {
        const ruleIndex = newAccessParts.indexOf(ruleSymbol);
        newAccessParts.splice(ruleIndex, 1);
      }
      return {
        ...prev,
        [key]: { ...prev[key], access: newAccessParts.sort().join('') as AclAccessSymbols },
      };
    });
  };

  const handleSubmit = async () => {
    if (props.editMode) await updateRole.mutateAsync(currentAcls);
    else {
      if (!hasAnyAccess(currentAcls)) {
        return toast('Please select access for role', { type: 'info' });
      }

      saveUserSettingsMutation.mutate({
        key: UserSettingsKey.OnboardingTasks,
        data: {
          [OnboardingTaskType.SETUP_TEAM_ROLES]: true,
          [OnboardingTaskType.COMPLETED_TASK]: OnboardingTaskType.SETUP_TEAM_ROLES,
        },
        operation: 'insertOrUpdate',
      });
      setTaskCompleted(OnboardingTaskType.SETUP_TEAM_ROLES);
      await createRole.mutateAsync(currentAcls);
      Analytics.track(`onboarding_task_${OnboardingTaskType.SETUP_TEAM_ROLES}`);
    }
  };

  return (
    <div
      id="defaultModal"
      // @ts-expect-error - TODO: fix this
      tabIndex="-1"
      className="fixed top-0 left-0 right-0 z-50 w-full p-4 
      overflow-x-hidden overflow-y-auto md:inset-0 h-screen max-h-full 
      flex justify-center items-center bg-black bg-opacity-50"
      onClick={props.onClose}
    >
      <div className="relative w-full max-w-xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
          <div className="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600">
            <h3 className="text-xl font-semibold text-[#1E1E1E] dark:text-white">
              {props.editMode ? 'Edit Role' : 'Create Role'}
            </h3>
            <button
              type="button"
              className="text-[#1E1E1E] bg-transparent hover:bg-gray-200 hover:text-gray-900
               rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center 
               dark:hover:bg-gray-600 dark:hover:text-white"
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
          <div className=" px-6 pt-6 pb-0">
            <div className="mb-6 space-y-6">
              <Input
                fullWidth
                type="text"
                id="role-name-input"
                label="Role Name"
                labelClassName="mb-1 text-base font-medium text-[#1E1E1E]"
                placeholder="e.g. Admin"
                value={roleName}
                onChange={(e) => {
                  setRoleName(e.target.value);
                }}
                required
              />
            </div>

            <div className="flex mb-8 mt-6 justify-around">
              <div className="flex items-center space-x-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    value=""
                    className="sr-only peer"
                    checked={rolePermissions.canManageTeam}
                    onChange={(e) => {
                      setRolePermissions((prev) => ({ ...prev, canManageTeam: e.target.checked }));
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
                  <span className="ml-3 text-base font-medium text-[#1E1E1E] dark:text-gray-300">
                    Manage Team
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="px-6 pb-0 pt-0">
            {(createRole.isError || updateRole.isError) && errorMessage && (
              <p className="text-red-500">{errorMessage}</p>
            )}
          </div>

          <AclSelectForm handleAclChange={handleAclChange} currentAcls={currentAcls} />

          <ToolTip
            text={[
              'Please',
              roleName.length === 0 ? 'add a name' : '',
              roleName.length === 0 && !hasAnyAccess(currentAcls) ? 'and' : '',
              !hasAnyAccess(currentAcls) ? 'enable at least one access' : '',
              `to ${props.editMode ? 'update' : 'create'} this role.`,
            ].join(' ')}
            classes="w-40"
            placement="top"
            tooltipWrapperClasses={'w-full'}
            showTooltip={roleName.length === 0 || !hasAnyAccess(currentAcls)}
          >
            <div className="w-full flex items-center justify-end p-6 space-x-2 border-t border-gray-200 rounded-b dark:border-gray-600">
              <Button
                label={props.editMode ? 'Update' : 'Create'}
                variant="primary"
                handleClick={handleSubmit}
                disabled={
                  createRole.isLoading ||
                  roleName.length === 0 ||
                  !hasAnyAccess(currentAcls) ||
                  updateRole.isLoading
                }
                type="button"
                className="h-[48px] px-8 rounded-lg"
              />
            </div>
          </ToolTip>
        </div>
      </div>
    </div>
  );
};
