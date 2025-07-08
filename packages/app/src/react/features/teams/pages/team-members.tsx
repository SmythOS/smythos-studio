import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ApiErrorLine from '@react/features/error-pages/components/APIErrorLine';
import UpSellModal from '@react/features/subscriptions/components/paywalls/up-sell';
import { teamAPI } from '@react/features/teams/clients';
import { AppTable } from '@react/features/teams/components/common';
import { MembersTableRow } from '@react/features/teams/components/members/row-table-members';
import { useGetTeamSettings } from '@react/features/teams/hooks';
import CreateMemberModal from '@react/features/teams/modals/create-member';
import Tooltip from '@react/shared/components/_legacy/ui/tooltip/tooltip';
import HeaderSearch from '@react/shared/components/headerSearch';
import { DeleteIcon, RedoIcon } from '@react/shared/components/svgs';
import { Spinner } from '@react/shared/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@react/shared/components/ui/tabs';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useGetUserSettings } from '@react/shared/hooks/useUserSettings';
import { TeamMemberWithRole } from '@react/shared/types/api-results.types';
import { errorToast, successToast } from '@shared/components/toast';
import { teamSettingKeys } from '@shared/teamSettingKeys';
import { userSettingKeys } from '@shared/userSettingKeys';

// API call for invitations
const fetchInvitations = async () => {
  const response = await fetch('/api/page/teams/invitations');
  if (!response.ok) throw new Error('Failed to fetch invitations');
  return response.json();
};

