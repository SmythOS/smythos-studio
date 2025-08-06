/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any */
import { format } from 'date-fns';
import { useState } from 'react';

import { teamAPI } from '@react/features/teams/clients';
import { errorToast, successToast } from '@shared/components/toast';
import { PendingInvite } from './useTeamInvitations';

/**
 * Custom hook for managing invitation actions (resend, delete)
 * @param teamRoles - Array of available team roles
 * @param isReadOnlyAccess - Boolean indicating if user has read-only access
 * @returns Object containing action handlers and loading states
 */
export const useInvitationActions = (teamRoles: any[] = [], isReadOnlyAccess: boolean = false) => {
  // Local state for loading and deleting per invite
  const [rowLoading, setRowLoading] = useState<{ [id: string]: boolean }>({});
  const [rowDeleting, setRowDeleting] = useState<{ [id: string]: boolean }>({});
  const [rowFadeOut, setRowFadeOut] = useState<{ [id: string]: boolean }>({});

  /**
   * Handles resending an invitation
   * @param invite - The invitation to resend
   * @param onInviteUpdated - Callback to update local invites state
   */
  const handleResendInvite = async (
    invite: PendingInvite,
    onInviteUpdated: (updater: (prev: PendingInvite[]) => PendingInvite[]) => void,
  ) => {
    // Check permissions first
    if (isReadOnlyAccess) {
      errorToast('You do not have permission to resend invitations');
      return;
    }

    setRowLoading((prev) => ({ ...prev, [invite.id]: true }));
    try {
      if (invite.email && invite.roleId) {
        const res = await teamAPI.inviteTeamMember({ email: invite.email, roleId: invite.roleId });
        const data = await res.json();
        if (data && data.invitation) {
          // Find the role name from teamRoles
          const roleName =
            teamRoles?.find((r) => r.id === data.invitation.teamRoleId)?.name || invite.role;

          onInviteUpdated((prev) => {
            // Remove the specific expired invite being resent
            const filtered = prev.filter((i) => i.id !== invite.id);

            // Create the new invite object in the expected format
            const newInvite: PendingInvite = {
              id: String(data.invitation.id),
              email: data.invitation.email,
              role: roleName,
              expires: data.invitation.expiresAt
                ? format(new Date(data.invitation.expiresAt), 'MMMM d, yyyy')
                : '',
              status: 'Pending',
              roleId: data.invitation.teamRoleId,
              expiresAt: data.invitation.expiresAt,
            };

            // Add the new invite to remaining invites and sort by expiry date (latest first)
            const updated = [newInvite, ...filtered].sort((a, b) => {
              const aTime = new Date(a.expiresAt).getTime();
              const bTime = new Date(b.expiresAt).getTime();
              return bTime - aTime;
            });

            return updated;
          });
        }
        successToast('Invite resent successfully');
      } else {
        errorToast('Cannot resend invite: missing email or role');
      }
    } catch (err) {
      let msg = 'Failed to resend invite';
      try {
        // Handle different error response formats
        if (err?.response) {
          const errorData = await err.response.json();
          if (errorData?.error?.message) {
            msg = errorData.error.message;
          }
        } else if (err?.message) {
          msg = err.message;
        }
      } catch {
        // If we can't parse the error, keep the default message
      }
      errorToast(msg);
    } finally {
      setRowLoading((prev) => ({ ...prev, [invite.id]: false }));
    }
  };

  /**
   * Handles deleting an invitation
   * @param id - The invitation ID to delete
   * @param onInviteDeleted - Callback to remove invite from local state
   */
  const handleDeleteInvite = async (id: string, onInviteDeleted: (id: string) => void) => {
    // Check permissions first
    if (isReadOnlyAccess) {
      errorToast('You do not have permission to delete invitations');
      return;
    }

    setRowDeleting((prev) => ({ ...prev, [id]: true }));
    setRowFadeOut((prev) => ({ ...prev, [id]: false }));
    try {
      await fetch(`/api/page/teams/invitations/${id}`, { method: 'DELETE' });
      successToast('Invite deleted successfully');
      setRowFadeOut((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => {
        onInviteDeleted(id);
        setRowDeleting((prev) => ({ ...prev, [id]: false }));
        setRowFadeOut((prev) => ({ ...prev, [id]: false }));
      }, 500);
    } catch (err) {
      let msg = 'Failed to delete invite';
      try {
        // Handle different error response formats
        if (err?.response) {
          const errorData = await err.response.json();
          if (errorData?.error?.message) {
            msg = errorData.error.message;
          }
        } else if (err?.message) {
          msg = err.message;
        }
      } catch {
        // If we can't parse the error, keep the default message
      }
      errorToast(msg);
      setRowDeleting((prev) => ({ ...prev, [id]: false }));
    }
  };

  return { rowLoading, rowDeleting, rowFadeOut, handleResendInvite, handleDeleteInvite };
};
