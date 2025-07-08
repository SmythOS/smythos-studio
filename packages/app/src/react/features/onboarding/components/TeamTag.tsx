import { ISingleTeam } from '@src/react/features/onboarding/data/onboarding-mappings';
import classNames from 'classnames';
import { memo } from 'react';

interface ITeamTagProps {
  team: ISingleTeam;
  isReadonly?: boolean;
  selectedTeam: ISingleTeam | null;
  onTeamSelect?: (team: ISingleTeam) => void;
}

export const TeamTag = memo(
  ({ team, selectedTeam, isReadonly, onTeamSelect }: ITeamTagProps) => {
    const isSelected = selectedTeam?.value === team?.value;
    const hasSelectedTeam = selectedTeam !== null && !isSelected;

    return (
      <div
        onClick={() => onTeamSelect?.(team)}
        className={classNames(
          'group flex justify-between items-center gap-2 border border-solid px-2 py-1 text-sm rounded-md',
          {
            'text-gray-400 border-gray-400': hasSelectedTeam,
            'text-gray-600 border-gray-400': !hasSelectedTeam,
            'text-gray-600 border-primary-100 bg-green-100': isSelected && !isReadonly,
            'hover:text-gray-600 hover:border-primary-100 hover:bg-green-100 cursor-pointer':
              !isReadonly,
          },
        )}
      >
        {team?.icon && (
          <team.icon
            className={classNames('inline-block text-sm', {
              'text-primary-100': isSelected,
              'text-gray-400': hasSelectedTeam,
              'text-gray-600': !hasSelectedTeam,
              'group-hover:text-primary-100': !isReadonly,
            })}
          />
        )}
        {team?.name}
      </div>
    );
  },
);
