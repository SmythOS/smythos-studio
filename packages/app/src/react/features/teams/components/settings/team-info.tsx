import classNames from 'classnames';
import { FC } from 'react';
import { AiOutlineEdit } from 'react-icons/ai';

interface TeamInfoProps {
  teamName: string;
  canDeleteSpace: boolean;
  setIsEditing: (isEditing: boolean) => void; // eslint-disable-line no-unused-vars
}

export const TeamInfo: FC<TeamInfoProps> = ({ teamName, canDeleteSpace, setIsEditing }) => {
  return (
    <div className="bg-white rounded-lg p-6 mb-4 overflow-hidden border border-solid border-gray-200">
      <div className="absolute h-[60px] w-full inset-0 bg-v2-blue" />
      <div
        className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center 
            text-white text-3xl mb-4"
      >
        {teamName?.slice(0, 2).toUpperCase()}
      </div>
      <div className="text-xl font-semibold mb-2 mt-8 break-all">
        <h2 className="inline-block w-[calc(100%-24px)]">{teamName}</h2>
        {canDeleteSpace && (
          <button className={classNames('align-middle')} data-qa="edit-space-name-button" onClick={() => setIsEditing(true)}>
            <AiOutlineEdit className="mr-1" />
          </button>
        )}
      </div>
    </div>
  );
};
