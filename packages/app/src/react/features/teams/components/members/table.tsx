/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any */

import { Dispatch, FC, SetStateAction, useMemo } from 'react';

import ApiErrorLine from '@react/features/error-pages/components/APIErrorLine';
import { AppTable } from '@react/features/teams/components/common';
import { MembersTableRow, PendingInvitesTableRow } from '@react/features/teams/components/members';
import { PendingInvite } from '@react/features/teams/hooks';
import { Tabs, TabsContent } from '@react/shared/components/ui/tabs';
import { TeamMemberWithRole } from '@react/shared/types/api-results.types';

// Type for members that extends the required AppTable row interface
interface TeamMemberWithStringId extends Omit<TeamMemberWithRole, 'id'> {
  id: string;
}

interface MembersTableProps {
  tab: string;
  setTab: Dispatch<SetStateAction<string>>;
  filteredMembersWithStringId: TeamMemberWithStringId[];
  filteredPendingInvites: PendingInvite[];
  handleError: (error: any) => void;
  errorMessage: string;
  handleErrorClose: () => void;
  // Additional props for invite functionality
  handleResendInvite: (invite: PendingInvite) => Promise<void>;
  handleDeleteInvite: (id: string) => Promise<void>;
  rowLoading: { [id: string]: boolean };
  rowDeleting: { [id: string]: boolean };
  rowFadeOut: { [id: string]: boolean };
  isReadOnlyAccess: boolean;
  hasPendingInviteForEmail: (email: string) => boolean;
}

export const MembersTable: FC<MembersTableProps> = ({
  tab,
  setTab,
  filteredMembersWithStringId,
  filteredPendingInvites,
  handleError,
  errorMessage,
  handleErrorClose,
  handleResendInvite,
  handleDeleteInvite,
  rowLoading,
  rowDeleting,
  rowFadeOut,
  isReadOnlyAccess,
  hasPendingInviteForEmail,
}) => {
  // Table headers for members tab
  const membersTableHeaders = useMemo(
    () => [{ name: 'Name' }, { name: 'Email' }, { name: 'Role' }, { name: 'Actions' }],
    [],
  );

  // Table headers for invites tab
  const invitesTableHeaders = useMemo(
    () => [
      { name: 'Email' },
      { name: 'Role' },
      { name: 'Expires' },
      { name: '' }, // Status badge column, no heading
      { name: 'Actions' },
    ],
    [],
  );

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsContent value="members">
        <div className="py-6">
          <AppTable
            rows={filteredMembersWithStringId || []}
            pageSize={10}
            renderRow={(member) => (
              <MembersTableRow
                teamMember={{ ...member, id: Number(member.id) }}
                setError={handleError}
              />
            )}
            isLoading={false}
            tableHeaders={membersTableHeaders}
          />
          <div className="py-4">
            {errorMessage && (
              <ApiErrorLine fullWidth errorMsg={errorMessage} onClose={handleErrorClose} />
            )}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="invites">
        <div className="py-6">
          <AppTable
            rows={filteredPendingInvites}
            pageSize={10}
            renderRow={(invite) => (
              <PendingInvitesTableRow
                invite={invite}
                onResend={handleResendInvite}
                onDelete={handleDeleteInvite}
                loading={rowLoading[invite.id] || false}
                deleting={rowDeleting[invite.id] || false}
                fadeOut={rowFadeOut[invite.id] || false}
                isReadOnlyAccess={isReadOnlyAccess}
                hasPendingInviteForEmail={hasPendingInviteForEmail}
              />
            )}
            isLoading={false}
            tableHeaders={invitesTableHeaders}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
};
