/* eslint-disable max-len */
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useEffect, useState } from 'react';

export const InviteMemberWarning = ({
  classes,
  newMemberCount,
}: {
  classes?: string;
  newMemberCount?: number;
}) => {
  const { userInfo, parentTeamMembers, currentUserTeamMembers, currentUserTeam } = useAuthCtx();

  const [inviteInfo, setInviteInfo] = useState({
    totalSeats: 0,
    totalMembers: 0,
    remainingSeats: 0,
    isWarningShowable: false,
    pricePerSeat: 0,
  });
  useEffect(() => {
    const teamSeats = userInfo?.subs?.properties?.['seatsIncluded'] || 1;

    //check if user.email includes any of the staff emails
    const teamMembers = (
      currentUserTeam?.parentId ? parentTeamMembers : currentUserTeamMembers
    )?.filter((member) => !member.email.toLowerCase().includes('@smythos.com'));
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
      totalMembers: teamMembers.length,
      remainingSeats: teamSeats - teamMembers.length,
      pricePerSeat: price / 100,
      isWarningShowable:
        teamSeats - teamMembers.length - (newMemberCount || 0) < 1 &&
        price > 0 &&
        typeof userInfo?.subs?.properties?.['seatsIncluded'] === 'number' &&
        !isNaN(userInfo.subs.properties['seatsIncluded']) &&
        userInfo.subs.properties['seatsIncluded'] > 0 &&
        // This Check is to prevent the warning from showing for the Partner plan
        // T4 enterprise plan has 200 seats included so the check is 201
        userInfo.subs.properties['seatsIncluded'] < 201,
    });
  }, [userInfo, parentTeamMembers, currentUserTeamMembers, currentUserTeam, newMemberCount]);
  {
    /* Warning block for and check for unlimited seats*/
  }

  return inviteInfo.isWarningShowable ? (
    <div
      className={`bg-[#fffbeb] border border-solid border-[#fde68a] text-[#92400e] text-sm rounded-md px-4 py-3 my-6 ${classes}`}
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
      <div className="inline-block align-top text-left" style={{ width: 'calc(100% - 24px)' }}>
        {inviteInfo.remainingSeats > 0 ? (
          <span>
            You have {inviteInfo.remainingSeats} seat
            {inviteInfo.remainingSeats === 1 ? '' : 's'} remaining. Once all seats are used, adding
            members will incur an additional charge of ${inviteInfo.pricePerSeat}
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
    </div>
  ) : (
    <div className="px-4 py-3" />
  );
};
