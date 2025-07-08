import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';

import { teamAPI } from '@react/features/teams/clients';
import { AppTable } from '@react/features/teams/components/common';
import { CreateRoleModal, RolesTableRow } from '@react/features/teams/components/roles';
import { useGetTeamSettings, useStoreTeamSettings } from '@react/features/teams/hooks';
import HeaderSearch from '@react/shared/components/headerSearch';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings } from '@react/shared/hooks/useUserSettings';
import { extractError } from '@react/shared/utils/errors';
import { teamSettingKeys } from '@shared/teamSettingKeys';
import { userSettingKeys } from '@shared/userSettingKeys';
import ApiErrorLine from '@src/react/features/error-pages/components/APIErrorLine';

const RolesPage = () => {
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasSetDefaultRole, setHasSetDefaultRole] = useState(false);

  const { data, error, isLoading, isError } = useQuery({
    queryKey: ['team_roles'],
    queryFn: teamAPI.getTeamRoles,
  });

  const { data: userTeamSettings } = useGetUserSettings(userSettingKeys.USER_TEAM);
  const { data: roleSettings, isLoading: isUserSettingsLoading } = useGetTeamSettings(
    teamSettingKeys.DEFAULT_ROLE,
  );
  const currentTeamId = userTeamSettings?.userSelectedTeam;

  const saveTeamSettingsMutation = useStoreTeamSettings(teamSettingKeys.DEFAULT_ROLE);
  const queryClient = useQueryClient();

  const { userInfo, hasReadOnlyPageAccess } = useAuthCtx();
  const user = userInfo?.user;

  const isReadOnlyAccess = hasReadOnlyPageAccess('/teams/roles');

  useEffect(() => {
    if (!data?.roles || isUserSettingsLoading || hasSetDefaultRole || !currentTeamId) return;

    const ownerRole = data.roles.find((r) => r.isOwnerRole);
    const currentDefaultRole = roleSettings?.data?.defaultRoles?.[currentTeamId];

    if (
      ownerRole &&
      (!currentDefaultRole || !data.roles.some((role) => role.id === currentDefaultRole.id))
    ) {
      setHasSetDefaultRole(true);
      saveTeamSettingsMutation.mutate(
        {
          key: teamSettingKeys.DEFAULT_ROLE,
          data: { defaultRoles: { [currentTeamId]: { name: ownerRole.name, id: ownerRole.id } } },
          operation: 'insertOrUpdate',
        },
        {
          onSuccess: () => {
            queryClient.setQueryData(['teamSettings', teamSettingKeys.DEFAULT_ROLE], {
              data: {
                defaultRoles: { [currentTeamId]: { name: ownerRole.name, id: ownerRole.id } },
              },
            });
            queryClient.invalidateQueries({ queryKey: ['teamSettings'] });
          },
          onError: () => {
            setErrorMessage('Failed to set default role');
            setHasSetDefaultRole(false);
          },
        },
      );
    }
  }, [currentTeamId, data?.roles, roleSettings?.data?.defaultRoles]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);

  const filteredRoles = useMemo(() => {
    if (!data) return [];

    const filteredData = data.roles?.filter((role) =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // Sort the filtered roles
    return filteredData.sort((a, b) => {
      // Sort owner roles to the top
      if (a.isOwnerRole && !b.isOwnerRole) return -1;
      if (!a.isOwnerRole && b.isOwnerRole) return 1;

      // Sort default roles (e.g., 'admin', 'edit', 'view') after owner roles but before custom roles
      if (a.acl?.default_role && !b.acl?.default_role) return -1;
      if (!a.acl?.default_role && b.acl?.default_role) return 1;

      // If roles are of the same type (owner, default, or custom), they will be sorted alphabetically by name
      // Sort alphabetically by name if other criteria are equal
      return a.name.localeCompare(b.name);
    });
  }, [data, searchTerm]);

  const teamMembersQuery = useQuery({
    queryKey: ['team_members_list'],
    queryFn: teamAPI.getTeamMembers,
  });

  const handleError = (error) => setErrorMessage(error);
  const handleErrorClose = () => setErrorMessage('');

  const tableHeaders = [
    { name: 'Name' },
    { name: 'Members' },
    { name: 'Team Manager' },
    { name: 'Default Role' },
    { name: 'Actions' },
  ];

  return (
    <div>
      <div className="flex mb-6 justify-between flex-wrap flex-col sm:flex-row md:flex-nowrap sm:items-center">
        <HeaderSearch
          handleChange={(e) => handleSearch(e)}
          handleClick={() => setIsCreatingRole(true)}
          label="Add Role"
          addIcon
          search
          placeholder="Search Roles"
          isReadOnlyAccess={isReadOnlyAccess}
        />
      </div>

      <div className="py-2">
        <AppTable
          rows={filteredRoles || []}
          pageSize={10}
          renderRow={(role) => {
            return (
              <RolesTableRow
                teamMembers={teamMembersQuery.data?.members}
                data={role}
                canManage={user.userTeamRole.sharedTeamRole.canManageTeam}
                isDefaultRole={
                  roleSettings?.data?.defaultRoles?.[currentTeamId]
                    ? roleSettings.data.defaultRoles[currentTeamId].id === role.id
                    : role.id === data?.roles?.find((r) => r.isOwnerRole)?.id
                }
                setError={handleError}
              />
            );
          }}
          isLoading={isLoading}
          tableHeaders={tableHeaders}
        />
        <div className="py-4">
          {(isError && (
            <ApiErrorLine fullWidth errorMsg={extractError(error) || 'Error loading roles'} />
          )) ||
            (errorMessage && (
              <ApiErrorLine fullWidth errorMsg={errorMessage} onClose={handleErrorClose} />
            ))}
        </div>
      </div>

      {isCreatingRole && <CreateRoleModal onClose={() => setIsCreatingRole(false)} />}
    </div>
  );
};

export default RolesPage;
