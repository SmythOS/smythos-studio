/* eslint-disable react-hooks/exhaustive-deps */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';
import { ChangeEvent, FC, useEffect, useMemo, useRef, useState } from 'react';
import { AiOutlineDelete } from 'react-icons/ai';
import { FaPlus } from 'react-icons/fa6';
import { toast } from 'react-toastify';

import ApiErrorLine from '@react/features/error-pages/components/APIErrorLine';
import { subTeamsAPI } from '@react/features/teams/clients';
import { AssignMemberModal, CreateSpace } from '@react/features/teams/components/common';
import { CompanyLogo, SettingsModal, TeamInfo } from '@react/features/teams/components/settings';
import { useGetTeamSettings, useStoreTeamSettings } from '@react/features/teams/hooks';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { Spinner } from '@react/shared/components/ui/spinner';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings } from '@react/shared/hooks/useUserSettings';
import { apiResultsTypes } from '@react/shared/types';
import { ITeam } from '@react/shared/types/entities';
import { extractError } from '@react/shared/utils/errors';
import { PostHog } from '@shared/posthog';
import { EVENTS } from '@shared/posthog/constants/events';
import { Analytics } from '@shared/posthog/services/analytics';
import { teamSettingKeys } from '@shared/teamSettingKeys';
import { userSettingKeys } from '@shared/userSettingKeys';
import { Members } from '../components/settings/members';

export type SpaceMember = {
  id: number;
  email: string;
  createdAt: string;
  name: string | null;
  avatar: string | null;
  userTeamRole: {
    userSpecificAcl: unknown;
    isTeamInitiator: boolean;
    sharedTeamRole: { name: string; id: number; isOwnerRole: boolean; canManageTeam: boolean };
  };
};

// const ROWS_PER_PAGE = 4;

