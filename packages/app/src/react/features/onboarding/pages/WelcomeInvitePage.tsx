import { errKeys } from '@react/shared/constants';
import { extractError } from '@react/shared/utils/errors';
import { isEmailValid } from '@src/react/features/onboarding/utils';
import { subTeamsAPI, teamAPI } from '@src/react/features/teams/clients';
import { Input as CustomInput } from '@src/react/shared/components/ui/input';
import ConfirmModal from '@src/react/shared/components/ui/modals/ConfirmModal';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { FRONTEND_USER_SETTINGS } from '@src/react/shared/enums';
import { queryClient } from '@src/react/shared/query-client';
import * as apiPayloadTypes from '@src/react/shared/types/api-payload.types';
import { SmythAPIError } from '@src/react/shared/types/api-results.types';
import { cn } from '@src/react/shared/utils/general';
import { teamSettingKeys } from '@src/shared/teamSettingKeys';
import { useMutation, useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { Tooltip } from 'flowbite-react';
import {
  ChangeEvent,
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { FaCheck, FaPlus, FaTriangleExclamation } from 'react-icons/fa6';
import { toast } from 'react-toastify';
import { InviteMemberWarning } from '../../teams/components/teams/invite-member-warning';
import { PageCard } from '../components/PageCard';
interface InviteTeamMemberArgs {
  email: string;
  roleId: string;
  teamId?: string;
  spaceId?: string;
  spaceMemberId?: number;
  orgMemberId?: number;
  agentId?: string;
  agentName?: string;
}

interface IEmailField {
  id: number;
  isValid: boolean | null;
  email: string;
  error?: string;
  errorClasses?: string;
  roleId?: string | null;
  invitationStatus?: 'pending' | 'success' | 'error' | null;
  invitationError?: string;
  isDisabled?: boolean;
}
const getInitialEmails = (
  isShareAgent: boolean,
  lastSelectedRoleId?: string | null,
): IEmailField[] => {
  const emails = [];
  const count = isShareAgent ? 1 : 3;
  for (let i = 0; i < count; i++) {
    emails.push({
      id: i + 1,
      isValid: null,
      email: '',
      roleId: lastSelectedRoleId || '',
      invitationStatus: null,
      isDisabled: false,
    });
  }
  return emails;
};

// Time crunch. Some bad practices here. Will refactor later.
const InvitationContext = createContext<{
  invitationSent: boolean;
  setInvitationSent: Dispatch<SetStateAction<boolean>>;
}>({
  invitationSent: false,
  setInvitationSent: () => {},
});

const useInvitationContext = () => useContext(InvitationContext);

const SpinnerBodyComponent = ({ isShareAgent }: any) => {
  return (
    <div className="w-full h-full items-center flex flex-wrap justify-center text-center">
      <div
        className={classNames(
          'w-full my-1 p-3 md:my-3 md:p-4 flex font-inter flex-col text-center rounded-lg md:rounded-xl',
          {
            'max-h-[380px] h-auto': isShareAgent,
          },
        )}
      >
        <Spinner classes="w-8 h-8 ml-auto mr-auto" />
      </div>
    </div>
  );
};

const BodyComponent = ({
  setData,
  setIsContinueDisabled,
  isShareAgent,
  handleContinueEvent,
  extraProps,
}) => {
  const ref = useRef(null);
  const { invitationSent } = useInvitationContext();
  const { emailFields, setEmailFields } = extraProps || {};
  const maxEmails = isShareAgent ? 10 : 25;
  const [lastSelectedRoleId, setLastSelectedRoleId] = useState<string | null>(
    extraProps?.defaultCurrentTeamRole !== null && extraProps?.defaultCurrentTeamRole !== undefined
      ? extraProps.defaultCurrentTeamRole.toString()
      : null,
  );
  const {
    parentTeamMembers,
    currentUserTeamMembers,
    currentUserTeam,
    hasReadOnlyPageAccess,
    userInfo,
  } = useAuthCtx();

  const canInviteOutsideTeam = useMemo(() => {
    return !hasReadOnlyPageAccess('/teams/members', false);
  }, [currentUserTeam, hasReadOnlyPageAccess]);

  const canInviteOutsideOrg = useMemo(() => {
    return !hasReadOnlyPageAccess('/teams/members', true);
  }, [currentUserTeam, hasReadOnlyPageAccess]);

  useEffect(() => {
    if (
      extraProps?.defaultCurrentTeamRole !== null &&
      extraProps?.defaultCurrentTeamRole !== undefined
    ) {
      setLastSelectedRoleId(extraProps.defaultCurrentTeamRole.toString());
    } else if (extraProps?.currTeamRoles?.length > 0) {
      // Use the first role from currTeamRoles as default (matching dropdown behavior)
      setLastSelectedRoleId(extraProps.currTeamRoles[0].id?.toString() || '');
    }
  }, [extraProps?.defaultCurrentTeamRole, extraProps?.currTeamRoles]);

  // Update initial email fields that have empty roleId when the correct role becomes available
  useEffect(() => {
    if (lastSelectedRoleId && setEmailFields) {
      setEmailFields((prevFields) => {
        if (!prevFields) return prevFields;
        let hasEmptyRoleId = false;
        const updatedFields = prevFields.map((field) => {
          if (!field.roleId || field.roleId === '') {
            hasEmptyRoleId = true;
            return { ...field, roleId: lastSelectedRoleId };
          }
          return field;
        });
        // Only update if there were fields with empty roleId
        return hasEmptyRoleId ? updatedFields : prevFields;
      });
    }
  }, [lastSelectedRoleId, setEmailFields]);

  const handleAddEmail = () => {
    if (!setEmailFields) return;

    if ((emailFields?.length || 0) < maxEmails) {
      const defaultRoleId =
        lastSelectedRoleId || extraProps?.currTeamRoles?.[0]?.id?.toString() || '';
      setEmailFields((prevFields) => {
        if (!prevFields) return prevFields;
        return [
          ...prevFields,
          {
            id: prevFields.length + 1,
            email: '',
            isValid: null,
            roleId: defaultRoleId,
            invitationStatus: null,
            isDisabled: false,
          },
        ];
      });

      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const checkAccessForEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail == userInfo?.user?.email) {
      return 'You cannot invite yourself';
    }
    if (!currentUserTeam?.parentId) {
      const isUserAlreadyAMember = currentUserTeamMembers?.find(
        (member) => member.email === trimmedEmail,
      );
      if (!isUserAlreadyAMember && !canInviteOutsideTeam) {
        return 'You do not have permission to invite outside your team';
      }
      return null;
    } else {
      const isUserAlreadyAMember = currentUserTeamMembers?.find(
        (member) => member.email === trimmedEmail,
      );
      const isUserAlreadyAMemberInOrg = parentTeamMembers?.find(
        (member) => member.email === trimmedEmail,
      );
      if (isUserAlreadyAMember) {
        return null;
      } else if (isUserAlreadyAMemberInOrg && canInviteOutsideTeam) {
        return null;
      } else if (isUserAlreadyAMemberInOrg && !canInviteOutsideTeam) {
        return 'You do not have permission to invite outside your team';
      } else if (!isUserAlreadyAMemberInOrg && !isUserAlreadyAMember && canInviteOutsideOrg) {
        return null;
      }
      return 'You do not have permission to invite outside your organization';
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!setEmailFields) return;

    const nameParts = e.target.name.split('-');
    const indexStr = nameParts[1];

    if (!indexStr || isNaN(Number(indexStr))) {
      console.error('Invalid input name format:', e.target.name);
      return;
    }

    const index = Number(indexStr);
    const email = e.target.value;
    const trimmedEmail = email.trim();

    setEmailFields((prevEmails) => {
      if (!prevEmails) return prevEmails;
      const newEmails = [...prevEmails];
      // Don't allow changes if field is disabled or index is invalid
      if (index >= newEmails.length || newEmails[index]?.isDisabled) {
        return prevEmails;
      }

      // Update the email value first
      newEmails[index].email = email;

      // Create a map to track the first occurrence of each email
      const emailFirstOccurrence = new Map<string, number>();

      // Find the first occurrence of each email
      newEmails.forEach((field, fieldIndex) => {
        const fieldTrimmedEmail = field.email.trim();
        if (fieldTrimmedEmail !== '' && !emailFirstOccurrence.has(fieldTrimmedEmail)) {
          emailFirstOccurrence.set(fieldTrimmedEmail, fieldIndex);
        }
      });

      // Now validate all fields
      newEmails.forEach((field, fieldIndex) => {
        const fieldTrimmedEmail = field.email.trim();
        const accessError = checkAccessForEmail(fieldTrimmedEmail);

        if (!fieldTrimmedEmail.length) {
          // Reset all error-related properties when field is cleared
          field.isValid = null;
          field.error = '';
          field.invitationStatus = null;
          field.invitationError = '';
        } else if (accessError) {
          field.isValid = false;
          field.error = accessError;
          // Reset invitation status when validation changes
          field.invitationStatus = null;
          field.invitationError = '';
        } else if (!isEmailValid(fieldTrimmedEmail)) {
          field.isValid = false;
          field.error = 'Invalid email';
          // Reset invitation status when validation changes
          field.invitationStatus = null;
          field.invitationError = '';
        } else if (
          fieldTrimmedEmail !== '' &&
          emailFirstOccurrence.get(fieldTrimmedEmail) !== fieldIndex
        ) {
          // This is a duplicate email and NOT the first occurrence
          field.isValid = false;
          field.error = 'Email already added';
          // Reset invitation status when validation changes
          field.invitationStatus = null;
          field.invitationError = '';
        } else {
          field.isValid = true;
          field.error = '';
          // Reset invitation status when validation changes
          field.invitationStatus = null;
          field.invitationError = '';
        }
      });

      return newEmails;
    });
  };

  const handleRoleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (!setEmailFields) return;

    const nameParts = e.target.name.split('-');
    const indexStr = nameParts[1];

    if (!indexStr || isNaN(Number(indexStr))) {
      console.error('Invalid select name format:', e.target.name);
      return;
    }

    const index = Number(indexStr);
    const roleId = e.target.value;

    setEmailFields((prevEmails) => {
      if (!prevEmails) return prevEmails;
      const newEmails = [...prevEmails];
      // Don't allow changes if field is disabled or index is invalid
      if (index >= newEmails.length || newEmails[index]?.isDisabled) {
        return prevEmails;
      }
      newEmails[index].roleId = roleId || '';
      return newEmails;
    });
    setLastSelectedRoleId(roleId || null);
  };

  useEffect(() => {
    if (!setEmailFields) return;

    setData(emailFields || []);
    // disable the button if there will be no valid emails (only consider non-disabled fields)
    const areSomeEmailsValid = (emailFields || []).some(
      (field) => field.isValid === true && !field.isDisabled,
    );
    // also disable the button if there are any errors in email fields
    const hasErrors = (emailFields || []).some(
      (field) => field.isValid === false && !field.isDisabled,
    );
    // disable the button if all fields are empty
    const hasNonEmptyFields = (emailFields || []).some(
      (field) => field.email.trim() !== '' && !field.isDisabled,
    );
    setIsContinueDisabled(!areSomeEmailsValid || hasErrors || !hasNonEmptyFields);
  }, [emailFields, setData, setIsContinueDisabled, setEmailFields]);

  return (
    <div className="w-full h-full items-center flex flex-wrap justify-center text-center">
      <div
        className={classNames(
          'w-full flex font-inter flex-col text-center rounded-lg md:rounded-xl',
          {
            'max-h-[450px] h-auto pb-3 ': isShareAgent,
            'sm:w-[450px] bg-gray-100 my-1 p-3 md:my-3 md:p-4 ': !isShareAgent,
            'h-auto': !invitationSent && !isShareAgent,
            'h-[306px]': invitationSent && !isShareAgent,
          },
        )}
      >
        <div
          className={classNames({
            'p-1 md:p-3': !isShareAgent,
            'pb-1 md:pb-3': isShareAgent,
          })}
        >
          {invitationSent && isShareAgent && extraProps?.errorOccurred ? (
            <div className="flex flex-col items-center justify-center gap-4 mt-10">
              <FaTriangleExclamation className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
              <p className="text-base text-center font-inter text-black">Invite Limit Reached!</p>
            </div>
          ) : invitationSent ? (
            <div className="flex flex-col items-center justify-center gap-4 mt-10">
              <FaCheck className="w-8 h-8 md:w-10 md:h-10 text-green-500" />
              <p className="text-base text-center font-inter text-black">Invitations sent!</p>
            </div>
          ) : (
            <>
              {!isShareAgent && (
                <h1 className="text-lg md:text-xl text-center font-semibold font-inter text-black">
                  {'Start Inviting your team'}
                </h1>
              )}
              {isShareAgent && (
                <p className={classNames('text-left font-inter mb-4 text-[#424242] font-light')}>
                  {
                    "Share this agent with your team members. They'll receive an email invitation to collaborate."
                  }
                </p>
              )}
              {!isShareAgent && (
                <p
                  className={classNames('text-center font-inter text-black pt-5 mb-6', {
                    'text-md': isShareAgent,
                    'text-xs md:text-sm ': !isShareAgent,
                  })}
                >
                  {'Invite a team member to collaborate with you.'}
                </p>
              )}
              <InviteMemberWarning
                newMemberCount={emailFields?.filter((e) => e.isValid === true).length || 1}
                classes={isShareAgent ? 'my-4' : ''}
              />
              <div className="flex flex-row gap-6 mb-2">
                <div className="text-left text-base font-medium text-[#1E1E1E] dark:text-white w-full">
                  Invite Colleagues <span className="text-red-500">*</span>
                </div>
                {extraProps?.currTeamRoles?.length > 0 && (
                  <div className="text-left text-base font-medium text-[#1E1E1E] dark:text-white w-full">
                    Role{' '}
                    <Tooltip
                      content={
                        <div className="text-sm">
                          Different roles have different permissions.
                          {currentUserTeam?.parentId === null && (
                            <>
                              <br />
                              See{' '}
                              <a
                                href="/teams/roles"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-white font-semibold hover:text-gray-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                manage roles
                              </a>
                            </>
                          )}
                        </div>
                      }
                      trigger="hover"
                      placement="top"
                      style="dark"
                      theme={{
                        target: 'inline-flex items-center w-5 h-5 align-top',
                      }}
                    >
                      <img src="/img/icons/Info.svg" className="w-5 h-5" alt="Info" />
                    </Tooltip>
                  </div>
                )}
              </div>

              <div
                className={classNames('space-y-2 overflow-y-auto', {
                  'max-h-32': (emailFields?.length || 0) < maxEmails && isShareAgent,
                  'max-h-40': (emailFields?.length || 0) >= maxEmails && isShareAgent,
                  'max-h-64': (emailFields?.length || 0) < maxEmails && !isShareAgent,
                  'max-h-72': (emailFields?.length || 0) >= maxEmails && !isShareAgent,
                })}
              >
                {emailFields?.map((field, index) => {
                  const errorMessage =
                    (field.invitationStatus === 'error' && field.invitationError) ||
                    (field.isValid === false && field.error);

                  return (
                    <div key={field.id}>
                      <div className={classNames('flex flex-row gap-6')}>
                        <div
                          className="w-full"
                          ref={(emailFields?.length || 0) - 1 === index ? ref : null}
                        >
                          <CustomInput
                            type="email"
                            placeholder="Email"
                            name={`email-${index}`}
                            onChange={handleChange}
                            value={emailFields[index].email}
                            disabled={
                              field.isDisabled || (!extraProps?.isLoading && extraProps?.freePlan)
                            }
                            icon={
                              field.invitationStatus === 'success' ? (
                                <FaCheck className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                              ) : field.invitationStatus === 'error' ? (
                                <FaTriangleExclamation className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
                              ) : field.invitationStatus === 'pending' ? (
                                <Spinner classes="w-3 h-3 md:w-4 md:h-4" />
                              ) : field.isValid === null ? null : field.isValid ? (
                                <FaCheck className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                              ) : (
                                <FaTriangleExclamation className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
                              )
                            }
                            fullWidth
                            className={classNames('pr-8', {
                              'opacity-50':
                                field.isDisabled ||
                                (!extraProps?.isLoading && extraProps?.freePlan),
                            })}
                          />
                        </div>
                        {extraProps?.currTeamRoles?.length > 1 && (
                          <div className="w-full">
                            <div className="w-full text-left">
                              <select
                                value={emailFields[index].roleId || ''}
                                id={`role-select-${index}`}
                                name={`role-${index}`}
                                disabled={
                                  field.isDisabled ||
                                  (!extraProps?.isLoading && extraProps?.freePlan)
                                }
                                className={classNames(
                                  'py-2 px-3 mb-[1px] border text-gray-900 rounded block w-full outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none text-sm font-normal placeholder:text-sm placeholder:font-normal box-border border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500 focus-visible:mb-0 focus:mb-0',
                                  {
                                    'opacity-50 cursor-not-allowed':
                                      field.isDisabled ||
                                      (!extraProps?.isLoading && extraProps?.freePlan),
                                  },
                                )}
                                onChange={(e) => {
                                  handleRoleChange(e);
                                }}
                              >
                                {extraProps?.currTeamRoles?.map((role) => (
                                  <option key={role.id} value={role.id?.toString() || ''}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                      {errorMessage && (
                        <p className="w-[calc(100%_-_4px)] ml-[2px] text-left text-xs text-red-500 mt-1">
                          {errorMessage}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {(emailFields?.length || 0) < maxEmails && !extraProps?.showingUpgradeCTA && (
                <div
                  className={cn(
                    'items-center inline-flex gap-2 mt-2 w-auto float-left p-3 cursor-pointer',
                    'border border-[#D9D9D9] border-solid rounded-lg',
                  )}
                  onClick={handleAddEmail}
                >
                  <FaPlus color="#242424" />
                  <p className="text-xs md:text-md font-inter select-none text-[#242424] ">
                    Add More
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {isShareAgent && (
          <div className={cn('text-[#616161] font-light text-left mb-2')}>
            Please note that new members will be invited to join your team and agent space
          </div>
        )}
      </div>
      {isShareAgent && !invitationSent && !extraProps?.showingUpgradeCTA && (
        <div
          className={classNames(
            `w-full ${
              (emailFields?.filter((e) => e?.email?.trim?.() && !e.isDisabled)?.length || 0) ===
                0 ||
              (emailFields || []).some((field) => field.isValid === false && !field.isDisabled)
                ? 'opacity-50 pointer-events-none'
                : ''
            }`,
            {
              'sm:w-[450px] mt-4': !isShareAgent,
              '': isShareAgent,
            },
          )}
        >
          <Button
            handleClick={handleContinueEvent}
            fullWidth={!isShareAgent}
            variant="primary"
            className={isShareAgent ? 'm-auto mr-0 w-[100px] h-[48px] rounded-lg' : ''}
          >
            {extraProps?.invitationInProgress ? (
              <Spinner classes="w-5 h-5" />
            ) : isShareAgent ? (
              'Send'
            ) : (
              'Send Invitations'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
const WelcomeInvitePageComponent = ({
  isShareAgent = false,
  onClose,
  agentId = '',
  agentName = '',
}) => {
  const [progress, setProgress] = useState(90);
  const [errorMessage, setErrorMessage] = useState(null);
  const { invitationSent, setInvitationSent } = useInvitationContext();
  const [invitationInProgress, setInvitationInProgress] = useState(false);
  const [emailFields, setEmailFields] = useState<IEmailField[]>(
    getInitialEmails(isShareAgent, null),
  );

  const searchParams = new URLSearchParams(window.location.search);
  const isChatParamPresent = searchParams.has('chat');
  const redirectPath = searchParams.get('redirect');

  const [showShareAgentConfirmation, setShowShareAgentConfirmation] = useState(false);
  const [emailsToBeSharedWith, setEmailsToBeSharedWith] = useState<any[]>([]);
  const [isShareAgentOnly, setIsShareAgentOnly] = useState(false);
  const [organizationRoles, setOrganizationRoles] = useState<any[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<any[]>([]);
  const [currTeamMembers, setCurrTeamMembers] = useState<any[]>([]);
  const { userTeams, userInfo, currentUserTeamRoles, parentTeamRoles, currentUserTeam } =
    useAuthCtx();
  const [isLoading, setIsLoading] = useState(!!isShareAgent);
  const [allAllowedMembers, setAllAllowedMembers] = useState<any[]>([]);
  const [canFetchDataForShareAgent, setCanFetchDataForShareAgent] = useState(false);
  const [defaultCurrentTeamRole, setDefaultCurrentTeamRole] = useState<any>(null);

  const disableBackButton =
    sessionStorage.getItem(FRONTEND_USER_SETTINGS.HIDE_BACK_BUTTON_WELCOME_PAGE) === 'true' ||
    window.location.pathname.includes('book-intro-call');

  const organization = userTeams?.find((team) => team.parentId === null);
  const currTeam = userTeams?.find((team) => team.id === currentUserTeam?.id);

  useEffect(() => {
    async function getSettings() {
      try {
        const response = await fetch(`/api/app/team-settings/${teamSettingKeys.DEFAULT_ROLE}`);

        if (!response.ok) {
          return;
        }

        const roleSettings = (await response?.json?.()) || {};
        setDefaultCurrentTeamRole(roleSettings?.data?.defaultRoles?.[currTeam?.id].id || null);
      } catch (error) {
        console.log('Error fetching default role:', error);
      }
    }
    if (currTeam?.id) {
      getSettings();
    }
  }, [currTeam]);

  async function getCurrTeamRoles() {
    try {
      const result = await subTeamsAPI.getTeamRoles(currTeam?.id);
      return result;
    } catch (e) {
      console.error('Error fetching current team roles:', e);
      return Promise.resolve(null);
    }
  }

  async function getOrgRoles() {
    try {
      const result = await subTeamsAPI.getTeamRoles(organization.id);
      return result;
    } catch (e) {
      console.error('Error fetching org roles:', e);
      return Promise.resolve(null);
    }
  }

  async function getOrgMembers() {
    try {
      const result = await subTeamsAPI.getTeamMembers(organization.id);
      return result;
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  async function getTeamMembers() {
    try {
      const result = await subTeamsAPI.getTeamMembers(currTeam?.id);
      return result;
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  useEffect(() => {
    async function getData() {
      const [organizationMembersFetched, currTeamMembersFetched] = await Promise.all([
        getOrgMembers(),
        currTeam?.id !== organization?.id ? getTeamMembers() : null,
      ]);

      setOrganizationMembers(organizationMembersFetched?.members || []);
      setCurrTeamMembers(currTeamMembersFetched?.members || []);

      const teamMembers = (
        currTeamMembersFetched?.members || organizationMembersFetched?.members
      )?.filter((member) => !member.userTeamRole.isTeamInitiator);
      // setAllAllowedMembers(teamMembers || []);
      const organizationAccess = organizationMembersFetched?.members?.filter(
        (member) => userInfo?.user?.email == member.email,
      )?.[0];
      const currTeamAccess = currTeamMembersFetched?.members?.filter(
        (member) => userInfo?.user?.email == member.email,
      )?.[0];
      const organizationAccessRole = organizationAccess?.userTeamRole?.sharedTeamRole;
      const currTeamAccessRole = currTeamAccess?.userTeamRole?.sharedTeamRole;

      let canCreateTeam =
        organizationAccessRole?.isOwnerRole || organizationAccessRole?.canManageTeam;

      if (currTeam?.id !== organization?.id) {
        canCreateTeam =
          canCreateTeam && (currTeamAccessRole?.isOwnerRole || currTeamAccessRole?.canManageTeam);
      }
      setIsShareAgentOnly(!canCreateTeam);
      setCanFetchDataForShareAgent(true);
    }

    if (organization?.id && currTeam?.id) {
      if (isShareAgent) {
        if (organization?.id !== currTeam?.id) {
          getData();
        } else {
          setIsShareAgentOnly(!userInfo?.user?.userTeamRole?.sharedTeamRole?.canManageTeam);
          setCanFetchDataForShareAgent(true);
        }
      } else {
        // When not sharing an agent, we still need to fetch roles
        setCanFetchDataForShareAgent(true);
      }
    }
  }, [organization, currTeam]);

  useEffect(() => {
    async function getData() {
      if (!isShareAgent || !isShareAgentOnly) {
        if (organization?.id == currTeam?.id) {
          const [organizationRolesFetched] = await Promise.all([getOrgRoles()]);
          setOrganizationRoles(organizationRolesFetched?.roles || []);
        } else {
          const [organizationRolesFetched, currTeamRolesFetched] = await Promise.all([
            getOrgRoles(),
            getCurrTeamRoles(),
          ]);
          setOrganizationRoles(organizationRolesFetched?.roles || []);
        }
      }
      setIsLoading(false);
    }
    if (canFetchDataForShareAgent) {
      getData();
    }
  }, [canFetchDataForShareAgent, isShareAgentOnly]);

  const goForward = useCallback(() => {
    const whatAreYouBuilding = sessionStorage.getItem(FRONTEND_USER_SETTINGS.WHAT_ARE_YOU_BUILDING);
    sessionStorage.removeItem(FRONTEND_USER_SETTINGS.WHAT_ARE_YOU_BUILDING);
    const redirectPath = sessionStorage.getItem(
      FRONTEND_USER_SETTINGS.REDIRECT_PATH_KEY_WELCOME_PAGE,
    );
    sessionStorage.removeItem(FRONTEND_USER_SETTINGS.REDIRECT_PATH_KEY_WELCOME_PAGE);
    const whatAreYouBuildingEncoded = whatAreYouBuilding?.trim?.()
      ? encodeURIComponent(whatAreYouBuilding)
      : '';
    if (whatAreYouBuildingEncoded) {
      location.href = `/builder?chat=${whatAreYouBuildingEncoded}&from=onboarding`;
    } else {
      window.location.href = redirectPath || '/agents';
    }
  }, []);
  const handleBackEvent = useCallback(() => {
    if (redirectPath) {
      sessionStorage.setItem(FRONTEND_USER_SETTINGS.REDIRECT_PATH_KEY_WELCOME_PAGE, redirectPath);
      localStorage.setItem(FRONTEND_USER_SETTINGS.SIDEBAR_COLLAPSED, 'true');
    }
    if (isChatParamPresent) {
      window.location.href = '/welcome/jobtype';
    } else {
      window.location.href = '/welcome/work';
    }
  }, [isChatParamPresent]);

  const teamRolesQuery = useQuery({
    queryKey: ['team_roles'],
    queryFn: teamAPI.getTeamRoles,
    refetchOnWindowFocus: false,
  });

  const shareAgentMutation = useMutation({
    mutationFn: ({ email, agentId, agentName }: apiPayloadTypes.ShareAgentWithTeamMemberRequest) =>
      teamAPI.shareAgentWithTeamMember({ email, agentId, agentName }),
    onError: (error: SmythAPIError) => {
      handleApiError(
        error,
        'An error occurred. Please try again later.',
        'You are not authorized to invite a new member',
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share_agent_invitations'] });
    },
  });

  const inviteMembers = useMutation({
    mutationFn: ({
      email,
      roleId,
      teamId = '',
      spaceId = '',
      agentId = '',
    }: InviteTeamMemberArgs) => {
      return teamAPI.inviteTeamMember({
        email,
        roleId: Number(roleId),
        teamId,
        spaceId,
        agentId,
        agentName,
      });
    },

    onError: (error: SmythAPIError) => {
      handleApiError(
        error,
        'An error occurred. Please try again later.',
        'You are not authorized to invite a new member',
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_roles'] });
    },
  });

  const handleApiError = (error, defaultMsg, unauthorizedMsg) => {
    let _errorMessage =
      error.status === 403 && extractError(error).toLowerCase().indexOf('unauthorized') !== -1
        ? unauthorizedMsg
        : extractError(error) || defaultMsg;

    if (error?.error?.errKey === errKeys.QUOTA_EXCEEDED) {
      _errorMessage =
        'You have reached the maximum number of invitations allowed on your current plan. Upgrade to invite additional members and unlock more features.';
    }

    toast.error(_errorMessage);
    setErrorMessage(_errorMessage);
  };

  const handleContinueEvent = async (_, data: IEmailField[]) => {
    if (!setEmailFields) return;

    const validEmails = data
      .filter((field) => field.isValid && !field.isDisabled)
      .map((field) => field.email);
    const allEmails = data
      .filter((field) => field.isValid !== null && field.email.trim() !== '' && !field.isDisabled)
      .map((field) => field.email);

    if (validEmails?.length !== allEmails?.length) {
      return setErrorMessage('Some email addresses seem incorrect. Please review and update.');
    }

    setErrorMessage(null);

    if (validEmails.length === 0) {
      return;
    }

    // Add proper null checking for teamRolesQuery
    if (!teamRolesQuery.data?.roles || teamRolesQuery.data.roles.length === 0) {
      setErrorMessage('Unable to load team roles. Please try again.');
      return;
    }

    const roleId = teamRolesQuery.data.roles[0].id;

    setInvitationInProgress(true);

    // Update email fields to show pending status
    setEmailFields((prevFields) => {
      return prevFields.map((field) => {
        if (validEmails.includes(field.email)) {
          return { ...field, invitationStatus: 'pending' as const };
        }
        return field;
      });
    });

    const inviteResults = await Promise.allSettled(
      validEmails.map(async (email) => {
        try {
          await inviteMembers.mutateAsync({ email, roleId });
          return { email, success: true };
        } catch (error) {
          return { email, success: false, error };
        }
      }),
    );

    // Update email fields based on results
    setEmailFields((prevFields) => {
      return prevFields.map((field) => {
        const result = inviteResults.find(
          (r) => r.status === 'fulfilled' && r.value.email === field.email,
        );

        if (result && result.status === 'fulfilled') {
          if (result.value.success) {
            return {
              ...field,
              invitationStatus: 'success' as const,
              isDisabled: true,
              invitationError: undefined,
            };
          } else {
            return {
              ...field,
              invitationStatus: 'error' as const,
              invitationError: extractError(result.value.error) || 'Invitation failed',
            };
          }
        }
        return field;
      });
    });

    // Check if all invitations were successful
    const allSuccessful = inviteResults.every(
      (result) => result.status === 'fulfilled' && result.value.success,
    );

    if (allSuccessful) {
      setInvitationSent(true);
      setProgress(100);
      setTimeout(goForward, 3000);
    } else {
      // Show summary error if some failed
      const failedCount = inviteResults.filter(
        (result) => result.status === 'fulfilled' && !result.value.success,
      ).length;

      if (failedCount > 0) {
        setErrorMessage(
          `${failedCount} invitation(s) failed. Please review the errors and try again.`,
        );
      }
    }

    setInvitationInProgress(false);
  };
  const handleShareAgentEvent = async (_, data: IEmailField[]) => {
    if (!setEmailFields) return;

    const validEmails = data
      .filter((field) => field.isValid && !field.isDisabled)
      .map((field) => {
        return { email: field.email, roleId: field.roleId };
      });
    const allEmails = data
      .filter((field) => field.isValid !== null && field.email.trim() !== '' && !field.isDisabled)
      .map((field) => field.email);

    if (validEmails?.length !== allEmails?.length) {
      return setErrorMessage('Some email addresses seem incorrect. Please review and update.');
    }

    setErrorMessage(null);

    if (validEmails.length === 0) {
      return;
    }

    // Update email fields to show pending status
    setEmailFields((prevFields) => {
      return prevFields.map((field) => {
        if (validEmails.some((v) => v.email === field.email)) {
          return { ...field, invitationStatus: 'pending' as const };
        }
        return field;
      });
    });

    const invitePromises = validEmails.map(async (field) => {
      const { email, roleId: currSpaceRoleId } = field;
      if (isShareAgentOnly) {
        return { email: email, organizationId: currTeam?.id, agentId };
      }
      let type = '_EMAIL';
      let organizationId = null;
      const teamId = null;
      let spaceMemberId = null;
      let orgMemberId = null;
      let roleId = null;
      let spaceRoleId = null;
      if (currTeam?.id !== organization?.id) {
        const currTeamMember = currTeamMembers.find((member) => member.email === email);
        const organizationMember = organizationMembers.find((member) => member.email === email);
        spaceRoleId = currSpaceRoleId || defaultCurrentTeamRole || currentUserTeamRoles?.[0]?.id;
        const isPartOfTeam = currTeamMember;
        type = !isPartOfTeam ? '_SUBSPACE' + type : type;
        // teamId = currTeam?.id;
        spaceMemberId = currTeamMember?.id;
        orgMemberId = organizationMember?.id;
      }
      {
        const isPartOfTeam = organizationMembers.some((member) => member.email === email);
        const organizationMember = organizationMembers.find((member) => member.email === email);
        type = !isPartOfTeam ? '_ORGANIZATION' + type : type;
        roleId = currTeam?.id !== organization?.id ? organizationRoles?.[0]?.id : currSpaceRoleId;
        organizationId = organization?.id;
        orgMemberId = organizationMember?.id;
      }
      return {
        email,
        type,
        organizationId,
        teamId,
        spaceMemberId,
        orgMemberId,
        roleId,
        spaceRoleId,
        agentId,
      };
    });

    const invitedResult = await Promise.all(invitePromises);
    setEmailsToBeSharedWith(invitedResult);
    // if (isShareAgentOnly) {
    handleShareAgentConfirmation(invitedResult);
    // } else {
    //   setShowShareAgentConfirmation(true);
    // }
    // setInvitationSent(true);
    setProgress(100);
    // setTimeout(goForward, 3000);
  };

  async function handleShareAgentConfirmation(data = null) {
    if (!setEmailFields) return;

    setShowShareAgentConfirmation(false);
    setInvitationInProgress(true);

    const inviteResults = await Promise.allSettled(
      (data || emailsToBeSharedWith).map(async (email) => {
        try {
          if (!isShareAgentOnly) {
            if (email.type == '_SUBSPACE_EMAIL') {
              await subTeamsAPI.assignMemberToTeam({
                teamId: currTeam.id,
                memberId: email.orgMemberId,
                roleId: email.spaceRoleId,
              });
            }
            await inviteMembers.mutateAsync({
              email: email.email,
              roleId: email.roleId,
              teamId: email.organizationId,
              spaceId: email.teamId,
              agentId: email.agentId,
            });
          } else {
            await shareAgentMutation.mutateAsync({
              email: email.email,
              agentId: email.agentId,
              agentName,
            });
          }
          return { email: email.email, success: true };
        } catch (error) {
          console.error('error', error);
          return { email: email.email, success: false, error };
        }
      }),
    );

    // Update email fields based on results
    setEmailFields((prevFields) => {
      return prevFields.map((field) => {
        const result = inviteResults.find(
          (r) => r.status === 'fulfilled' && r.value.email === field.email,
        );

        if (result && result.status === 'fulfilled') {
          if (result.value.success) {
            return {
              ...field,
              invitationStatus: 'success' as const,
              isDisabled: true,
              invitationError: undefined,
            };
          } else {
            return {
              ...field,
              invitationStatus: 'error' as const,
              invitationError: extractError(result.value.error) || 'Invitation failed',
            };
          }
        }
        return field;
      });
    });

    // Check if all invitations were successful
    const allSuccessful = inviteResults.every(
      (result) => result.status === 'fulfilled' && result.value.success,
    );

    if (allSuccessful) {
      setInvitationSent(true);
      setProgress(100);
    } else {
      // Show summary error if some failed
      const failedCount = inviteResults.filter(
        (result) => result.status === 'fulfilled' && !result.value.success,
      ).length;

      if (failedCount > 0) {
        setErrorMessage(
          `${failedCount} invitation(s) failed. Please review the errors and try again.`,
        );
      }
    }

    setInvitationInProgress(false);
  }

  // Initialize email fields when component mounts or when defaultCurrentTeamRole changes
  useEffect(() => {
    if (defaultCurrentTeamRole !== null) {
      setEmailFields(getInitialEmails(isShareAgent, defaultCurrentTeamRole?.toString() || null));
    }
  }, [isShareAgent, defaultCurrentTeamRole, setEmailFields]);
  const freePlan = userInfo?.subs?.plan?.name?.toLowerCase().replace(/\s/g, '') === 'smythosfree';

  const showingUpgradeCTA =
    !isLoading &&
    ((isShareAgent &&
      inviteMembers.isError &&
      inviteMembers.error?.error?.errKey === errKeys.QUOTA_EXCEEDED) ||
      freePlan);

  return (
    <div
      className={`font-sans text-white w-full h-[100vh] flex gap-10 flex-col md:flex-row items-center justify-center ${
        !isShareAgent ? '' : 'bg-gray-800/50'
      }`}
    >
      <PageCard
        canGoBack={!disableBackButton && !isShareAgent}
        hasSkip={true}
        size={isShareAgent ? 'sm' : 'md'}
        progress={progress}
        closeEvent={isShareAgent ? onClose : () => {}}
        skipEvent={goForward}
        pageCardClasses="w-full"
        hasLogo={isShareAgent ? false : true}
        title={isShareAgent ? 'Share Agent' : ''}
        backEvent={handleBackEvent}
        errorMessage={!showingUpgradeCTA ? errorMessage : ''}
        ErrorCTA={showingUpgradeCTA ? () => ErrorCTA(freePlan) : null}
        pageCardMainBodyClasses={
          isShareAgent && inviteMembers.isError ? 'mb-4' : isShareAgent ? 'mb-0' : ''
        }
        hideFooter={invitationSent || isShareAgent || showingUpgradeCTA}
        BodyComponent={isLoading ? SpinnerBodyComponent : BodyComponent}
        continueEvent={isShareAgent ? handleShareAgentEvent : handleContinueEvent}
        isShareAgent={isShareAgent}
        hasClose={isShareAgent}
        extraProps={{
          isShareAgentOnly,
          invitationInProgress,
          errorOccurred: inviteMembers.isError,
          showingUpgradeCTA,
          currTeamRoles: currentUserTeamRoles,
          defaultCurrentTeamRole,
          emailFields,
          setEmailFields,
          isLoading,
          freePlan,
        }}
        continueText="Invite"
      />

      {showShareAgentConfirmation &&
        createPortal(
          <ConfirmModal
            onClose={() => setShowShareAgentConfirmation(false)}
            handleCancel={() => setShowShareAgentConfirmation(false)}
            handleConfirm={() => handleShareAgentConfirmation()}
            label="Share"
            message="Confirm Share"
            lowMsg={
              'You are about to share this agent with additional members. Please note that new members will be invited to join your team and agent space.'
            }
          />,
          document.body,
        )}
    </div>
  );
};

export const WelcomeInvitePage = ({
  isShareAgent = false,
  onClose,
  agentId = '',
  agentName = '',
}) => {
  const [invitationSent, setInvitationSent] = useState(false);
  return (
    <InvitationContext.Provider value={{ invitationSent, setInvitationSent }}>
      <WelcomeInvitePageComponent
        isShareAgent={isShareAgent}
        onClose={onClose}
        agentId={agentId}
        agentName={agentName}
      />
    </InvitationContext.Provider>
  );
};

export const ErrorCTA = (freePlan: boolean) => {
  const handleNavigation = (path: string) => {
    window.location.href = path;
  };

  return (
    <>
      {freePlan && (
        <p className="text-center text-xs text-red-500">
          Your subscription of SmythOS Free does not allow members to be invited. Upgrade to invite
          additional members and unlock more features.
        </p>
      )}
      <Button
        className="mt-3 mx-auto"
        variant="primary"
        handleClick={() => handleNavigation('/plans')}
      >
        Upgrade to Invite More
      </Button>
    </>
  );
};
