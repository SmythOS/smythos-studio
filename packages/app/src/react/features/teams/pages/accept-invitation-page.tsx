/* eslint-disable max-len, react-hooks/exhaustive-deps*/
import { teamAPI } from '@src/react/features/teams/clients';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { FRONTEND_USER_SETTINGS } from '@src/react/shared/enums';
import { saveUserSettings } from '@src/react/shared/hooks/useUserSettings';
import { SmythAPIError } from '@src/react/shared/types/api-results.types';
import { parseTeamError } from '@src/shared/constants/team-errors.constants';
import { userSettingKeys } from '@src/shared/userSettingKeys';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const AcceptInvitationPage = () => {
  const { invitationId } = useParams();
  const {
    userInfo: { user },
    userTeams,
    currentUserTeam,
    parentTeamRoles,
    currentUserTeamRoles,
    parentTeamMembers,
    currentUserTeamMembers,
  } = useAuthCtx();
  const [searchParams] = useSearchParams();
  const [hasAcceptedInvite, setHasAcceptedInvite] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showTeamSwitchWarning, setShowTeamSwitchWarning] = useState(false);
  const agentId = searchParams.get('agentId');
  const spaceId = searchParams.get('spaceId');
  const spaceRoleId = searchParams.get('spaceRoleId');
  const [teamHeaderId, setTeamHeaderId] = useState('');

  const isAlreadyAMember = useMemo(() => {
    const userEmail = user?.email;

    // If user has parentTeamRoles and parentTeamMembers, check if user is owner in parentTeam
    if (parentTeamRoles && parentTeamRoles.length > 0 && parentTeamMembers && userEmail) {
      const userMember = parentTeamMembers.find((member) => member.email === userEmail);
      if (userMember) {
        const userRole = parentTeamRoles.find(
          (role) => role.id === userMember.userTeamRole?.sharedTeamRole?.id,
        );
        return !!userRole; // If user has any role, they're already a member (owner or not)
      }
    }

    // Otherwise check in currentUserTeamRoles and currentUserTeamMembers
    if (
      currentUserTeamRoles &&
      currentUserTeamRoles.length > 0 &&
      currentUserTeamMembers &&
      userEmail
    ) {
      const userMember = currentUserTeamMembers.find((member) => member.email === userEmail);
      if (userMember) {
        const userRole = currentUserTeamRoles.find(
          (role) => role.id === userMember.userTeamRole?.sharedTeamRole?.id,
        );
        return !!userRole; // If user has any role, they're already a member (owner or not)
      }
    }

    // Fallback to original logic if neither are available
    return !user?.userTeamRole?.isTeamInitiator;
  }, [user, parentTeamRoles, currentUserTeamRoles, parentTeamMembers, currentUserTeamMembers]);

  const acceptInvitation = useMutation({
    mutationFn: ({
      invitationId,
      agentId,
      spaceId,
      spaceRoleId,
    }: {
      invitationId: string;
      agentId: string;
      spaceId: string;
      spaceRoleId: string;
    }) => {
      if (spaceId && spaceRoleId) {
        return teamAPI.acceptInvitation(invitationId, null, spaceId, spaceRoleId);
      } else {
        return teamAPI.acceptInvitation(invitationId, agentId);
      }
    },
    onSuccess: async (data) => {
      const logKey = FRONTEND_USER_SETTINGS.ACCEPT_INVITE_LOGGED;
      sessionStorage.setItem(logKey, `accepted_${invitationId}_${Date.now()}`);
      const jsonData = await data?.json();
      setTimeout(async () => {
        if (jsonData?.data?.spaceId) {
          await saveUserSettings(
            userSettingKeys.USER_TEAM,
            jsonData?.data?.spaceId,
            jsonData?.data?.organizationId,
          );
          setTeamHeaderId(jsonData?.data?.organizationId);
        }

        setIsAccepted(true);
        setShowTeamSwitchWarning(false);
        toast('Invitation accepted');
      }, 1000);
    },

    onError: async (error: SmythAPIError) => {
      let shouldSwitchTeam = false;
      let shouldNavigateToHome = false;
      if (
        error?.error?.message.indexOf('Invalid email') === -1 &&
        error?.error?.message.indexOf('Invitation Invalid') === -1
      ) {
        if (userTeams.length > 0 && currentUserTeam && spaceId && agentId) {
          const hasAccessToSpace = userTeams.find((team) => team.id === spaceId);
          if (hasAccessToSpace) {
            if (currentUserTeam?.id !== spaceId) {
              shouldSwitchTeam = true;
              shouldNavigateToHome = true;
            } else {
              shouldNavigateToHome = true;
            }
          }
        }
      }
      if (error?.error?.message.indexOf('ALREADY_PART_OF_TEAM') !== -1 && agentId) {
        const teamId = error?.error?.message.split(':')[1].trim();
        setShowTeamSwitchWarning(false);
        await saveUserSettings(userSettingKeys.USER_TEAM, teamId);
        window.location.href = `/builder/${agentId}`;
      } else if (agentId && (shouldSwitchTeam || shouldNavigateToHome)) {
        if (shouldSwitchTeam) {
          await saveUserSettings(userSettingKeys.USER_TEAM, spaceId);
        }
        if (shouldNavigateToHome) {
          window.location.href = `/builder/${agentId}`;
        }
      } else {
        setShowTeamSwitchWarning(false);
        setErrorMsg(error?.error?.message ?? 'Something went wrong');
      }
    },
  });

  const acceptInvite = useCallback(async () => {
    if (!hasAcceptedInvite) {
      setHasAcceptedInvite(true);
      await acceptInvitation.mutateAsync({ invitationId, agentId, spaceId, spaceRoleId });
    }
  }, []);

  useEffect(() => {
    if (user) {
      const t = setTimeout(() => {
        const logKey = FRONTEND_USER_SETTINGS.ACCEPT_INVITE_LOGGED;
        const [status, id, time] = sessionStorage.getItem(logKey)?.split?.('_') ?? [];
        if (id === invitationId && status === 'accepted') {
          setIsAccepted(true);
        }
        if (!isAccepted && !isAlreadyAMember && Date.now() - Number(time || 0) > 5000) {
          sessionStorage.setItem(logKey, `started_ ${invitationId}_${Date.now()}`);
          setTimeout(acceptInvite, 200);
        }
      }, 2000);
      return () => {
        clearTimeout(t);
      };
    }
  }, [user]);

  // Show warning immediately for existing team members
  useEffect(() => {
    if (user && isAlreadyAMember && !isAccepted && !errorMsg) {
      setShowTeamSwitchWarning(true);
    }
  }, [user, isAlreadyAMember, isAccepted, errorMsg]);

  const getErrorMsg = (msg: string) => {
    if (msg == 'Invitation expired' && spaceId) {
      return [
        'Oops! This invitation link has expired or has already been used. Please request a new invitation from your space admin.',
      ];
    } else if (msg == 'Invitation expired' && !spaceId) {
      return [
        'Oops! This invitation link has expired or has already been used. Please request a new invitation from your organization admin.',
      ];
    } else if (msg == 'Invalid email') {
      return [
        'The email you used does not match our invitation records. Please create your account using the email address included in your invitation.',
        'You can check your invite email or contact your admin to ensure you are using the correct address.',
      ];
    } else {
      return msg ? [msg] : ['Something went wrong'];
    }
  };

  const renderErrorContent = (errorMessage: string) => {
    // Try to parse using the new team error function first
    const keyValuePairs = parseTeamError(errorMessage, 'invitationPage');

    if (keyValuePairs) {
      return (
        <div className="text-red-800 space-y-3 text-left">
          {keyValuePairs.length > 0 && (
            <p className="">
              Oops! You already have significant assets on your SmythOS account. To prevent
              destructive actions, please resolve the following before switching teams:
            </p>
          )}
          {keyValuePairs.map((pair, index) => (
            <div key={index} className="">
              <b>{pair.key}</b> --{' '}
              <span
                dangerouslySetInnerHTML={{ __html: pair.value }}
                className="[&_a]:underline [&_a]:cursor-pointer"
              />
            </div>
          ))}
          {keyValuePairs.length > 0 && (
            <>
              <p className="">
                Please ask the admin to invite you using a different email, or delete the current
                data before attempting to join again.
              </p>
              <p>
                Want to keep your current team and data? Ask your admin to invite you using a
                different email address, or{' '}
                <a className="underline" href="mailto:support@smythos.com">
                  contact support
                </a>{' '}
                and we'll help you migrate your account safely.
              </p>
            </>
          )}
        </div>
      );
    }

    // Fallback to original error message format
    return (
      <>
        {getErrorMsg(errorMessage).map((msg, index) => (
          <p key={index} className="text-red-800 text-center">
            {index > 0 && <br />}
            {msg}
          </p>
        ))}
      </>
    );
  };

  const renderTeamSwitchWarning = () => {
    return (
      <div className="text-red-800 space-y-3 text-left">
        <p className="">
          Oops! You already belong to another team. If you join this new team, you'll lose access to
          your current team and its data.
        </p>
        <p>
          Want to keep your current team and data? Ask your admin to invite you using a different
          email address, or{' '}
          <a className="underline" href="mailto:support@smythos.com">
            contact support
          </a>{' '}
          and we'll help you migrate your account safely.
        </p>
      </div>
    );
  };

  const navigateToHome = async () => {
    if (agentId) {
      if (spaceId) {
        await saveUserSettings(userSettingKeys.USER_TEAM, spaceId, teamHeaderId);
      }
      window.location.href = `/builder/${agentId}`;
    } else {
      window.location.href = '/agents';
    }
  };

  const handleButtonClick = () => {
    const logKey = FRONTEND_USER_SETTINGS.ACCEPT_INVITE_LOGGED;

    // Check if the log has already been printed
    const [status, id] = sessionStorage.getItem(logKey)?.split?.('_') ?? [];
    if (status == 'accepted' && id == invitationId) {
      navigateToHome();
    } else {
      acceptInvite();
    }
  };

  const handleSwitchTeams = () => {
    acceptInvite();
  };

  return (
    <>
      {!isAccepted && !isAlreadyAMember && !errorMsg && !showTeamSwitchWarning ? (
        <section className="w-screen h-screen flex items-center justify-center">
          <Spinner />
        </section>
      ) : (
        <div className="font-sans text-white w-full h-[100vh] flex gap-10 flex-col md:flex-row items-center justify-center">
          <div className="flex flex-col bg-white shadow-sm border border-solid border-gray-100 p-10 max-w-[600px] w-11/12 rounded-lg text-black">
            <header className="flex items-center justify-between mb-8">
              <div className="flex items-center justify-center flex-grow transition duration-300">
                <img
                  src="/img/smythos/logo-with-text-dark.png"
                  className="h-4 w-auto"
                  alt="SmythOS"
                />
              </div>
            </header>
            {(errorMsg && !isAccepted) || showTeamSwitchWarning ? (
              <>
                {showTeamSwitchWarning ? renderTeamSwitchWarning() : renderErrorContent(errorMsg)}
                <footer className="flex w-full mt-4 h-[52px] text-base">
                  <Button
                    handleClick={showTeamSwitchWarning ? handleSwitchTeams : navigateToHome}
                    fullWidth
                    disabled={showTeamSwitchWarning && acceptInvitation.isLoading}
                  >
                    {showTeamSwitchWarning
                      ? acceptInvitation.isLoading
                        ? 'Switching...'
                        : 'Switch teams'
                      : 'Back to Home'}
                    {acceptInvitation.isLoading && <Spinner classes="w-8 h-8 ml-4" />}
                  </Button>
                </footer>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <main className="page-card-body text-center">
                    <img
                      src="/img/celeb_pop.png"
                      className="w-[156px] rotate-[30deg] h-auto m-auto"
                      alt="SmythOS"
                    />
                  </main>
                  <h1 className="text-4xl font-medium text-center">
                    Welcome to {user?.team?.name}
                  </h1>
                  {!isAlreadyAMember && (
                    <p className="text-center text-base">Thank you for joining SmythOS</p>
                  )}
                </div>
                <footer className="flex w-full h-[52px] text-base mt-4">
                  <Button handleClick={handleButtonClick} fullWidth>
                    {isAlreadyAMember ? 'Switch Team' : 'Get Started'}
                    {acceptInvitation.isLoading && <Spinner classes="w-8 h-8 ml-4" />}
                  </Button>
                </footer>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AcceptInvitationPage;
