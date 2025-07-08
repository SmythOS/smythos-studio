import { DeleteAccountType } from '@src/react/features/account/enum';
import BlockAccountDeleteModal from '@src/react/features/account/modal/block-account-delete';
import DeleteAccountModal from '@src/react/features/account/modals/deleteAccountModal';
import { teamAPI } from '@src/react/features/teams/clients';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const UserInfoCard = () => {
  const {
    userInfo: { subs, user },
  } = useAuthCtx();

  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [blockAccountDeleteModalOpen, setBlockAccountDeleteModalOpen] = useState(false);
  const [userName, setUserName] = useState(user.name || 'User');
  const [loadingUserName, setLoadingUserName] = useState(true); // New loading state

  useEffect(() => {
    // Fetch user data if user.name does not exist
    if (!user.name) {
      const fetchUserData = async () => {
        try {
          const response = await fetch('/api/page/onboard/get-data');
          const data = await response.json();
          if (data && data.name) {
            setUserName(data.name);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoadingUserName(false); // Set loading to false after fetching
        }
      };

      fetchUserData();
    } else {
      setLoadingUserName(false); // If user.name exists, set loading to false
    }
  }, [user.name]);

  const teamMembersQuery = useQuery({
    queryKey: ['team_members_list'],
    queryFn: teamAPI.getTeamMembers,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const isActiveSubscription = (subs) => {
    return (
      subs.object?.status === 'active' && !subs.object?.cancel_at_period_end && subs.plan?.paid
    );
  };

  const deleteAccRequirements = [
    {
      title: 'You do not have permissions to delete this account.',
      type: DeleteAccountType.IS_NOT_TEAM_OWNER,
      bool: !user.userTeamRole.isTeamInitiator,
      error:
        'Please contact the account owner for assistance. You can view the owner on the Members page. If you need help, reach out to support.',
    },
    {
      title: 'Account deletion blocked',
      type: DeleteAccountType.USER_HAS_TEAM_MEMBERS_AND_SUBSCRIPTION,
      bool:
        !teamMembersQuery.isLoading &&
        teamMembersQuery.data?.members?.length > 1 &&
        isActiveSubscription(subs),
      error: 'Your account cannot be deleted while you have active team members.',
      steps: [
        'Remove all team members from your account',
        `Then cancel your subscription from <a href="/my-plan">My Plan page</a>`,
        'Contact support if you need assistance',
      ],
    },
    {
      title: 'Account deletion blocked',
      type: DeleteAccountType.USER_HAS_TEAM_MEMBERS,
      bool: !teamMembersQuery.isLoading && teamMembersQuery.data?.members?.length > 1,
      error: 'Your account cannot be deleted while you have active team members.',
      isLoading: teamMembersQuery.isLoading,
      steps: [
        'Remove all team members from your account',
        'Contact support if you need assistance',
      ],
    },
    {
      title: 'Account deletion blocked',
      type: DeleteAccountType.USER_HAS_SUBSCRIPTION,
      bool: isActiveSubscription(subs),
      error:
        'Your account cannot be deleted while you have active subscription. To proceed with deletion, <a href="/my-plan">click here</a> and cancel your subscription.',
    },
  ];

  const deleteAccConditionsLoading = deleteAccRequirements.some((req) => req.isLoading);
  const deleteAccRequirement = deleteAccRequirements.find((req) => req.bool);
  const canDeleteAccount = deleteAccRequirements.every((req) => !req.bool);

  const deleteBtn = (
    <CustomButton
      className="mt-5"
      handleClick={() =>
        canDeleteAccount ? setDeleteAccountModalOpen(true) : setBlockAccountDeleteModalOpen(true)
      }
      fullWidth
    >
      Delete Account
    </CustomButton>
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <div className="flex justify-center items-center">
            <div className="text-center flex flex-col items-center justify-center">
              <h5 className="text-lg font-semibold">User Profile</h5>
              <img
                className="pb-2 mt-3 min-w-[85px]"
                src={user.avatar || '/img/user_default.svg'}
                alt="User Avatar"
              />
              <div className="text-xl font-semibold" id="user-name">
                {loadingUserName ? 'Loading...' : userName} {/* Show loading text */}
              </div>
              <span>{user.email}</span>
              {user?.createdAt && (
                <p className="mt-3 ">
                  <b className="text-xs">Member Since: </b>
                  <span className="text-xs">
                    {Intl.DateTimeFormat('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }).format(new Date(user.createdAt))}
                  </span>
                </p>
              )}

              {/* Delete account button */}

              {deleteAccConditionsLoading ? (
                <div className="h-10 w-full shadow rounded-lg text-sm animate-pulse mt-5 bg-gray-200 dark:bg-gray-700"></div>
              ) : (
                deleteBtn
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {deleteAccountModalOpen &&
        createPortal(
          <DeleteAccountModal
            onClose={() => {
              setDeleteAccountModalOpen(false);
            }}
          />,
          document.body,
        )}

      {blockAccountDeleteModalOpen &&
        createPortal(
          <BlockAccountDeleteModal
            deleteAccRequirement={deleteAccRequirement}
            handleToggle={setBlockAccountDeleteModalOpen}
          />,
          document.body,
        )}
    </>
  );
};

export default UserInfoCard;