// Pending Invites Table Row Component
const PendingInvitesTableRow = ({
  invite,
  onResend,
  onDelete,
  loading,
  deleting,
  fadeOut,
  isReadOnlyAccess,
  hasPendingInviteForEmail,
}: {
  invite: {
    id: string;
    email: string;
    role: string;
    expires: string;
    status: string;
    roleId?: number;
  };
  onResend: (invite: any) => void;
  onDelete: (id: string) => void;
  loading: boolean;
  deleting: boolean;
  fadeOut: boolean;
  isReadOnlyAccess: boolean;
  hasPendingInviteForEmail: (email: string) => boolean;
}) => {
  const canShowResend =
    !isReadOnlyAccess && invite.status === 'Expired' && !hasPendingInviteForEmail(invite.email);

  return (
    <tr
      className={`bg-white hover:bg-gray-50 border-b border-solid border-gray-200 last:border-b-0 text-base -mx-1 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <td className="px-6 h-14 font-normal">{invite.email}</td>
      <td className="px-6 h-14 font-normal">{invite.role}</td>
      <td className="px-6 h-14 font-normal">{invite.expires}</td>
      <td className="px-2 h-14 font-normal">
        {invite.status === 'Expired' ? (
          <span className="bg-red-100 text-red-500 px-2 py-1 rounded-xl text-xs">Expired</span>
        ) : invite.status === 'Accepted' ? (
          <span className="bg-green-100 text-green-600 px-2 py-1 rounded-xl text-xs">Accepted</span>
        ) : (
          <span className="bg-blue-100 text-blue-500 px-2 py-1 rounded-xl text-xs">Pending</span>
        )}
      </td>
      <td className="px-6 h-14 font-normal text-right flex items-center gap-2 justify-end">
        {canShowResend && (
          <Tooltip text="Resend" placement="top">
            <button
              className="text-gray-500 hover:text-gray-700 ml-2 mr-2 flex items-center justify-center"
              title="Resend"
              onClick={() => onResend(invite)}
              type="button"
              disabled={loading || deleting}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Spinner classes="w-4 h-4" size="sm" />
                </span>
              ) : (
                <RedoIcon className="h-4 w-4" color="#242424" />
              )}
            </button>
          </Tooltip>
        )}
        {!isReadOnlyAccess && invite.status !== 'Accepted' && (
          <Tooltip text="Delete" placement="top">
            <button
              className="text-gray-500 hover:text-gray-700 flex items-center justify-center"
              title="Delete"
              onClick={() => onDelete(invite.id)}
              type="button"
              disabled={loading || deleting}
            >
              {deleting ? (
                <span className="flex items-center justify-center">
                  <Spinner classes="w-4 h-4" size="sm" />
                </span>
              ) : (
                <DeleteIcon className="h-4 w-4" color="#242424" />
              )}
            </button>
          </Tooltip>
        )}
      </td>
    </tr>
  );
};

const TeamMembersPage = () => {
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [upSellModalOpen, setUpSellModalOpen] = useState(false);
  const [tab, setTab] = useState('members');
  const [membersSearchTerm, setMembersSearchTerm] = useState('');
  const [invitesSearchTerm, setInvitesSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const hasInitialized = useRef(false);

  const queryClient = useQueryClient();

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

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    if (tab === 'members') setMembersSearchTerm(e.target.value);
    else setInvitesSearchTerm(e.target.value);
  };
  const sortMembers = (members: TeamMemberWithRole[]) => {
    return [...members].sort((a, b) => {
      const roleA = a.userTeamRole.isTeamInitiator ? 0 : 1;
      const roleB = b.userTeamRole.isTeamInitiator ? 0 : 1;
      return roleA - roleB;
    });
  };

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    const filtered = data.members?.filter(
      (member) =>
        member.name?.toLowerCase()?.includes(membersSearchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(membersSearchTerm.toLowerCase()),
    );
    return sortMembers(filtered);
  }, [data, membersSearchTerm]);

  const filteredMembersWithStringId = useMemo(() => {
    return filteredMembers.map((member) => ({ ...member, id: String(member.id) }));
  }, [filteredMembers]);

  // Fetch invitations only on page load/refresh, but do not use the data for UI
  const { data: invitationsData } = useQuery({
    queryKey: ['team_invitations'],
    queryFn: fetchInvitations,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    onSuccess: () => {},
  });

  // Helper to map, sort, and deduplicate invites for UI (show only latest per email)
  // Only show invites for roles that belong to the current team
  const mapSortInvites = (invites: any[]) => {
    // Sort by expiresAt (latest first), then by id (latest first)
    const sorted = invites.sort((a: any, b: any) => {
      const aTime = new Date(a.expiresAt).getTime();
      const bTime = new Date(b.expiresAt).getTime();
      if (bTime !== aTime) return bTime - aTime;
      return Number(b.id) - Number(a.id);
    });

    // Filter out invites whose roles don't belong to the current team
    const currentTeamInvites = sorted.filter((invite: any) => {
      const roleId = invite.teamRole?.id || invite.roleId;
      // Only include invites where the role exists in current team roles
      return teamRoles?.roles?.some((role) => role.id === roleId);
    });

    // Deduplicate by email, keeping only the first (latest) invite for each email
    const seen = new Set<string>();
    const deduped = currentTeamInvites.filter((invite: any) => {
      if (seen.has(invite.email)) return false;
      seen.add(invite.email);
      return true;
    });

    // Map to UI format
    return deduped.map((invite: any) => {
      const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
      let status: string;
      if (invite.status === 'ACCEPTED') status = 'Accepted';
      else if (isExpired) status = 'Expired';
      else status = 'Pending';

      return {
        id: String(invite.id),
        email: invite.email,
        role: invite.teamRole?.name || invite.role || '',
        expires: invite.expiresAt ? format(new Date(invite.expiresAt), 'MMMM d, yyyy') : '',
        status,
        roleId: invite.teamRole?.id || invite.roleId,
        expiresAt: invite.expiresAt,
      };
    });
  };

  // Show all invitations, and set status and badge color accordingly
  const pendingInvitesData = mapSortInvites(
    (invitationsData?.invitations || []).filter((invite: any) => invite.status !== 'ACCEPTED'),
  );

  // Local state for loading and deleting per invite
  const [rowLoading, setRowLoading] = useState<{ [id: string]: boolean }>({});
  const [rowDeleting, setRowDeleting] = useState<{ [id: string]: boolean }>({});
  const [rowFadeOut, setRowFadeOut] = useState<{ [id: string]: boolean }>({});
  const [localPendingInvites, setLocalPendingInvites] = useState(pendingInvitesData);

  // Initialize localPendingInvites when API data becomes available (only once)
  useEffect(() => {
    if (pendingInvitesData.length > 0 && !hasInitialized.current) {
      setLocalPendingInvites(pendingInvitesData);
      hasInitialized.current = true;
    }
  }, [pendingInvitesData]);

  const filteredPendingInvites = useMemo(() => {
    return localPendingInvites.filter((invite) =>
      invite.email.toLowerCase().includes(invitesSearchTerm.toLowerCase()),
    );
  }, [localPendingInvites, invitesSearchTerm]);

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

  // Resend invite handler - simplified for current team only
  const handleResendInvite = async (invite: any) => {
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
            teamRoles?.roles?.find((r) => r.id === data.invitation.teamRoleId)?.name || invite.role;

          setLocalPendingInvites((prev) => {
            // Remove the specific expired invite being resent
            const filtered = prev.filter((i) => i.id !== invite.id);

            // Create the new invite object in the expected format
            const newInvite = {
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
      } catch (parseError) {
        // If we can't parse the error, keep the default message
      }
      errorToast(msg);
    } finally {
      setRowLoading((prev) => ({ ...prev, [invite.id]: false }));
    }
  };

  // Delete invite handler
  const handleDeleteInvite = async (id: string) => {
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
        setLocalPendingInvites((prev) => prev.filter((invite) => invite.id !== id));
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
      } catch (parseError) {
        // If we can't parse the error, keep the default message
      }
      errorToast(msg);
      setRowDeleting((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Helper function to check if there's a pending invite for the same email
  const hasPendingInviteForEmail = (email: string) => {
    return localPendingInvites.some(
      (invite) => invite.email === email && invite.status === 'Pending',
    );
  };

  return (
    <div className="w-full pl-12 md:pl-0">
      <div className="flex mb-4 justify-between flex-wrap flex-col sm:flex-row md:flex-nowrap sm:items-center">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mr-4 mb-0">
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="invites">Pending Invites({localPendingInvites.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <HeaderSearch
          handleChange={(e) => {
            if (tab === 'members') setMembersSearchTerm(e.target.value);
            else setInvitesSearchTerm(e.target.value);
          }}
          handleClick={handleAddMemberClick}
          label="Invite Member"
          addIcon
          search
          placeholder={tab === 'members' ? 'Search Members' : 'Search Invites'}
          isReadOnlyAccess={isReadOnlyAccess}
        />
      </div>
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
              tableHeaders={[
                { name: 'Email' },
                { name: 'Role' },
                { name: 'Expires' },
                { name: '' }, // Status badge column, no heading
                { name: 'Actions' },
              ]}
            />
          </div>
        </TabsContent>
      </Tabs>
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
