import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { teamAPI } from '@react/features/teams/clients';
import { TeamMemberWithRole } from '@react/shared/types/api-results.types';

type TeamMembersResponse = { members: TeamMemberWithRole[] };

/**
 * Custom hook for managing team members data and filtering
 * @returns Object containing team members data, loading states, and filtering functions
 */
export const useTeamMembers = () => {
  const {
    data: teamMembersData,
    isLoading,
    isError,
  } = useQuery<TeamMembersResponse>({
    queryKey: ['team_members_list'],
    queryFn: teamAPI.getTeamMembers,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  const currentUserTeamMembers = teamMembersData?.members || [];

  /**
   * Sorts members with team initiators first
   * @param members - Array of team members to sort
   * @returns Sorted array of team members
   */
  const sortMembers = useCallback((members: TeamMemberWithRole[]) => {
    return [...members].sort((a, b) => {
      const roleA = a.userTeamRole.isTeamInitiator ? 0 : 1;
      const roleB = b.userTeamRole.isTeamInitiator ? 0 : 1;
      return roleA - roleB;
    });
  }, []);

  /**
   * Filters and sorts members based on search term
   * @param members - Array of team members
   * @param searchTerm - Search term to filter by
   * @returns Filtered and sorted members
   */
  const getFilteredMembers = useCallback(
    (members: TeamMemberWithRole[], searchTerm: string) => {
      if (!members) return [];
      const filtered = members.filter(
        (member) =>
          member.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
          member.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      return sortMembers(filtered);
    },
    [sortMembers],
  );

  /**
   * Converts members to have string IDs for table compatibility
   * @param members - Array of team members
   * @returns Members with string IDs
   */
  const getMembersWithStringId = useCallback((members: TeamMemberWithRole[]) => {
    return members.map((member) => ({ ...member, id: String(member.id) }));
  }, []);

  return {
    teamMembers: currentUserTeamMembers,
    isLoading,
    isError,
    sortMembers,
    getFilteredMembers,
    getMembersWithStringId,
  };
};
