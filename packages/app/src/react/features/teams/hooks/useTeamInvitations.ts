/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback, useMemo } from 'react';

import { TeamMemberWithRole } from '@react/shared/types/api-results.types';

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expires: string;
  status: string;
  roleId?: number;
  expiresAt: string;
}

/**
 * API call for fetching invitations
 * @returns Promise with invitations data
 */
const fetchInvitations = async () => {
  const response = await fetch('/api/page/teams/invitations');
  if (!response.ok) throw new Error('Failed to fetch invitations');
  return response.json();
};

/**
 * Custom hook for managing team invitations data and processing
 * @param teamRoles - Array of available team roles
 * @param currentUserTeamMembers - Array of current team members
 * @returns Object containing invitations data and processing functions
 */
export const useTeamInvitations = (
  teamRoles: any[] = [],
  currentUserTeamMembers: TeamMemberWithRole[] = [],
) => {
  const { data: invitationsData } = useQuery({
    queryKey: ['team_invitations'],
    queryFn: fetchInvitations,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  /**
   * Maps, sorts, and deduplicates invites for UI display
   * @param invites - Raw invitations data from API
   * @returns Processed invitations array
   */
  const mapSortInvites = useCallback(
    (invites: any[]): PendingInvite[] => {
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
        return teamRoles?.some((role) => role.id === roleId);
      });

      // Filter out invites whose emails are already present in currentUserTeamMembers
      const teamMemberEmails = new Set(currentUserTeamMembers?.map((member) => member.email) || []);
      const filteredInvites = currentTeamInvites.filter((invite: any) => {
        return !teamMemberEmails.has(invite.email);
      });

      // Deduplicate by email, keeping only the first (latest) invite for each email
      const seen = new Set<string>();
      const deduped = filteredInvites.filter((invite: any) => {
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
    },
    [teamRoles, currentUserTeamMembers],
  );

  /**
   * Gets pending invitations (excluding accepted ones)
   * @returns Array of pending invitations
   */
  const getPendingInvites = useMemo(() => {
    const rawInvitations = invitationsData?.invitations || [];
    const pendingInvitations = rawInvitations.filter((invite: any) => invite.status !== 'ACCEPTED');
    return mapSortInvites(pendingInvitations);
  }, [invitationsData?.invitations, mapSortInvites]);

  /**
   * Filters invitations based on search term
   * @param invites - Array of invitations to filter
   * @param searchTerm - Search term to filter by
   * @returns Filtered invitations
   */
  const getFilteredInvites = useCallback((invites: PendingInvite[], searchTerm: string) => {
    return invites.filter((invite) =>
      invite.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, []);

  /**
   * Checks if there's a pending invite for a specific email
   * @param invites - Array of invitations to check
   * @param email - Email to check for
   * @returns Boolean indicating if there's a pending invite
   */
  const hasPendingInviteForEmail = useCallback((invites: PendingInvite[], email: string) => {
    return invites.some((invite) => invite.email === email && invite.status === 'Pending');
  }, []);

  return {
    invitationsData,
    getPendingInvites,
    getFilteredInvites,
    hasPendingInviteForEmail,
    mapSortInvites,
  };
};
