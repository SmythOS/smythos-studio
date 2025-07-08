import { Combobox, Transition } from '@headlessui/react';
import { subTeamsAPI } from '@react/features/teams/clients';
import { Spinner } from '@react/shared/components/ui/spinner';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { IMembershipTeam } from '@react/shared/types/entities';
import { EVENTS } from '@shared/posthog/constants/events';
import { CreateSpace } from '@src/react/features/teams/components/common';
import { AssignMemberModal } from '@src/react/features/teams/components/common/assign-member-modal';
import { PRICING_PLANS_V4 } from '@src/react/shared/enums';
import { PostHog } from '@src/shared/posthog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCheck } from 'react-icons/fa';
import { FaChevronDown, FaChevronUp, FaPlus } from 'react-icons/fa6';

interface TeamSwitchListProps {
  teamList: IMembershipTeam[];
  selectedTeam: IMembershipTeam['id'];
  onTeamChange: (team: IMembershipTeam) => void;
  canManageCurrentTeam: boolean;
  isLoading?: boolean;
}

export function TeamSwitchList({
  teamList,
  selectedTeam,
  onTeamChange,
  canManageCurrentTeam,
  isLoading = false,
}: TeamSwitchListProps) {
  // const [selectedTeam, setSelectedTeam] = useState(null);
  const [query, setQuery] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [canCreateTeam, setCanCreateTeam] = useState(false);
  const [menuScrollPosition, setMenuScrollPosition] = useState(0);
  const [isAssigningMember, setIsAssigningMember] = useState(false);
  const {
    userInfo,
    currentUserTeam,
    parentTeamRoles,
    parentTeamMembers,
    currentUserTeamRoles,
    currentUserTeamMembers,
  } = useAuthCtx();

  const [allAllowedMembers, setAllAllowedMembers] = React.useState([]);
  const [newTeamData, setNewTeamData] = useState(null);
  const [allTeams, setAllTeams] = useState([]);

  const filteredTeams = useMemo(() => {
    const teams = newTeamData ? [...teamList, newTeamData] : teamList;

    return query === ''
      ? teams
      : teams.filter((team) => {
          return team.name.toLowerCase().includes(query.toLowerCase());
        });
  }, [query, teamList, newTeamData]);

  const organization = filteredTeams.filter((t) => t.parentId === null)[0];
  const currTeam = filteredTeams.filter((t) => t.id === selectedTeam)[0];
  useEffect(() => {
    const restOfTeams = filteredTeams.filter(
      (t) => !(t.id == currTeam.id || t.id == organization.id),
    );
    if (currTeam?.id == organization?.id) {
      setAllTeams([organization, ...restOfTeams]);
    } else {
      setAllTeams([organization, currTeam, ...restOfTeams]);
    }
  }, [filteredTeams]);

  const getTeamRoles = useMutation({
    mutationFn: async (teamId: string) => {
      return await subTeamsAPI.getTeamMembers(teamId);
    },
    mutationKey: ['getTeamRoles', 'getTeamRoles'],
    onSuccess: (response) => {
      const teamMembers = response.members.filter((member) => !member.userTeamRole.isTeamInitiator);
      setAllAllowedMembers(teamMembers || []);
      const organizationAccess = response.members.filter(
        (member) => userInfo?.user?.id == member.id,
      )?.[0];
      const organizationAccessRole = organizationAccess?.userTeamRole?.sharedTeamRole;
      const canCreateTeam2 =
        organizationAccessRole?.isOwnerRole ||
        organizationAccessRole?.acl?.page?.['/subteams']?.access === 'rw';
      setCanCreateTeam(canCreateTeam2);
    },
  });
  useEffect(() => {
    let members;
    if (currentUserTeam?.id) {
      members = currentUserTeamMembers || [];
    }
    if (currTeam?.parentId) {
      members = parentTeamMembers || [];
    }
    if (members) {
      setAllAllowedMembers(members || []);
      const organizationAccess = members?.filter((member) => userInfo?.user?.id == member.id)?.[0];
      const organizationAccessRole = organizationAccess?.userTeamRole?.sharedTeamRole;
      const canCreateTeam2 =
        organizationAccessRole?.isOwnerRole ||
        organizationAccessRole?.acl?.page?.['/subteams']?.access === 'rw';
      setCanCreateTeam(canCreateTeam2);
    }
  }, [currentUserTeam]);

  useEffect(() => {
    if (organization?.id) {
      getTeamRoles.mutate(organization.id);
    }
  }, [organization]);

  const isUserOnAllowedPlan = useMemo(() => {
    const isPaid = userInfo?.subs?.plan?.paid === true;
    const isNotBuilder =
      userInfo?.subs?.plan?.name?.toLowerCase() !== PRICING_PLANS_V4.BUILDER.toLowerCase();
    return isPaid && isNotBuilder;
  }, [userInfo?.subs?.plan]);

  const queryClient = useQueryClient();

  return (
    <>
      <Combobox
        value={currTeam.name}
        onChange={(team) => {
          if (team == 'CreateTeamBtn') {
            setIsCreatingTeam(true);
          } else {
            PostHog.track(EVENTS.ACCOUNT_HIERARCHY_EVENTS.SPACE_SWITCHED, {});
            onTeamChange(filteredTeams.filter((t) => t.id === team)[0]);
          }
        }}
        disabled={isLoading}
      >
        {({ open }) => (
          <div
            className={classNames('relative mt-1', {
              'animate-pulse': isLoading,
            })}
          >
            <div className="relative w-40 border border-solid border-gray-300 cursor-default overflow-hidden rounded-lg bg-white text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
              <Combobox.Input
                className="w-[0px] border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 pointer-events-none"
                displayValue={(team: any) => {
                  return team;
                }}
                tabIndex={-1}
                readOnly
                onChange={(event) => setQuery(event.target.value)}
              />
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-9 w-[160px] pl-3 " data-qa="space-dropdown">
                {isLoading && <Spinner classes="w-4 h-4 mr-2" />}
                <span className="w-fit truncate font-normal text-base text-gray-900">
                  {currTeam.name}
                </span>
                {open && (
                  <FaChevronUp
                    className="absolute right-3 h-[18px] w-[18px] text-gray-900"
                    aria-hidden="true"
                  />
                )}
                {!open && (
                  <FaChevronDown
                    className="absolute right-3 h-[18px] w-[18px] text-gray-900"
                    aria-hidden="true"
                  />
                )}
              </Combobox.Button>
            </div>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              afterLeave={() => setQuery('')}
            >
              <Combobox.Options
                className={classNames(
                  'z-[60] absolute mt-1 max-h-[22rem] w-[296px] px-2 border border-solid border-gray-200 -ml-[8.5rem] overflow-auto rounded-xl bg-white text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm max-md:w-[220px] max-md:-ml-[60px]',
                )}
                onScroll={(e: any) => {
                  setMenuScrollPosition(e?.target?.scrollTop || 0);
                }}
              >
                {allTeams.length === 0 && query !== '' ? (
                  <div className="relative cursor-default select-none px-4 py-1 text-gray-700">
                    Nothing found.
                  </div>
                ) : (
                  allTeams.map((team, index) => (
                    <Combobox.Option
                      key={index}
                      className={({ active }) => 'relative select-none p-1 cursor-pointer'}
                      value={team.id}
                    >
                      {({ selected, active }) => {
                        selected = team.id == currTeam.id;
                        const isOrganization = team.id == organization.id;
                        return (
                          <>
                            {index === 0 && <div className="h-3 w-full bg-white"></div>}
                            <div
                              className={classNames('w-full p-2 rounded-lg', {
                                'bg-v2-blue': selected,
                                'bg-gray-100': active && !selected,
                                'bg-white': !active && !selected,
                              })}
                            >
                              <div className="inline-block  align-middle">
                                <div
                                  className={classNames(
                                    'w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-base ',
                                    {
                                      'bg-v2-blue/10': isOrganization && !selected,
                                      'bg-white/90': selected && isOrganization,
                                      'bg-white': selected && !isOrganization,
                                      'text-white bg-orange-400':
                                        active && !selected && !isOrganization,
                                      'text-white bg-indigo-700':
                                        !active && !selected && !isOrganization,
                                    },
                                  )}
                                >
                                  {isOrganization ? (
                                    <img
                                      src="/img/smythos-logo.png"
                                      alt="Organization"
                                      className="h-6"
                                    />
                                  ) : (
                                    team.name
                                      .split(' ')
                                      .map((word) => word[0])
                                      .slice(0, 2)
                                      .join('')
                                      .toUpperCase()
                                  )}
                                </div>
                              </div>
                              <div className="inline-block px-4 w-[calc(100%-62px)] align-middle">
                                <div
                                  className={classNames(
                                    'text-base font-normal break-words text-gray-600 leading-[20px]',
                                    {
                                      'text-white': selected,
                                      'text-gray-600': !selected,
                                    },
                                  )}
                                >
                                  {team.name}
                                </div>
                                <span
                                  className={classNames('text-xs font-normal', {
                                    'text-white': selected,
                                    'text-gray-500': !selected,
                                  })}
                                >
                                  {
                                    isOrganization ? 'Organization' : ''
                                    // 'By ' +  (teamOwners[team.id][0].name || teamOwners[team.id][0].email)
                                  }
                                </span>
                                {/* <span className="text-xs text-gray-500">
                          by {team.description}
                        </span> */}
                              </div>
                              {team.id === currTeam.id && (
                                <div className="inline-block w-4 align-middle">
                                  <div className="w-4 h-4 border-2 border-v2-blue rounded bg-white/90">
                                    <FaCheck className="w-full h-full text-v2-blue p-1" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        );
                      }}
                    </Combobox.Option>
                  ))
                )}
                <>
                  {canCreateTeam && isUserOnAllowedPlan && (
                    <Combobox.Option
                      //fix this option to the bottom of ul
                      className={classNames(
                        'cursor-pointer select-none p-1 bg-white sticky bottom-0',
                      )}
                      value={'CreateTeamBtn'}
                    >
                      <div
                        className={classNames(
                          'w-full p-2 rounded-lg border border-solid border-gray-300 bg-white hover:bg-gray-100',
                        )}
                      >
                        <div className="inline-block  align-middle">
                          <div
                            className={classNames(
                              'w-10 h-10 rounded-full flex items-center justify-center text-base bg-gray-200',
                            )}
                          >
                            <FaPlus className="w-5 h-5 text-v2-blue p-1" />
                          </div>
                        </div>
                        <div className="inline-block px-4 w-[calc(100%-48px)] align-middle whitespace-nowrap">
                          <span className="text-base font-normal text-gray-600 leading-[20px]">
                            Create space
                          </span>
                        </div>
                      </div>
                      <div className="h-3 w-full bg-white"></div>
                    </Combobox.Option>
                  )}
                </>
              </Combobox.Options>
            </Transition>
          </div>
        )}
      </Combobox>

      <CreateSpace
        isOpen={isCreatingTeam}
        parentTeam={organization}
        onSubmit={() => setIsAssigningMember(true)}
        onClose={(data) => {
          setIsCreatingTeam(false);
          setNewTeamData(data);

          if (data) {
            queryClient.invalidateQueries(['userTeams']);

            // if (data.id) {
            //   onTeamChange(data);
            // }
          }
        }}
        allTeams={filteredTeams}
      />
      {isAssigningMember &&
        createPortal(
          <AssignMemberModal
            isOpen={isAssigningMember}
            onClose={() => {
              setIsAssigningMember(false);
              if (newTeamData?.id) {
                onTeamChange(newTeamData);
              }
            }}
            onSubmit={(val) => {}}
            newTeamData={{ ...newTeamData, owner: userInfo?.user?.name || userInfo?.user?.email }}
            options={allAllowedMembers}
          />,
          document.body,
        )}
    </>
  );

  // return (
  //   <select
  //     defaultValue={selectedTeam}
  //     onChange={(event) => {
  //       const newTeam = teamList.find((team) => team.id === event.target.value);
  //       onTeamChange(newTeam);
  //     }}
  //     className="border-none focus:outline-none focus:ring-0"
  //   >
  //     {teamList.map((team) => (
  //       <option key={team.id} value={team.id}>
  //         {team.name}
  //       </option>
  //     ))}
  //   </select>
  // );
}
