import { TeamTag } from '@src/react/features/onboarding/components/TeamTag';
import { ISingleTeam } from '@src/react/features/onboarding/data/onboarding-mappings';
import classNames from 'classnames';
import { Avatar } from 'flowbite-react';

interface UserTeamCardBaseProps {
  selectedTeam?: ISingleTeam;
  avatar?: string;
}

interface EmailProps extends UserTeamCardBaseProps {
  email: string;
  username?: string;
}

interface UsernameProps extends UserTeamCardBaseProps {
  username: string;
  email?: string;
}

const AvatarThemeSettings = {
  root: {
    base: 'flex gap-x-4 rounded flex-wrap w-full [&>div:nth-child(2)]:max-w-[calc(100%_-_56px)]',
    color: {
      pink: 'ring-red-600 dark:ring-red-600',
    },
    initials: {
      text: 'font-medium text-white dark:text-white',
      base: 'relative inline-flex items-center justify-center overflow-hidden bg-red-600 dark:bg-red-600',
    },
  },
};

// Union type for the props, so that we can use the component with either email or username
type UserTeamCardProps = EmailProps | UsernameProps;

export const UserTeamCard = ({ selectedTeam, avatar, username, email }: UserTeamCardProps) => {
  const extractInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <div className="bg-gray-50 md:bg-white rounded-lg p-4 flex flex-col items-start gap-4 border border-solid border-gray-200">
      <Avatar
        img={avatar}
        placeholderInitials={extractInitials(username || email || '')}
        rounded
        color="pink"
        theme={AvatarThemeSettings}
      >
        {
          <div
            className={classNames('w-full red-bg-600', {
              'font-medium': username?.length, // bold only if username is present
            })}
          >
            <div className="text-lg overflow-hidden text-ellipsis w-full leading-10">
              {username || email}
            </div>
          </div>
        }
      </Avatar>
      {selectedTeam && <TeamTag team={selectedTeam} selectedTeam={selectedTeam} isReadonly />}
    </div>
  );
};
