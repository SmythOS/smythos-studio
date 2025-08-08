/* eslint-disable max-len */
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { cn } from '@src/react/shared/utils/general';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { teamAPI } from '../../clients';
import { useTeamInvitations } from '../../hooks/useTeamInvitations';
import { useTeamMembers } from '../../hooks/useTeamMembers';

export const InviteMemberWarning = ({
  classes,
  newMemberCount,
}: {
  classes?: string;
  newMemberCount?: number;
}) => {
  const { userInfo, parentTeamMembers, currentUserTeamMembers, currentUserTeam } = useAuthCtx();
  const queryClient = useQueryClient();

  // Force refetch team invitations when component mounts
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['team_invitations'] });
  }, [queryClient]);

  // Get team roles data
  const { data: teamRolesData } = useQuery({
    queryKey: ['team_roles'],
    queryFn: teamAPI.getTeamRoles,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Enable refetch on mount for fresh data
    refetchOnReconnect: false,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
  });

  const teamRoles = (teamRolesData as any)?.roles || [];

  // Use the same team members source as team-members page
  const { teamMembers } = useTeamMembers();

  const { getPendingInvites } = useTeamInvitations(teamRoles, teamMembers);

  const [inviteInfo, setInviteInfo] = useState({
    totalSeats: 0,
    totalMembers: 0,
    remainingSeats: 0,
    isWarningShowable: false,
    pricePerSeat: 0,
    isSmythosFree: false,
  });

  useEffect(() => {
    const teamSeats = userInfo?.subs?.properties?.['seatsIncluded'] || 1;

    // Filter out staff emails from team members (same logic as before but using consistent data source)
    const filteredTeamMembers =
      teamMembers?.filter((member) => !member.email.toLowerCase().includes('@smythos.com')) || [];

    // Filter out staff emails from pending invites
    const filteredPendingInvites =
      getPendingInvites?.filter((invite) => !invite.email.toLowerCase().includes('@smythos.com')) ||
      [];

    // Calculate total occupied seats (current members + pending invites)
    const totalOccupiedSeats = filteredTeamMembers.length + filteredPendingInvites.length;

    const priceItem =
      userInfo?.subs?.object?.['items']?.data?.filter?.(
        (item) => item?.price?.metadata?.for === 'user seats',
      ) || [];
    let price = 0;
    if (priceItem.length > 0) {
      price = priceItem[0].price?.unit_amount;
    }

    setInviteInfo({
      totalSeats: teamSeats,
      totalMembers: filteredTeamMembers.length,
      remainingSeats: teamSeats - totalOccupiedSeats,
      pricePerSeat: price / 100,
      isSmythosFree: userInfo.subs.plan.name.toLowerCase() === 'smythos free',
      isWarningShowable:
        // userInfo.subs.plan.name.toLowerCase() === 'smythos free' ||
        teamSeats - totalOccupiedSeats - (newMemberCount || 0) < 1 &&
        price > 0 &&
        typeof userInfo?.subs?.properties?.['seatsIncluded'] === 'number' &&
        !isNaN(userInfo.subs.properties['seatsIncluded']) &&
        userInfo.subs.properties['seatsIncluded'] > 0 &&
        // This Check is to prevent the warning from showing for the Partner plan
        // T4 enterprise plan has 200 seats included so the check is 201
        userInfo.subs.properties['seatsIncluded'] < 201,
    });
  }, [userInfo, teamMembers, newMemberCount]);
  {
    /* Warning block for and check for unlimited seats*/
  }
  return inviteInfo.isWarningShowable ? (
    <div
      className={cn(
        `bg-[#fffbeb] border border-solid border-[#fde68a] text-[#92400e] text-sm rounded-md px-4 py-3 my-6 ${classes}`,
      )}
      role="alert"
      style={{ fontFamily: 'inherit' }}
    >
      {/* Inline SVG for info icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="17"
        viewBox="0 0 16 17"
        fill="none"
        className="inline-block mr-2 align-top mt-[3px]"
      >
        <g clipPath="url(#clip0_2324_23865)">
          <path
            d="M0 8.5C0 12.9177 3.5814 16.5 8 16.5C12.4186 16.5 16 12.9177 16 8.5C16 4.0814 12.4186 0.5 8 0.5C3.5814 0.5 0 4.0814 0 8.5Z"
            fill="#A16114"
          />
          <path
            d="M8.00507 12.6035V7.82622M8 4.44917V4.37891"
            stroke="white"
            strokeWidth={1.33333}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <defs>
          <clipPath id="clip0_2324_23865">
            <rect width="16" height="16" fill="white" transform="translate(0 0.5)" />
          </clipPath>
        </defs>
      </svg>
      {inviteInfo.isSmythosFree ? (
        <span>
          Plan seat limit reached.{' '}
          <span
            className="font-semibold hover:underline cursor-pointer"
            onClick={() => {
              window.open('/plans', '_blank');
            }}
          >
            Upgrade your plan
          </span>{' '}
          to add more seats.
        </span>
      ) : (
        <div className="inline-block align-top text-left" style={{ width: 'calc(100% - 24px)' }}>
          {inviteInfo.remainingSeats > 0 ? (
            <span>
              You have {inviteInfo.remainingSeats} seat
              {inviteInfo.remainingSeats === 1 ? '' : 's'} remaining. Once all seats are used,
              adding members will incur an additional charge of ${inviteInfo.pricePerSeat}
              /month per seat.
            </span>
          ) : (
            <span>
              Adding a new member while on the{' '}
              <span className="font-semibold">{userInfo.subs.plan.name}</span> plan will incur an
              additional charge of ${inviteInfo.pricePerSeat}/mo per seat.
            </span>
          )}
        </div>
      )}
    </div>
  ) : (
    <div className="px-4 py-3" />
  );
};
