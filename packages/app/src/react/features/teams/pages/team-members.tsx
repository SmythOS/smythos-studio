import { useQuery } from '@tanstack/react-query';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import ApiErrorLine from '@react/features/error-pages/components/APIErrorLine';
import UpSellModal from '@react/features/subscriptions/components/paywalls/up-sell';
import { teamAPI } from '@react/features/teams/clients';
import { AppTable } from '@react/features/teams/components/common';
import { MembersTableRow } from '@react/features/teams/components/members/row-table-members';
import { useGetTeamSettings } from '@react/features/teams/hooks';
import CreateMemberModal from '@react/features/teams/modals/create-member';
import HeaderSearch from '@react/shared/components/headerSearch';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings } from '@react/shared/hooks/useUserSettings';
import { TeamMemberWithRole } from '@react/shared/types/api-results.types';
import { teamSettingKeys } from '@shared/teamSettingKeys';
import { userSettingKeys } from '@shared/userSettingKeys';

const TeamMembersPage = () => {
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [upSellModalOpen, setUpSellModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['team_members_list'],
    queryFn: teamAPI.getTeamMembers,
  });
  const { data: teamRoles } = useQuery({ queryKey: ['team_roles'], queryFn: teamAPI.getTeamRoles });

  const { userInfo, userTeams, hasReadOnlyPageAccess } = useAuthCtx();
  const { subs } = userInfo || {};

  const { data: userTeamSettings } = useGetUserSettings(userSettingKeys.USER_TEAM);
  const { data: roleSettings } = useGetTeamSettings(teamSettingKeys.DEFAULT_ROLE);
  const currentTeamId = userTeamSettings?.userSelectedTeam;

  // Helper function to check if a role exists in available roles
  const isRoleAvailable = useCallback(
    (roleId: string | number) => {
      return teamRoles?.roles?.some((role) => role.id.toString() === roleId.toString());
    },
    [teamRoles?.roles],
  );

  // Helper function to find the owner role
  const findOwnerRole = useCallback(() => {
    return teamRoles?.roles?.find((r) => r.isOwnerRole);
  }, [teamRoles?.roles]);

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

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);
  const sortMembers = (members: TeamMemberWithRole[]) => {
    return [...members].sort((a, b) => {
      const roleA = a.userTeamRole.isTeamInitiator ? 0 : 1;
      const roleB = b.userTeamRole.isTeamInitiator ? 0 : 1;
      return roleA - roleB;
    });
  };

  const matchedSearchMembers = useMemo(() => {
    if (!data) return [];
    const filteredMembers = data.members?.filter(
      (member) =>
        member.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return sortMembers(filteredMembers);
  }, [data, searchTerm]);

  const handleAddMemberClick = () => {
    const currentMembersCount = data?.members?.length || 0;
    const quotaLimit = subs?.plan?.properties?.limits?.['teamMembers'] ?? Infinity;

    if (currentMembersCount >= quotaLimit) setUpSellModalOpen(true);
    else {
      upSellModalOpen && setUpSellModalOpen(false);
      setIsInvitingMember(true);
    }
  };

  const handleError = (error) => setErrorMessage(error);
  const handleErrorClose = () => setErrorMessage('');

  const tableHeaders = [{ name: 'Name' }, { name: 'Email' }, { name: 'Role' }, { name: 'Actions' }];

  return (
    <div>
      <div className="flex mb-4 justify-between flex-wrap flex-col sm:flex-row md:flex-nowrap sm:items-center">
        <HeaderSearch
          handleChange={(e) => handleSearch(e)}
          handleClick={handleAddMemberClick}
          label="Invite Member"
          addIcon
          search
          placeholder="Search Members"
          isReadOnlyAccess={isReadOnlyAccess}
        />
      </div>

      <div className="py-6">
        <AppTable
          rows={matchedSearchMembers || []}
          pageSize={10}
          renderRow={(member) => <MembersTableRow teamMember={member} setError={handleError} />}
          isLoading={isLoading}
          tableHeaders={tableHeaders}
        />

        <div className="py-4">
          {isError && <ApiErrorLine fullWidth errorMsg="Error loading members" />}
          {errorMessage && (
            <ApiErrorLine fullWidth errorMsg={errorMessage} onClose={handleErrorClose} />
          )}
        </div>
      </div>

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
    </div>
  );
};

export default TeamMembersPage;
