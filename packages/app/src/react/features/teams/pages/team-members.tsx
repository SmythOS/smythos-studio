/* eslint-disable @typescript-eslint/no-explicit-any */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import UpSellModal from '@react/features/subscriptions/components/paywalls/up-sell';
import { teamAPI } from '@react/features/teams/clients';
import { TeamMembersContainer } from '@react/features/teams/components/members';
import {
  useGetTeamSettings,
  useInvitationActions,
  useTeamInvitations,
  useTeamMembers,
} from '@react/features/teams/hooks';
import { PendingInvite } from '@react/features/teams/hooks/useTeamInvitations';
import CreateMemberModal from '@react/features/teams/modals/create-member';
import ConfirmModal from '@react/shared/components/ui/modals/ConfirmModal';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings } from '@react/shared/hooks/useUserSettings';
import { teamSettingKeys } from '@shared/teamSettingKeys';
import { userSettingKeys } from '@shared/userSettingKeys';

const TeamMembersPage = () => {
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [upSellModalOpen, setUpSellModalOpen] = useState(false);
  const [tab, setTab] = useState('members');
  const [membersSearchTerm, setMembersSearchTerm] = useState('');
  const [invitesSearchTerm, setInvitesSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [localPendingInvites, setLocalPendingInvites] = useState<PendingInvite[]>([]);
  const prevPendingInvitesRef = useRef<PendingInvite[]>([]);

  const { userInfo, userTeams, hasReadOnlyPageAccess } = useAuthCtx();
  const { data: userTeamSettings } = useGetUserSettings(userSettingKeys.USER_TEAM);
  const { data: roleSettings } = useGetTeamSettings(teamSettingKeys.DEFAULT_ROLE);
  const currentTeamId = userTeamSettings?.userSelectedTeam;

  // Get team roles data
  const { data: teamRolesData } = useQuery({
    queryKey: ['team_roles'],
    queryFn: teamAPI.getTeamRoles,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: 0,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const teamRoles = (teamRolesData as any)?.roles || [];

  // Use custom hooks for data management
  const { teamMembers, getFilteredMembers, getMembersWithStringId } = useTeamMembers();
  const { getPendingInvites, getFilteredInvites, hasPendingInviteForEmail } = useTeamInvitations(
    teamRoles,
    teamMembers,
  );
  const {
    rowLoading,
    rowDeleting,
    rowFadeOut,
    handleResendInvite,
    handleDeleteInvite,
    showSeatLimitModal,
    getSeatLimitModalProps,
  } = useInvitationActions(teamRoles, hasReadOnlyPageAccess('/teams/members'));

  // Always sync localPendingInvites with fresh getPendingInvites data
  useEffect(() => {
    // Only update if the data actually changed (deep comparison)
    if (JSON.stringify(prevPendingInvitesRef.current) !== JSON.stringify(getPendingInvites)) {
      setLocalPendingInvites(getPendingInvites);
      prevPendingInvitesRef.current = getPendingInvites;
    }
  }, [getPendingInvites]);

  // Helper function to check if a role exists in available roles
  const isRoleAvailable = useCallback(
    (roleId: string | number) => {
      return teamRoles?.some((role: any) => role.id.toString() === roleId.toString());
    },
    [teamRoles],
  );

  // Helper function to find the owner role
  const findOwnerRole = useCallback(() => {
    return teamRoles?.find((r: any) => r.isOwnerRole);
  }, [teamRoles]);

  // Get the default role ID for the current team
  const getDefaultRoleId = useCallback(() => {
    // Use team-specific default role if available
    const defaultRole = roleSettings?.data?.defaultRoles?.[currentTeamId];
    if (defaultRole?.id && isRoleAvailable(defaultRole.id)) return Number(defaultRole.id);

    // Fallback to owner role
    const ownerRole = findOwnerRole();
    return ownerRole?.id;
  }, [currentTeamId, roleSettings?.data?.defaultRoles, isRoleAvailable, findOwnerRole]);

  const currTeam = userTeams.filter((t) => t.id === userTeamSettings?.userSelectedTeam)[0];

  // Handle team type routing
  useEffect(() => {
    if (currTeam) {
      if (window.location.pathname.includes('teams/members') && currTeam.parentId !== null) {
        window.location.href = '/teams/settings';
        return;
      } else if (window.location.pathname.includes('teams/settings') && currTeam.parentId == null) {
        window.location.href = '/teams/members';
        return;
      }
    }
  }, [currTeam]);

  const isReadOnlyAccess = hasReadOnlyPageAccess('/teams/members');

  const handleAddMemberClick = () => {
    const currentMembersCount = teamMembers?.length || 0;
    const quotaLimit = userInfo?.subs?.plan?.properties?.limits?.['teamMembers'] ?? Infinity;

    if (currentMembersCount >= quotaLimit) setUpSellModalOpen(true);
    else {
      upSellModalOpen && setUpSellModalOpen(false);
      setIsInvitingMember(true);
    }
  };

  const handleError = (error: any) => setErrorMessage(error);
  const handleErrorClose = () => setErrorMessage('');

  // Wrapper functions for invitation actions
  const handleResendInviteWrapper = useCallback(
    async (invite: PendingInvite) => {
      await handleResendInvite(invite, setLocalPendingInvites);
    },
    [handleResendInvite],
  );

  const handleDeleteInviteWrapper = useCallback(
    async (id: string) => {
      await handleDeleteInvite(id, (deletedId) => {
        setLocalPendingInvites((prev) => prev.filter((invite) => invite.id !== deletedId));
      });
    },
    [handleDeleteInvite],
  );

  // Helper function to check if there's a pending invite for the same email
  const hasPendingInviteForEmailWrapper = useCallback(
    (email: string) => {
      return hasPendingInviteForEmail(localPendingInvites, email);
    },
    [localPendingInvites, hasPendingInviteForEmail],
  );

  // Get modal props for seat limit confirmation
  const modalProps = getSeatLimitModalProps();

  return (
    <div className="w-full pl-12 md:pl-0">
      <TeamMembersContainer
        tab={tab}
        setTab={setTab}
        rowFadeOut={rowFadeOut}
        rowLoading={rowLoading}
        rowDeleting={rowDeleting}
        teamMembers={teamMembers}
        errorMessage={errorMessage}
        isReadOnlyAccess={isReadOnlyAccess}
        membersSearchTerm={membersSearchTerm}
        invitesSearchTerm={invitesSearchTerm}
        localPendingInvites={localPendingInvites}
        handleError={handleError}
        handleErrorClose={handleErrorClose}
        getFilteredInvites={getFilteredInvites}
        getFilteredMembers={getFilteredMembers}
        setMembersSearchTerm={setMembersSearchTerm}
        setInvitesSearchTerm={setInvitesSearchTerm}
        handleAddMemberClick={handleAddMemberClick}
        handleResendInvite={handleResendInviteWrapper}
        handleDeleteInvite={handleDeleteInviteWrapper}
        getMembersWithStringId={getMembersWithStringId}
        hasPendingInviteForEmail={hasPendingInviteForEmailWrapper}
      />

      {isInvitingMember && (
        <CreateMemberModal
          onClose={() => setIsInvitingMember(false)}
          defaultRole={Number(getDefaultRoleId())}
        />
      )}
      {upSellModalOpen && (
        <UpSellModal
          onClose={() => setUpSellModalOpen(false)}
          analytics={{
            page_url: '/teams/members',
            source: 'quota limit reached for adding more team members',
          }}
        >
          Upgrade your plan to add more members.
        </UpSellModal>
      )}

      {/* Seat limit confirmation modal */}
      {showSeatLimitModal && modalProps && (
        <ConfirmModal width="w-[500px]" hideCancel={true} {...modalProps} />
      )}
    </div>
  );
};

export default TeamMembersPage;
