/* eslint-disable react-hooks/exhaustive-deps */
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import ApiErrorLine from '@react/features/error-pages/components/APIErrorLine';
import { subTeamsAPI } from '@react/features/teams/clients';
import { AppTable, AssignMemberModal, CreateSpace } from '@react/features/teams/components/common';
import { TeamsTableRow } from '@react/features/teams/components/teams';
import HeaderSearch from '@react/shared/components/headerSearch';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings } from '@react/shared/hooks/useUserSettings';
import { TeamRoleWithMembers } from '@react/shared/types/api-results.types';
import { extractError } from '@react/shared/utils/errors';
import { userSettingKeys } from '@shared/userSettingKeys';

export const TeamsPage = () => {
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [allAllowedMembers, setAllAllowedMembers] = useState([]);
  const [filteredTeamMembers, setFilteredTeamMembers] = useState([]);
  const [isAssigningMember, setIsAssigningMember] = useState(false);
  const [newTeamData, setNewTeamData] = useState(null);

  const { data, error, isLoading, isError } = useQuery({
    queryKey: ['getSubTeams'],
    queryFn: subTeamsAPI.getSubTeams,
  });
  const { userInfo, userTeams } = useAuthCtx();

  const { data: userSettings } = useGetUserSettings(userSettingKeys.USER_TEAM);
  // const currTeam = userTeams.filter((t) => t.id === userSettings?.userSelectedTeam)[0];
  const organization = userTeams.filter((t) => t.parentId === null)[0];
  const isReadOnlyAccess = !userInfo?.user?.userTeamRole?.isTeamInitiator;

  useEffect(() => {
    userInfo?.user?.roles?.filter(
      (role) => role.sharedTeamRole?.team?.id === userSettings?.userSelectedTeam,
    )?.[0];
  }, [userInfo]);

  // New query for fetching team members
  const organizationMembersQuery = useQuery({
    queryKey: ['organizationMembers'],
    queryFn: () => subTeamsAPI.getTeamMembers(organization.id),
    onSuccess: (response) => {
      const teamMembers = response.members.filter((member) => !member.userTeamRole.isTeamInitiator);
      setAllAllowedMembers(teamMembers || []);
    },
  });
  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredTeams: any = useMemo(() => {
    if (!userInfo?.user?.roles?.length) return [];
    return userInfo?.user?.roles
      ?.filter((team) => {
        return (
          team?.sharedTeamRole?.team?.parentId &&
          team?.sharedTeamRole?.team?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .map((team) => {
        return {
          id: team.sharedTeamRole.team.id,
          isOwnerRole: team.isTeamInitiator,
          canManageTeam: team.sharedTeamRole.canManageTeam,
          acl: team.sharedTeamRole.acl,
          name: team.sharedTeamRole.team.name,
          members: [],
        };
      });
  }, [data, searchTerm, userInfo]);

  useEffect(() => {
    const updateMembers = async () => {
      filteredTeams.forEach(async (team) => {
        const members = await subTeamsAPI.getTeamMembers(team.id);
        setFilteredTeamMembers((prev) => {
          return {
            ...prev,
            [team.id]: members?.members,
            // members?.members?.filter((member) => !member?.userTeamRole?.isTeamInitiator) || [],
          };
        });
      });
    };
    updateMembers();
  }, [filteredTeams]);

  const handleErrorClose = () => setErrorMessage('');

  const tableHeaders = [
    { name: 'Name' },
    { name: 'Members' },
    { name: 'Manager' },
    { name: 'Actions' },
  ];

  return (
    <div>
      <div className="flex mb-4 justify-between flex-wrap flex-col sm:flex-row md:flex-nowrap sm:items-center">
        <h2 className="text-2xl font-semibold mb-1">Spaces</h2>

        <HeaderSearch
          handleChange={(e) => handleSearch(e)}
          handleClick={() => setIsCreatingTeam(true)}
          label="Add Team"
          addIcon
          search
          placeholder="Search Spaces"
          isReadOnlyAccess={isReadOnlyAccess}
          isButtonHidden={true} // due to it being redundant with the add button in dropdown
        />
      </div>
      <div className="py-6">
        <AppTable
          rows={filteredTeams || []}
          renderRow={(team: TeamRoleWithMembers) => {
            return (
              <TeamsTableRow
                teamMembers={filteredTeamMembers?.[team.id] || []}
                data={{
                  id: team.id,
                  isOwnerRole: team.isOwnerRole,
                  canManageTeam: team.canManageTeam,
                  name: team.name,
                  acl: team.acl,
                  userTeamRole: team.userTeamRole,
                }}
                canManage={team.canManageTeam}
                allMembers={allAllowedMembers}
              />
            );
          }}
          isLoading={isLoading || organizationMembersQuery.isLoading}
          tableHeaders={tableHeaders}
        />
        <div className="py-4">
          {(isError || organizationMembersQuery.isError) && (
            <ApiErrorLine
              fullWidth
              errorMsg={
                extractError(error || organizationMembersQuery.error) || 'Error loading data'
              }
            />
          )}
          {errorMessage && (
            <ApiErrorLine fullWidth errorMsg={errorMessage} onClose={handleErrorClose} />
          )}
        </div>
      </div>
      <CreateSpace
        isOpen={isCreatingTeam}
        onSubmit={() => setIsAssigningMember(true)}
        onClose={(data) => {
          setIsCreatingTeam(false);
          setNewTeamData(data);
        }}
        parentTeam={organization}
      />
      {isAssigningMember &&
        createPortal(
          <AssignMemberModal
            isOpen={isAssigningMember}
            onClose={() => setIsAssigningMember(false)}
            onSubmit={() => {}}
            newTeamData={{ ...newTeamData, owner: userInfo?.user?.name || userInfo?.user?.email }}
            options={allAllowedMembers}
          />,
          document.body,
        )}
    </div>
  );
};
