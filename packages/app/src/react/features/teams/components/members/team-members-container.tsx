/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any */
import { Dispatch, FC, SetStateAction, useMemo } from 'react';

import { PendingInvite } from '@react/features/teams/hooks/useTeamInvitations';
import { TeamMemberWithRole } from '@react/shared/types/api-results.types';
import { TeamMembersHeader } from './header';
import { MembersTable } from './table';

// Type for members that extends the required AppTable row interface
interface TeamMemberWithStringId extends Omit<TeamMemberWithRole, 'id'> {
  id: string;
}

interface TeamMembersContainerProps {
  tab: string;
  setTab: Dispatch<SetStateAction<string>>;
  isReadOnlyAccess: boolean;
  localPendingInvites: PendingInvite[];
  teamMembers: TeamMemberWithRole[];
  membersSearchTerm: string;
  invitesSearchTerm: string;
  setMembersSearchTerm: Dispatch<SetStateAction<string>>;
  setInvitesSearchTerm: Dispatch<SetStateAction<string>>;
  handleAddMemberClick: () => void;
  handleError: (error: any) => void;
  errorMessage: string;
  handleErrorClose: () => void;
  handleResendInvite: (invite: PendingInvite) => Promise<void>;
  handleDeleteInvite: (id: string) => Promise<void>;
  rowLoading: { [id: string]: boolean };
  rowDeleting: { [id: string]: boolean };
  rowFadeOut: { [id: string]: boolean };
  hasPendingInviteForEmail: (email: string) => boolean;
  getFilteredMembers: (members: TeamMemberWithRole[], searchTerm: string) => TeamMemberWithRole[];
  getMembersWithStringId: (members: TeamMemberWithRole[]) => TeamMemberWithStringId[];
  getFilteredInvites: (invites: PendingInvite[], searchTerm: string) => PendingInvite[];
}

/**
 * Container component that combines header and table functionality for team members management
 * @param props - Component props including data, handlers, and state
 * @returns JSX element containing the complete team members interface
 */
export const TeamMembersContainer: FC<TeamMembersContainerProps> = ({
  tab,
  setTab,
  isReadOnlyAccess,
  localPendingInvites,
  teamMembers,
  membersSearchTerm,
  invitesSearchTerm,
  setMembersSearchTerm,
  setInvitesSearchTerm,
  handleAddMemberClick,
  handleError,
  errorMessage,
  handleErrorClose,
  handleResendInvite,
  handleDeleteInvite,
  rowLoading,
  rowDeleting,
  rowFadeOut,
  hasPendingInviteForEmail,
  getFilteredMembers,
  getMembersWithStringId,
  getFilteredInvites,
}) => {
  // Get filtered data using the provided functions
  const filteredMembers = useMemo(
    () => getFilteredMembers(teamMembers, membersSearchTerm),
    [teamMembers, membersSearchTerm, getFilteredMembers],
  );

  const filteredMembersWithStringId = useMemo(
    () => getMembersWithStringId(filteredMembers),
    [filteredMembers, getMembersWithStringId],
  );

  const filteredPendingInvites = useMemo(
    () => getFilteredInvites(localPendingInvites, invitesSearchTerm),
    [localPendingInvites, invitesSearchTerm, getFilteredInvites],
  );

  return (
    <>
      <TeamMembersHeader
        tab={tab}
        setTab={setTab}
        isReadOnlyAccess={isReadOnlyAccess}
        localPendingInvites={localPendingInvites}
        setMembersSearchTerm={setMembersSearchTerm}
        setInvitesSearchTerm={setInvitesSearchTerm}
        handleAddMemberClick={handleAddMemberClick}
      />

      <MembersTable
        tab={tab}
        setTab={setTab}
        filteredMembersWithStringId={filteredMembersWithStringId}
        filteredPendingInvites={filteredPendingInvites}
        handleError={handleError}
        errorMessage={errorMessage}
        handleErrorClose={handleErrorClose}
        handleResendInvite={handleResendInvite}
        handleDeleteInvite={handleDeleteInvite}
        rowLoading={rowLoading}
        rowDeleting={rowDeleting}
        rowFadeOut={rowFadeOut}
        isReadOnlyAccess={isReadOnlyAccess}
        hasPendingInviteForEmail={hasPendingInviteForEmail}
      />
    </>
  );
};
