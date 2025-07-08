/* eslint-disable max-len, react-hooks/exhaustive-deps*/
import { teamAPI } from '@src/react/features/teams/clients';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { FRONTEND_USER_SETTINGS } from '@src/react/shared/enums';
import { saveUserSettings } from '@src/react/shared/hooks/useUserSettings';
import { SmythAPIError } from '@src/react/shared/types/api-results.types';
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
  } = useAuthCtx();
  const [searchParams] = useSearchParams();
  const [hasAcceptedInvite, setHasAcceptedInvite] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const agentId = searchParams.get('agentId');
  const spaceId = searchParams.get('spaceId');
  const spaceRoleId = searchParams.get('spaceRoleId');
  const [teamHeaderId, setTeamHeaderId] = useState('');

  const isAlreadyAMember = useMemo(() => !user?.userTeamRole?.isTeamInitiator, [user]);

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
        toast('Invitation accepted');
      }, 1000);
    },

    onError: async (error: SmythAPIError) => {
      console.log('error', error); // eslint-disable-line no-console
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

  return (
    <>
      {!isAccepted && !isAlreadyAMember && !errorMsg ? (
        <section className="w-screen h-screen flex items-center justify-center">
          <Spinner />
        </section>
      ) : (
        <div className="font-sans text-white w-full h-[100vh] flex gap-10 flex-col md:flex-row items-center justify-center">
          <div className="flex flex-col bg-white shadow-sm border border-solid border-gray-100 p-10 max-w-[455px] w-11/12 rounded-lg text-black">
            <header className="flex items-center justify-between mb-8">
              <div className="flex items-center justify-center flex-grow transition duration-300">
                <img
                  src="/img/smythos/logo-with-text-dark.png"
                  className="h-4 w-auto"
                  alt="SmythOS"
                />
              </div>
            </header>
            {errorMsg && !isAccepted ? (
              <>
                {getErrorMsg(acceptInvitation.error?.error?.message).map((msg, index) => (
                  <p key={index} className="text-red-800 text-center">
                    {index > 0 && <br />}
                    {msg}
                  </p>
                ))}
                <footer className="flex w-full mt-4 h-[52px] text-base">
                  <Button handleClick={navigateToHome} fullWidth>
                    Back to Home
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
