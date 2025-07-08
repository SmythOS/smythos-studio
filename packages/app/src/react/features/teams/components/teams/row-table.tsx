import { useMutation } from '@tanstack/react-query';
import { Avatar, AvatarGroup } from 'flowbite-react';
import React from 'react';
import { createPortal } from 'react-dom';
import { AiFillDelete, AiFillEdit, AiOutlineUserAdd } from 'react-icons/ai';
import { toast } from 'react-toastify';

import { subTeamsAPI } from '@react/features/teams/clients';
import { AssignMemberModal, CreateSpace } from '@react/features/teams/components/common';
import ToolTip from '@react/shared/components/_legacy/ui/tooltip/tooltip';
import CircularButton from '@react/shared/components/ui/circular.button';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings } from '@react/shared/hooks/useUserSettings';
import { apiResultsTypes } from '@react/shared/types';
import { TeamMemberWithRole } from '@react/shared/types/api-results.types';
import { ITeam } from '@react/shared/types/entities';
import { extractError } from '@react/shared/utils/errors';
import { userSettingKeys } from '@shared/userSettingKeys';

type Props = {
  data: apiResultsTypes.TeamRoleWithMembers;
  canManage: boolean;
  teamMembers: TeamMemberWithRole[] | null;
  allMembers: TeamMemberWithRole[] | null;
};

export const TeamsTableRow = ({ data: role, canManage, teamMembers, allMembers }: Props) => {
  const { userInfo, userTeams } = useAuthCtx();
  const user = userInfo?.user;
  const { data: userSettings } = useGetUserSettings(userSettingKeys.USER_TEAM);
  const currTeam = userTeams.find((team: ITeam) => team.id === userSettings?.userSelectedTeam);

  const [isEditing, setIsEditing] = React.useState(false);
  const [isAssigningMember, setIsAssigningMember] = React.useState(false);

  const deleteSubTeamMutation = useMutation({
    mutationFn: subTeamsAPI.deleteSubTeam,
    onError: (error: apiResultsTypes.SmythAPIError) => {
      let _errorMessage = 'Something went wrong!';
      if (error.status === 403) {
        if (extractError(error) === 'Forbidden') {
          _errorMessage = 'You are not authorized to delete this role.';
        } else if (extractError(error) === 'You do not have permission to create a sub-team') {
          _errorMessage = 'You are not authorized to delete this role.';
        } else if (
          extractError(error).indexOf(
            'You cannot join another team because you have existing data in your account',
          ) > -1
        ) {
          const hasAiAgent = extractError(error).toLowerCase().indexOf('ai agent') > -1;
          const hasNamespace = extractError(error).toLowerCase().indexOf('namespace') > -1;
          _errorMessage = `You need to remove your data from the current team before you can delete it. ${
            hasAiAgent ? '(AI Agents)' : ''
          } ${hasNamespace ? '(NameSpaces)' : ''}.`;
        } else if (extractError(error).length > 0) _errorMessage = extractError(error);
      }
      toast(_errorMessage);
    },
    onSuccess: () => {
      toast('Team deleted', { type: 'success' });
      window.location.reload();
    },
  });

  const deleteSubTeamHandler = async (id: string) => {
    await deleteSubTeamMutation.mutateAsync({ id, userId: user.id, parentId: currTeam.id });
  };

  return (
    <>
      <tr className="bg-white dark:bg-gray-800 dark:border-gray-700">
        <th
          scope="row"
          className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
        >
          {role.name}
        </th>
        <td className="px-6 py-4">
          {/* Members */}
          {teamMembers && teamMembers?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <AvatarGroup>
                {teamMembers?.slice(0, 4)?.map?.((member) => {
                  return (
                    <ToolTip
                      key={member.id}
                      text={[member.name, member.email]}
                      classes="text-nowrap mb-1"
                      isMultiLine={true}
                    >
                      <span>
                        <Avatar key={member.id} img={member.avatar} rounded stacked />
                      </span>
                    </ToolTip>
                  );
                })}
                {teamMembers?.length > 4 && (
                  <Avatar.Counter
                    className="w-8 h-8 z-50 pointer-events-none"
                    total={teamMembers?.length - 4}
                    href="#"
                  />
                )}
              </AvatarGroup>
            </div>
          ) : (
            'No Members'
          )}
        </td>

        <td className="px-6 py-4">
          {role.canManageTeam ? (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              Yes
            </span>
          ) : (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
              No
            </span>
          )}
        </td>
        <td className="px-6 py-4 text-right">
          <span className="inline-flex gap-2">
            {canManage && (
              <>
                <CircularButton
                  Icon={AiFillEdit}
                  className="bg-primary-100"
                  onClick={() => setIsEditing(true)}
                />
                <CircularButton
                  Icon={AiFillDelete}
                  onClick={() => deleteSubTeamHandler(role.id)}
                  className="bg-primary-100 disabled:opacity-60"
                  disabled={deleteSubTeamMutation.isLoading}
                />
                <CircularButton
                  Icon={AiOutlineUserAdd}
                  onClick={() => setIsAssigningMember(true)}
                  className="bg-primary-100 disabled:opacity-60"
                  disabled={deleteSubTeamMutation.isLoading}
                />
              </>
            )}
          </span>
        </td>
      </tr>

      {isEditing &&
        createPortal(
          <CreateSpace
            isOpen={isEditing}
            onClose={() => setIsEditing(false)}
            onSubmit={() => {}}
            editData={{ id: role.id, name: role.name }}
          />,
          document.body,
        )}

      {isAssigningMember &&
        createPortal(
          <AssignMemberModal
            isOpen={isAssigningMember}
            onClose={() => setIsAssigningMember(false)}
            options={(allMembers as []) ?? []}
            onSubmit={() => setIsAssigningMember(false)}
            editData={{ id: role.id, name: role.name }}
          />,
          document.body,
        )}
    </>
  );
};
