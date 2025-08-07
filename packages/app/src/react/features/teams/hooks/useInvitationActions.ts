/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any */
import { format } from 'date-fns';
import { useState } from 'react';

import { teamAPI } from '@react/features/teams/clients';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { errorToast, successToast } from '@shared/components/toast';
import { PendingInvite, useTeamInvitations } from './useTeamInvitations';
import { useTeamMembers } from './useTeamMembers';

/**
 * Custom hook for managing invitation actions (resend, delete)
 * @param teamRoles - Array of available team roles
 * @param isReadOnlyAccess - Boolean indicating if user has read-only access
 * @returns Object containing action handlers and loading states
 */
export const useInvitationActions = (teamRoles: any[] = [], isReadOnlyAccess: boolean = false) => {
  const _USE_PENDING_INVITES_AS_SEATS = false;
  // Local state for loading and deleting per invite
  const [rowLoading, setRowLoading] = useState<{ [id: string]: boolean }>({});
  const [rowDeleting, setRowDeleting] = useState<{ [id: string]: boolean }>({});
  const [rowFadeOut, setRowFadeOut] = useState<{ [id: string]: boolean }>({});

  // Modal state for seat limit warning
  const [showSeatLimitModal, setShowSeatLimitModal] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<{
    invite: PendingInvite;
    onInviteUpdated: (updater: (prev: PendingInvite[]) => PendingInvite[]) => void;
  } | null>(null);

  // Get auth context and team data for seat limit validation
  const { userInfo } = useAuthCtx();
  const { teamMembers } = useTeamMembers();
  const { getPendingInvites } = useTeamInvitations(teamRoles, teamMembers);

  /**
   * Calculates seat pricing information
   */
  const getSeatPricingInfo = () => {
    const teamSeats = userInfo?.subs?.properties?.['seatsIncluded'] || 1;
    const filteredTeamMembers =
      teamMembers?.filter((member) => !member.email.toLowerCase().includes('@smythos.com')) || [];
    const filteredPendingInvites =
      getPendingInvites?.filter(
        (pendingInvite) => !pendingInvite.email.toLowerCase().includes('@smythos.com'),
      ) || [];
    const totalOccupiedSeats =
      filteredTeamMembers.length +
      (_USE_PENDING_INVITES_AS_SEATS ? filteredPendingInvites.length : 0);
    const remainingSeats = teamSeats - totalOccupiedSeats;

    const priceItem =
      userInfo?.subs?.object?.['items']?.data?.filter?.(
        (item) => item?.price?.metadata?.for === 'user seats',
      ) || [];
    let price = 0;
    if (priceItem.length > 0) {
      price = priceItem[0].price?.unit_amount;
    }
    const pricePerSeat = price / 100;

    return {
      teamSeats,
      remainingSeats,
      pricePerSeat,
      isSmythosFree: userInfo?.subs?.plan?.name?.toLowerCase() === 'smythos free',
    };
  };

  /**
   * Proceeds with sending the invite after user confirmation
   */
  const proceedWithInvite = async (
    invite?: PendingInvite,
    onInviteUpdated?: (updater: (prev: PendingInvite[]) => PendingInvite[]) => void,
  ) => {
    // Use parameters if provided, otherwise use state
    const currentInvite = invite || pendingInvite?.invite;
    const onInviteUpdatedToUse = onInviteUpdated || pendingInvite?.onInviteUpdated;

    if (!currentInvite || !onInviteUpdatedToUse) {
      return;
    }

    setShowSeatLimitModal(false);
    setPendingInvite(null);

    setRowLoading((prev) => ({ ...prev, [currentInvite.id]: true }));
    try {
      if (currentInvite.email && currentInvite.roleId) {
        const res = await teamAPI.inviteTeamMember({
          email: currentInvite.email,
          roleId: currentInvite.roleId,
        });
        const data = await res.json();
        if (data && data.invitation) {
          // Find the role name from teamRoles
          const roleName =
            teamRoles?.find((r) => r.id === data.invitation.teamRoleId)?.name || currentInvite.role;

          onInviteUpdatedToUse((prev) => {
            // Remove the specific expired invite being resent
            const filtered = prev.filter((i) => i.id !== currentInvite.id);

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
      setRowLoading((prev) => ({ ...prev, [currentInvite.id]: false }));
    }
  };

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

    // Check seat limits
    const { remainingSeats, isSmythosFree } = getSeatPricingInfo();

    if (remainingSeats < 1) {
      if (isSmythosFree) {
        errorToast('Plan seat limit reached. Upgrade your plan to add more seats.');
        return;
      }

      // Show confirmation modal for paid plans
      setPendingInvite({ invite, onInviteUpdated });
      setShowSeatLimitModal(true);
      return;
    }

    // Proceed directly if seats are available
    proceedWithInvite(invite, onInviteUpdated);
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

  /**
   * Closes the seat limit modal
   */
  const closeSeatLimitModal = () => {
    setShowSeatLimitModal(false);
    setPendingInvite(null);
  };

  /**
   * Gets the modal props for rendering
   */
  const getSeatLimitModalProps = () => {
    if (!showSeatLimitModal) return null;

    const { pricePerSeat } = getSeatPricingInfo();

    return {
      onClose: closeSeatLimitModal,
      message: 'Seat Limit Reached',
      lowMsg: `Adding a new member while on the ${userInfo?.subs?.plan?.name} plan will incur an additional charge of $${pricePerSeat}/mo per seat.`,
      label: 'Continue',
      handleConfirm: () => proceedWithInvite(),
      handleCancel: closeSeatLimitModal,
      cancelLabel: 'Cancel',
      isLoading: pendingInvite ? rowLoading[pendingInvite.invite.id] : false,
    };
  };

  return {
    rowLoading,
    rowDeleting,
    rowFadeOut,
    handleResendInvite,
    handleDeleteInvite,
    showSeatLimitModal,
    getSeatLimitModalProps,
    closeSeatLimitModal,
  };
};