export const SpaceSettings: FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigningMember, setIsAssigningMember] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  // const [currentPage, setCurrentPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [spaceMembers, setSpaceMembers] = useState([]);
  const [isOrganizationMembersLoading, setIsOrganizationMembersLoading] = useState(true);
  const [organizationMembers, setOrganizationMembers] = useState([]);
  const [inActionMember, setInActionMember] = useState(null);
  const [isDeleteSpaceOpen, setIsDeleteSpaceOpen] = useState(false);
  const [canDeleteSpace, setCanDeleteSpace] = useState(false);
  const [isDeleteMemberOpen, setIsDeleteMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SpaceMember | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const [totalPages, setTotalPages] = useState(1);

  const { userTeams, userInfo, getPageAccess, refreshUserData } = useAuthCtx();
  const { data: userSettings } = useGetUserSettings(userSettingKeys.USER_TEAM);
  const queryClient = useQueryClient();
  const { data: companyLogo } = useGetTeamSettings(teamSettingKeys.COMPANY_LOGO);
  const storeTeamSettings = useStoreTeamSettings(teamSettingKeys.COMPANY_LOGO);

  const canUseWhiteLabel = useMemo(() => {
    return userInfo?.subs?.plan?.properties?.flags?.whitelabel;
  }, [userInfo?.subs]);

  const currTeam = userTeams.find((team: ITeam) => team.id === userSettings?.userSelectedTeam);
  const organization = userTeams.filter((t) => t.parentId === null)[0];
  const membersAccess = getPageAccess('/teams/members');
  const teamsAccess = getPageAccess('/teams');

  const saveCompanyLogoMutation = useMutation({
    mutationKey: ['saveCompanyLogo'],
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/page/teams/company-logo/upload', {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
    onSuccess(data) {
      if (data.url) {
        setLogo(data.url);
        storeTeamSettings.mutate(
          { url: data.url },
          {
            onSuccess: () => {
              queryClient.invalidateQueries(['teamSettings', teamSettingKeys.COMPANY_LOGO]);
            },
          },
        );
        toast.success('Company logo updated successfully');
      }
    },
    onError: () => toast.error('Failed to upload company logo. Please try again.'),
  });

  useEffect(() => {
    if (companyLogo?.url) setLogo(companyLogo.url);
  }, [companyLogo]);

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // setCurrentPage(1);
  };

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as 'name' | 'email' | 'role');
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

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
        } else if (extractError(error)) {
          _errorMessage = extractError(error);
        }
      }
      toast(_errorMessage);
    },
    onSuccess: (response) => {
      toast('Team deleted', { type: 'success' });
      PostHog.track(EVENTS.ACCOUNT_HIERARCHY_EVENTS.SPACE_DELETED, {});
      window.location.href = '/';
      return response;
    },
  });

  const teamMembersQuery = useMutation({
    mutationFn: subTeamsAPI.getTeamMembers,
    onError: () => setErrorMessage('Failed to fetch team members'),
  });

  const getMembers = async () => {
    if (currTeam?.id && !spaceMembers.length) {
      const response = await teamMembersQuery.mutateAsync(currTeam.id);
      setSpaceMembers(response.members || []);

      if (
        userInfo?.user?.email ===
        response.members.find((m) => m?.userTeamRole?.isTeamInitiator)?.email
      ) {
        setCanDeleteSpace(true);
      }
    }

    if (organization?.id && !organizationMembers.length) {
      const response = await teamMembersQuery.mutateAsync(organization.id);
      setIsOrganizationMembersLoading(false);
      setOrganizationMembers(response.members || []);
    }
  };

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
    getMembers();
  }, [currTeam]);

  const paginatedMembers = useMemo(() => {
    let result = spaceMembers || [];

    result = result.filter((member) => !member.isHidden);
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        (member) =>
          (member?.name?.toLowerCase().includes(lowerSearchTerm) ?? false) ||
          member?.email.toLowerCase().includes(lowerSearchTerm) ||
          member?.userTeamRole?.sharedTeamRole?.name.toLowerCase().includes(lowerSearchTerm),
      );
    }
    result.sort((a, b) => {
      let compareA: string;
      let compareB: string;
      switch (sortBy) {
        case 'name':
          compareA = a.name ?? a.email;
          compareB = b.name || b.email;
          break;
        case 'email':
          compareA = a.email;
          compareB = b.email;
          break;
        case 'role':
          compareA = a.userTeamRole.sharedTeamRole.name;
          compareB = b.userTeamRole.sharedTeamRole.name;
          break;
        default:
          return 0;
      }
      return sortDirection === 'asc'
        ? compareA.localeCompare(compareB)
        : compareB.localeCompare(compareA);
    });

    return result;
  }, [spaceMembers, searchTerm, sortBy, sortDirection]);

  const setMemberProperty = (id: number, property: string, value: unknown) => {
    setSpaceMembers(
      spaceMembers.map((member) => (member.id === id ? { ...member, [property]: value } : member)),
    );
  };

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('teamId', currTeam?.id.toString());

      await saveCompanyLogoMutation.mutateAsync(formData);
      Analytics.track('white_label_branding_updated', {
        spaceId: currTeam?.id,
        userId: userInfo?.user?.id,
      });
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDeleteSpace = () => setIsDeleteSpaceOpen(true);
  const handleAddMember = () => {
    setInActionMember(null);
    setIsAssigningMember(true);
  };
  const handleDeleteMember = (member: SpaceMember) => {
    setSelectedMember(member);
    setIsDeleteMemberOpen(true);
  };
  const handleEditMember = (member: SpaceMember) => {
    setInActionMember({
      id: member.id.toString(),
      email: member.email,
      roleId: member?.userTeamRole?.sharedTeamRole?.id,
      roleName: member?.userTeamRole?.sharedTeamRole?.name,
      teamId: currTeam.id,
      removeBeforeUpdate: true,
    });
    setIsAssigningMember(true);
  };

  const handleSpaceDeletion = async () => {
    await deleteSubTeamMutation.mutateAsync({
      id: currTeam.id,
      userId: userInfo?.user?.id,
      parentId: organization?.id,
    });

    setIsDeleteSpaceOpen(false);
  };

  const handleMemberDeletion = async () => {
    if (!selectedMember) return;
    setIsDeletingMember(true);

    setMemberProperty(selectedMember.id, 'isInProgress', true);
    const response = await subTeamsAPI.unassignMemberFromTeam({
      teamId: currTeam.id,
      memberId: selectedMember.id.toString(),
      roleId: Number(selectedMember.userTeamRole?.sharedTeamRole?.id),
    });
    if (response?.error) {
      toast(response?.error, { type: 'error' });
    }
    PostHog.track(EVENTS.ACCOUNT_HIERARCHY_EVENTS.SPACE_MEMBER_REMOVED, {});
    setMemberProperty(selectedMember.id, 'isInProgress', false);
    refreshUserData();

    setIsDeletingMember(false);
    setIsDeleteMemberOpen(false);
  };

  return (
    <div className="h-full">
      <div className="mb-10 mt-4 w-full flex items-center">
        <h1 className="text-2xl font-semibold inline-block">Space Settings</h1>

        <div className="ml-auto">
          <Button
            handleClick={handleAddMember}
            className={classNames({ hidden: !membersAccess.write })}
            disabled={isOrganizationMembersLoading}
          >
            <FaPlus className="mr-2" /> Add member
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4">
          <TeamInfo
            teamName={currTeam?.name}
            canDeleteSpace={canDeleteSpace}
            setIsEditing={setIsEditing}
          />

          <CompanyLogo
            canUseWhiteLabel={canUseWhiteLabel}
            logo={logo}
            teamsAccess={teamsAccess}
            fileInputRef={fileInputRef}
            handleLogoChange={handleLogoChange}
            isUploadingLogo={isUploadingLogo}
          />

          <button
            onClick={handleDeleteSpace}
            className={classNames('flex items-center text-gray-500 mt-4 absolute bottom-5 gap-1', {
              hidden: !canDeleteSpace,
            })}
          >
            {deleteSubTeamMutation.isLoading ? <Spinner classes="w-4 h-4" /> : <AiOutlineDelete />}{' '}
            Delete space
          </button>
        </div>

        <Members
          handleSearch={handleSearch}
          handleSortChange={handleSortChange}
          toggleSortDirection={toggleSortDirection}
          searchTerm={searchTerm}
          sortBy={sortBy}
          sortDirection={sortDirection}
          paginatedMembers={paginatedMembers}
          handleDeleteMember={handleDeleteMember}
          handleEditMember={handleEditMember}
        />
      </div>

      {errorMessage && (
        <ApiErrorLine fullWidth errorMsg={errorMessage} onClose={() => setErrorMessage('')} />
      )}

      {isEditing && (
        <CreateSpace
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onSubmit={() => {}}
          editData={{ id: currTeam?.id, name: currTeam?.name || '' }}
          parentTeam={organization}
        />
      )}

      {isAssigningMember && (
        <AssignMemberModal
          isOpen={isAssigningMember}
          onClose={() => setIsAssigningMember(false)}
          onSubmit={() => setIsAssigningMember(false)}
          editData={{
            id: currTeam?.id,
            name: currTeam?.name || '',
            organizationId: organization?.id,
          }}
          options={organizationMembers || []}
          excludedOptions={{
            key: 'email',
            options: paginatedMembers
              .map((member) => member.email)
              .filter((e) => e !== inActionMember?.email),
          }}
          memberData={inActionMember}
        />
      )}

      <SettingsModal
        onConfirm={handleSpaceDeletion}
        onClose={() => setIsDeleteSpaceOpen(false)}
        open={isDeleteSpaceOpen}
        isLoading={deleteSubTeamMutation.isLoading}
        btnText="Delete"
        title="Confirm Space Deletion"
        description="Are you sure you want to delete this space? Deleting space will remove all agents, data, and keys associated."
      />

      <SettingsModal
        onConfirm={handleMemberDeletion}
        onClose={() => setIsDeleteMemberOpen(false)}
        open={isDeleteMemberOpen}
        isLoading={isDeletingMember}
        btnText="Remove"
        title="Confirm Member Removal"
        description={`Are you sure you want to remove ${
          selectedMember?.name ?? selectedMember?.email
        } from ${currTeam.name}?`}
      />
    </div>
  );
};
