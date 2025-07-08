import { useMutation } from '@tanstack/react-query';
import { Avatar, AvatarGroup } from 'flowbite-react';
import { Pencil, Trash2 } from 'lucide-react';
import { ChangeEvent, FC, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';

import { teamAPI } from '@react/features/teams/clients';
import { CreateRoleModal } from '@react/features/teams/components/roles';
import { useStoreTeamSettings } from '@react/features/teams/hooks';
import ToolTip from '@react/shared/components/_legacy/ui/tooltip/tooltip';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings } from '@react/shared/hooks/useUserSettings';
import { queryClient } from '@react/shared/query-client';
import { apiResultsTypes } from '@react/shared/types';
import { extractError } from '@react/shared/utils/errors';
import { teamSettingKeys } from '@shared/teamSettingKeys';
import { userSettingKeys } from '@shared/userSettingKeys';

type Props = {
  data: apiResultsTypes.TeamRoleWithMembers;
  canManage: boolean;
  teamMembers: apiResultsTypes.TeamMemberWithRole[] | null;
  isDefaultRole: boolean;
  setError: (error: string) => void; // eslint-disable-line no-unused-vars
};

export const RolesTableRow: FC<Props> = ({ data: role, canManage, setError, isDefaultRole }) => {
  const { userInfo, hasReadOnlyPageAccess } = useAuthCtx();
  const user = userInfo?.user;
  const { data: userSettings } = useGetUserSettings(userSettingKeys.USER_TEAM);
  const [isEditing, setIsEditing] = useState(false);
  const isReadOnlyAccess = hasReadOnlyPageAccess('/teams/roles');

  const editBtnTooltipText = isReadOnlyAccess
    ? 'You do not have permission to edit Team Role.'
    : 'Edit Role';
  const deleteBtnTooltipText = isReadOnlyAccess
    ? 'You do not have permission to remove Team Role.'
    : 'Remove Team Role';

  const saveTeamSettingsMutation = useStoreTeamSettings(teamSettingKeys.DEFAULT_ROLE);

  const deleteRoleMutation = useMutation({
    mutationFn: teamAPI.deleteTeamRole,

    onError: (error: apiResultsTypes.SmythAPIError) => {
      const _errorMessage =
        error.status === 403 && extractError(error) === 'Forbidden'
          ? 'You are not authorized to delete this role.'
          : extractError(error) || 'An error occurred. Please try again later.';
      setError(_errorMessage);
    },
    onSuccess: () => {
      toast('Role deleted', { type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['team_roles'] });
    },
  });

  const deleteRoleHandler = async () => {
    if (!isReadOnlyAccess) await deleteRoleMutation.mutateAsync(role.id);
  };

  const roleMembers = useMemo(() => {
    if (!role?.userTeamRole) return [];
    return role?.userTeamRole
      ?.filter((userRole) => userRole.user.id !== user.id)
      .map((userRole) => userRole.user);
  }, [role.userTeamRole, user]);

  const handleDefaultRoleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.checked) return;

    const currentTeamId = userSettings?.userSelectedTeam;
    if (!currentTeamId) return;

    saveTeamSettingsMutation.mutate(
      {
        key: teamSettingKeys.DEFAULT_ROLE,
        data: { defaultRoles: { [currentTeamId]: { name: role.name, id: role.id } } },
        operation: 'insertOrUpdate',
      },
      {
        onSuccess: () => {
          queryClient.setQueryData(['teamSettings', teamSettingKeys.DEFAULT_ROLE], {
            data: { defaultRoles: { [currentTeamId]: { name: role.name, id: role.id } } },
          });
          toast.success('Default role updated successfully');
        },
        onError: () => setError('Failed to update default role'),
      },
    );
  };
  const tdClasses = 'px-6 h-14';
  const colArray = ['bg-cyan-400', 'bg-orange-700', 'bg-purple-700', 'bg-cyan-500', 'bg-amber-500'];
  return (
    <>
      <tr
        className="bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 
      border-b text-base font-normal border-solid border-gray-100 last:border-b-0"
      >
        <th
          scope="row"
          className="px-6 py-4 font-normal text-gray-900 whitespace-nowrap dark:text-white"
        >
          {role.name}
        </th>

        <td className={tdClasses}>
          {/* Members */}
          {role?.userTeamRole && role.userTeamRole?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <AvatarGroup>
                {roleMembers?.slice(0, 4)?.map?.((member) => {
                  return (
                    <ToolTip
                      key={member.id}
                      text={[member.name, member.email]}
                      classes="text-nowrap mb-1"
                      isMultiLine={true}
                    >
                      <Avatar
                        key={member.id}
                        img={member.avatar}
                        rounded
                        stacked
                        className="w-8 h-8"
                        size="sm"
                        theme={{
                          root: {
                            base: 'rounded-full w-8 h-8 relative overflow-hidden bg-gray-100 dark:bg-gray-600',
                          },
                        }}
                      />
                    </ToolTip>
                  );
                })}

                {roleMembers?.length > 4 && (
                  <Avatar.Counter
                    className={`w-8 h-8 z-50 pointer-events-none bg-orange-500 ${
                      colArray[Math.floor(Math.random() * colArray.length)]
                    }`}
                    total={roleMembers?.length - 4}
                    href="#"
                    theme={{
                      base: 'relative flex items-center justify-center text-xs font-medium text-white rounded-full',
                    }}
                  />
                )}
              </AvatarGroup>
            </div>
          ) : (
            'No Member'
          )}
        </td>

        <td className={tdClasses}>
          {role.canManageTeam ? (
            <span className="inline-flex text-[#2AAD8E]">Yes</span>
          ) : (
            <span className="inline-flex text-[#F35063]">No</span>
          )}
        </td>
        <td className={tdClasses}>
          <div className="flex items-center">
            <input
              id="default-role"
              type="radio"
              checked={isDefaultRole}
              onChange={!isReadOnlyAccess ? handleDefaultRoleChange : undefined}
              name="default-role"
              disabled={isReadOnlyAccess}
              className={`w-4 h-4 accent-gray-800 text-gray-800 focus:ring-gray-800 ${
                isReadOnlyAccess ? 'cursor-not-allowed opacity-50' : ''
              }`}
            />
          </div>
        </td>
        <td className={tdClasses + ' text-right'}>
          <span className="inline-flex gap-4">
            {canManage && !role.isOwnerRole && !role.acl?.default_role && (
              <>
                <ToolTip
                  text={editBtnTooltipText}
                  placement="top-right"
                  classes={isReadOnlyAccess ? 'w-56' : 'w-28'}
                >
                  <Pencil
                    className="h-4 w-4 text-[#242424] cursor-pointer"
                    onClick={() => {
                      if (!isReadOnlyAccess) setIsEditing(true);
                    }}
                  />
                </ToolTip>
                <ToolTip
                  text={deleteBtnTooltipText}
                  placement="top-right"
                  classes={isReadOnlyAccess ? 'w-56' : 'w-40'}
                >
                  <Trash2
                    onClick={deleteRoleHandler}
                    className="h-4 w-4 text-[#242424] cursor-pointer"
                  />
                </ToolTip>
              </>
            )}
          </span>
        </td>
      </tr>

      {isEditing &&
        createPortal(
          <CreateRoleModal
            editMode={true}
            onClose={() => setIsEditing(false)}
            key={role.id}
            editData={{
              roleId: role.id,
              name: role.name,
              existingAcls: role.acl,
              permissions: { canManageTeam: role.canManageTeam },
            }}
          />,
          document.body,
        )}
    </>
  );
};
