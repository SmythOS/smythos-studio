import { useMutation } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';

import { subTeamsAPI, teamAPI } from '@react/features/teams/clients';
import CreateMemberModal from '@react/features/teams/modals/create-member';
import Tooltip from '@react/shared/components/_legacy/ui/tooltip/tooltip';
import ConfirmModal from '@react/shared/components/ui/modals/ConfirmModal';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings } from '@react/shared/hooks/useUserSettings';
import { queryClient } from '@react/shared/query-client';
import { apiResultsTypes } from '@react/shared/types';
import { SmythAPIError } from '@react/shared/types/api-results.types';
import { ITeam } from '@react/shared/types/entities';
import { extractError } from '@react/shared/utils/errors';
import { userSettingKeys } from '@shared/userSettingKeys';

type Props = {
  teamMember: apiResultsTypes.TeamMemberWithRole;
  setError: (error: string) => void; // eslint-disable-line no-unused-vars
};

export const MembersTableRow = ({ teamMember, setError }: Props) => {
  const { userInfo, userTeams, getPageAccess } = useAuthCtx();
  const { user } = userInfo || {};
  const { data: userSettings } = useGetUserSettings(userSettingKeys.USER_TEAM);
  const pageAccess = getPageAccess('/teams/members');

  const editBtnTooltipText = !pageAccess?.write
    ? "You do not have permission to edit user's Role." // eslint-disable-line quotes
    : 'Edit Role';
  const deleteBtnTooltipText = !pageAccess?.write
    ? 'You do not have permission to remove user from team.'
    : 'Remove User';

  const currTeam = userTeams.find((team: ITeam) => team.id === userSettings?.userSelectedTeam);

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteMemberDialog, setShowDeleteMemberDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMemberMutation = useMutation({
    mutationFn: teamAPI.deleteTeamMember,

    onError: (error: SmythAPIError) => {
      const _errorMessage =
        error.status === 403 && extractError(error) === 'Forbidden'
          ? 'You are not authorized to delete this member.'
          : extractError(error) || 'An error occurred. Please try again later.';
      setError(_errorMessage);
    },
    onSuccess: () => {
      toast.success('Member deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['team_members_list'] });
    },
  });

  const deleteMemberHandler = async () => {
    // Prevent multiple calls
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      if (currTeam.parentId) {
        await subTeamsAPI.unassignMemberFromTeam({
          teamId: currTeam.id,
          memberId: teamMember.id.toString(),
          roleId: teamMember.userTeamRole.sharedTeamRole.id,
        });
        toast.success('Member Unassigned from current space successfully');
      } else {
        await deleteMemberMutation.mutateAsync(teamMember.id);
      }
      // Close modal only after successful operation
      setShowDeleteMemberDialog(false);
    } catch (error) {
      console.error(error); // eslint-disable-line no-console
    } finally {
      setIsDeleting(false);
    }
  };

  const shouldShowEditButtons =
    user.userTeamRole.sharedTeamRole.canManageTeam &&
    user?.id !== teamMember.id &&
    !teamMember.userTeamRole.isTeamInitiator;
  const tdClasses = 'px-6 h-14';

  return (
    <>
      <tr
        className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700
       border-b border-solid border-gray-200 last:border-b-0 text-base"
      >
        <th scope="row" className={tdClasses + ' flex items-center'}>
          <img
            src={teamMember.avatar || '/img/user_default.svg'}
            onError={(e) => (e.currentTarget.src = '/img/user_default.svg')}
            alt="avatar"
            className="h-8 w-8 rounded-full object-cover inline-block"
          />

          <span className="ml-2 text-gray-900 whitespace-nowrap dark:text-white font-normal capitalize">
            {teamMember.name || teamMember?.email?.split?.('@')?.[0]}{' '}
            {teamMember.id === user.id
              ? '(You)'
              : teamMember.userTeamRole.isTeamInitiator
              ? '(Owner)'
              : ''}
          </span>
        </th>
        <td className={tdClasses + ' font-normal'}>{teamMember.email}</td>
        <td className={tdClasses + ' font-normal'}>
          {teamMember.userTeamRole.sharedTeamRole.name}
        </td>
        {/* {if it is the same user, dont show these edit buttons} */}
        <td className={tdClasses + ' text-right'}>
          {shouldShowEditButtons && (
            <span className="inline-flex gap-4">
              <Tooltip
                text={editBtnTooltipText}
                placement="top-right"
                classes={pageAccess?.write ? 'w-28' : 'w-56'}
              >
                <Pencil
                  className="h-4 w-4 text-[#242424] cursor-pointer"
                  onClick={() => {
                    if (pageAccess?.write) setIsEditing(true);
                  }}
                />
              </Tooltip>
              <Tooltip
                text={deleteBtnTooltipText}
                placement="top-right"
                classes={pageAccess?.write ? 'w-28' : 'w-56'}
              >
                <Trash2
                  onClick={() => {
                    if (!deleteMemberMutation.isLoading && !isDeleting && pageAccess?.write)
                      setShowDeleteMemberDialog(true);
                  }}
                  className={`h-4 w-4 text-[#242424] ${
                    isDeleting || deleteMemberMutation.isLoading
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                />
              </Tooltip>
            </span>
          )}
        </td>
      </tr>

      {isEditing &&
        createPortal(
          <CreateMemberModal
            editMode={true}
            onClose={() => setIsEditing(false)}
            key={teamMember.id}
            editData={{
              email: teamMember.email,
              roleId: teamMember.userTeamRole.sharedTeamRole.id,
              memberId: teamMember.id,
            }}
          />,
          document.body,
        )}

      {showDeleteMemberDialog &&
        createPortal(
          <ConfirmModal
            onClose={() => {
              if (!isDeleting) setShowDeleteMemberDialog(false);
            }}
            handleConfirm={deleteMemberHandler}
            label="Remove"
            message={
              currTeam.parentId
                ? 'Are you sure you want to unassign this member from the current space?'
                : 'Are you sure you want to remove this member from this Organization?'
            }
            isLoading={isDeleting}
          />,
          document.body,
        )}
    </>
  );
};
