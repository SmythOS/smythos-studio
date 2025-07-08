import { Button } from '@react/shared/components/ui/newDesign/button';
import { ChatIconWithTail } from '@src/react/shared/components/svgs';
import classNames from 'classnames';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ModelAgentCardProps {
  model: {
    id: string;
    name: string;
    description: string;
    avatar: string;
  };
}

export const ModelAgentCard: React.FC<ModelAgentCardProps> = ({ model }) => {
  const navigate = useNavigate();

  return (
    <div
      className="border-gray-300 hover:border-blue-500 hover:shadow-md transition-colors rounded-lg bg-white border border-solid px-5 pt-4 pb-[48px] min-h-[152px]"
      onClick={() => {
        navigate(`/chat/${model.id}`);
      }}
    >
      <div className="flex items-center cursor-pointer">
        <div className="w-full">
          <div className="mb-2">
            <div className="w-[24px] min-w-[24px] h-[24px] rounded-full mr-2 overflow-hidden inline-block align-middle">
              <img src={model.avatar} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-base font-medium leading-6 inline-block align-middle">
              {model.name}
            </h3>
          </div>
          <div>
            <p className="text-sm text-gray-500 mt-0.5 mb-3">{model.description}</p>
          </div>
        </div>

        {/* <p className="text-[13px] text-gray-500 mt-0.5">{model.provider}</p> */}
      </div>
      <div className="absolute right-6 bottom-4">
        <Button
          isLink={true}
          linkTo={`/chat/${model.id}`}
          dataAttributes={{ 'data-test': 'chat-agent-button' }}
          handleClick={(e) => e.stopPropagation()}
          className={classNames(
            'float-right relative h-8 w-20 overflow-hidden rounded-lg transition duration-300 justify-center',
            'border border-solid border-v2-blue bg-white hover:bg-v2-blue/10',
          )}
          Icon={
            <div className="block mr-1">
              <ChatIconWithTail stroke="#3C89F9" fill="#3C89F9" />
            </div>
          }
          addIcon
        >
          <span className={classNames('text-v2-blue', 'text-sm font-normal font-inter')}>
            Chat
          </span>
        </Button>
      </div>
    </div>
  );
};

export default ModelAgentCard;
