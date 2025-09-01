import { Menu } from '@headlessui/react';
import { useAgentCardState } from '@src/react/features/agents/components/agentCard/hooks/useAgentCardState';
import { useAgentData } from '@src/react/features/agents/components/agentCard/hooks/useAgentData';
import { useAgentOperations } from '@src/react/features/agents/components/agentCard/hooks/useAgentOperations';
import { AgentActivityModal } from '@src/react/features/agents/components/agentCard/modals/AgentActivityModal';
import { AgentContributorsModal } from '@src/react/features/agents/components/agentCard/modals/AgentContributorsModal';
import { AgentDeleteConfirmationModal } from '@src/react/features/agents/components/agentCard/modals/AgentDeleteConfirmationModal';
import { IAgent } from '@src/react/features/agents/components/agentCard/types';
import { ChatIconWithTail, PencilIcon, PinIcon, PinIconSlim, UnPinIcon } from '@src/react/shared/components/svgs';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { FEATURE_FLAGS } from '@src/shared/constants/featureflags';
import classNames from 'classnames';
import { Tooltip } from 'flowbite-react';
import { useFeatureFlagPayload } from 'posthog-js/react';
import { useRef, useState } from 'react';
import {
  FaCircleNotch,
  FaClockRotateLeft,
  FaEllipsisVertical,
  FaEye,
  FaRegCopy,
  FaTrash,
  FaUsers,
} from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

const DEFAULT_AVATAR = '/img/user_default.svg';

interface AgentCardProps {
  /** Agent data object */
  agent: IAgent;
  /** Callback when agents need to be reloaded */
  loadAgents: (page: number, isInitialLoad?: boolean) => void;
  /** Callback to update a single agent in place */
  updateAgentInPlace: (updatedAgent: IAgent) => void;
}

/**
 * AgentCard component for displaying individual agent information
 * Features: avatar, name, description, action buttons, tooltips, and modals
 */
export function AgentCard({ agent, loadAgents, updateAgentInPlace }: AgentCardProps) {
  const navigate = useNavigate();
  const featureFlagPayload = useFeatureFlagPayload(FEATURE_FLAGS.AGENT_KEY_DROPDOWN);
  const { isStaffUser } = useAuthCtx();

  // Modal states
  const [isContributorsModalOpen, setIsContributorsModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [showDeleteConfirmationModal, setShowDeleteConfirmationModal] = useState(false);

  // Custom hooks for state and data management
  const cardState = useAgentCardState({ agentId: agent.id });
  const agentData = useAgentData({ agent });
  const { duplicateAgent, deleteAgent, pinAgent } = useAgentOperations({
    agent,
    onAgentDeleted: () => {
      cardState.setIsDeleted(true);
      loadAgents(1, true);
    },
    onAgentDuplicated: () => loadAgents(1, true),
    onAgentPinned: (updatedAgent) => {
      updateAgentInPlace(updatedAgent);
    },
  });

  // Track dropdown state
  const dropdownOpenRef = useRef(false);

  const handleAgentClick = () => {
    navigate(`/agent-settings/${agent.id}`);
  };

  const handleDuplicateAgent = async () => {
    cardState.setIsDuplicating(true);
    try {
      await duplicateAgent();
      // Close the dropdown after successful duplication
      cardState.setIsActionDropdownVisible(false);
    } catch (error) {
      // Keep dropdown open on error so user can retry
      console.error('Duplication failed:', error);
    } finally {
      cardState.setIsDuplicating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirmationModal(false);
    cardState.setIsDeleting(true);
    try {
      await deleteAgent();
    } finally {
      cardState.setIsDeleting(false);
    }
  };

  const handlePinAgent = async () => {
    cardState.setIsPinning(true);
    try {
      await pinAgent();
      cardState.setIsActionDropdownVisible(false);
    } catch (error) {
      console.error('❌ Pin/unpin failed:', error);
    } finally {
      cardState.setIsPinning(false);
    }
  };

  // Don't render if deleted
  if (cardState.isDeleted) {
    return null;
  }

  const chatTooltipContent = (
    <>
      To chat with your agent, please deploy to production.{' '}
      <>
        <Link to={`/builder/${agent.id}`} className="underline" reloadDocument>
          Deploy
        </Link>{' '}
        your agent now.
      </>
    </>
  );

  const userName = agentData?.userName?.split('@')[0];

  return (
    <>
      <Tooltip
        content={agentData.description}
        trigger="hover"
        placement={cardState.tooltipPosition}
        className={classNames('opacity-100 text-center agent-card-tooltip', {
          'invisible opacity-0 pointer-events-none':
            cardState.isButtonTooltipVisible ||
            cardState.isActionDropdownVisible ||
            !cardState.showTooltip,
        })}
        style="dark"
        onClick={(e) => e.stopPropagation()}
        theme={{ target: 'w-full' }}
      >
        <div
          id={`agent-card-${agent.id}`}
          onMouseEnter={cardState.handleMouseEnter}
          onMouseLeave={cardState.handleMouseLeave}
          onClick={handleAgentClick}
          className={classNames(
            'relative flex items-start bg-gray-50 border cursor-pointer h-[120px]',
            'rounded-lg border-solid transition duration-300 border-gray-300',
            'hover:border-v2-blue hover:shadow-md',
            'before:absolute before:inset-0 before:rounded-lg before:pointer-events-none',
            { 'opacity-50': cardState.isDeleted || cardState.isDeleting },
          )}
        >
          {/* Avatar Section */}
          <div className="w-[25%] h-[120px] p-1">
            <img
              className={classNames('w-full h-full rounded-l-md', {
                'object-cover': agentData.avatarImage !== DEFAULT_AVATAR,
              })}
              src={agentData.avatarImage}
              alt={agent.name || 'Agent avatar'}
            />
          </div>

          {/* Content Section */}
          <div className="p-3 h-[120px] flex-grow flex flex-col justify-between w-[65%]">
            {/* Header with name and dropdown */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-gray-900 truncate" title={agent.name}>
                  {agent.name}
                </h3>
                <p
                  className="mt-1 text-sm text-gray-500 line-clamp-2 whitespace-nowrap text-ellipsis"
                  title={userName}
                >
                  by {userName}
                </p>
              </div>
              {agent.isPinned && (
                <div className="relative py-1">
                  <PinIconSlim className="text-white text-[10px] m-auto" />
                </div>
              )}
              {/* Actions Dropdown */}
              {(agentData.permissions.canEdit || agentData.permissions.canRead || isStaffUser) && (
                <Menu as="div" className="relative">
                  {({ open }) => {
                    // Track dropdown state for tooltip visibility
                    if (dropdownOpenRef.current !== open) {
                      dropdownOpenRef.current = open;
                      // Use setTimeout to avoid setState during render
                      setTimeout(() => {
                        cardState.setIsActionDropdownVisible(open);
                      }, 0);
                    }

                    return (
                      <>
                        <Menu.Button
                          className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          onClick={(e) => e.stopPropagation()}
                          data-qa="agent-card-ellipsis-button"
                        >
                          <FaEllipsisVertical className="w-4 h-4" />
                        </Menu.Button>

                        <Menu.Items className="absolute right-0 top-6 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                          <div className="py-1">
                            {/* Pin/Unpin */}
                            {agentData.permissions.canDuplicate && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handlePinAgent();
                                      // Don't close menu immediately - let handlePinAgent control it
                                    }}
                                    disabled={cardState.isPinning}
                                    className={classNames(
                                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                      'group flex items-center px-4 py-2 text-sm w-full text-left',
                                      { 'opacity-50 cursor-not-allowed': cardState.isPinning },
                                    )}
                                  >
                                    {cardState.isPinning ? (
                                      <FaCircleNotch className="mr-3 h-4 w-4 animate-spin" />
                                    ) : (
                                      <div className="relative mr-3 h-4 w-4">
                                        {agent.isPinned ?
                                            <UnPinIcon className="h-4 w-4" /> :
                                            <PinIcon className="h-4 w-4" />
                                        }
                                      </div>
                                    )}
                                    {cardState.isPinning 
                                      ? (agent.isPinned ? 'Unpinning...' : 'Pinning...') 
                                      : (agent.isPinned ? 'Unpin Agent' : 'Pin Agent')
                                    }
                                  </button>
                                )}
                              </Menu.Item>
                            )}
                            {/* Duplicate */}
                            {agentData.permissions.canDuplicate && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDuplicateAgent();
                                      // Don't close menu immediately - let handleDuplicateAgent control it
                                    }}
                                    disabled={cardState.isDuplicating}
                                    className={classNames(
                                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                      'group flex items-center px-4 py-2 text-sm w-full text-left',
                                      { 'opacity-50 cursor-not-allowed': cardState.isDuplicating },
                                    )}
                                  >
                                    {cardState.isDuplicating ? (
                                      <FaCircleNotch className="mr-3 h-4 w-4 animate-spin" />
                                    ) : (
                                      <FaRegCopy className="mr-3 h-4 w-4" />
                                    )}
                                    {cardState.isDuplicating ? 'Duplicating...' : 'Duplicate'}
                                  </button>
                                )}
                              </Menu.Item>
                            )}

                            {/* Contributors */}
                            {agent.contributors && agent.contributors.length > 0 && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsContributorsModalOpen(true);
                                    }}
                                    className={classNames(
                                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                      'group flex items-center px-4 py-2 text-sm w-full text-left',
                                    )}
                                  >
                                    <FaUsers className="mr-3 h-4 w-4" />
                                    Contributors
                                  </button>
                                )}
                              </Menu.Item>
                            )}

                            {/* Activity */}
                            {(featureFlagPayload as { showActivity?: boolean })?.showActivity && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsActivityModalOpen(true);
                                    }}
                                    className={classNames(
                                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                      'group flex items-center px-4 py-2 text-sm w-full text-left',
                                    )}
                                  >
                                    <FaClockRotateLeft className="mr-3 h-4 w-4" />
                                    Activity
                                  </button>
                                )}
                              </Menu.Item>
                            )}

                            {/* Delete */}
                            {agentData.permissions.canDelete && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowDeleteConfirmationModal(true);
                                    }}
                                    disabled={cardState.isDeleting}
                                    className={classNames(
                                      active ? 'bg-red-100 text-red-900' : 'text-red-700',
                                      'group flex items-center px-4 py-2 text-sm w-full text-left',
                                      { 'opacity-50 cursor-not-allowed': cardState.isDeleting },
                                    )}
                                  >
                                    {cardState.isDeleting ? (
                                      <FaCircleNotch className="mr-3 h-4 w-4 animate-spin" />
                                    ) : (
                                      <FaTrash className="mr-3 h-4 w-4" />
                                    )}
                                    {cardState.isDeleting ? 'Deleting...' : 'Delete'}
                                  </button>
                                )}
                              </Menu.Item>
                            )}
                          </div>
                        </Menu.Items>
                      </>
                    );
                  }}
                </Menu>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              {/* Edit/View Button */}
              {agentData.permissions.canRead && (
                <Button
                  variant="secondary"
                  isLink
                  reloadDocument
                  linkTo={`/builder/${agent.id}`}
                  dataAttributes={{ 'data-test': 'edit-agent-button' }}
                  className="relative h-8 w-20 overflow-hidden border border-solid border-[#D1D1D1] rounded-lg transition duration-300 justify-center bg-white hover:bg-[#e6e6e6]"
                  Icon={
                    <div className="block">
                      {agentData.permissions.canEdit ? (
                        <PencilIcon className="stroke-[#727272] mr-1" />
                      ) : (
                        <FaEye className="text-[#727272] mr-1" size={15} />
                      )}
                    </div>
                  }
                  addIcon
                  onMouseEnter={() => cardState.setIsButtonTooltipVisible(true)}
                  onMouseLeave={() => cardState.setIsButtonTooltipVisible(false)}
                >
                  <span className="text-sm font-normal text-[#5a5a5a] font-body">
                    {agentData.permissions.canEdit ? 'Edit' : 'View'}
                  </span>
                </Button>
              )}

              {/* Chat Button */}
              <Tooltip
                content={chatTooltipContent}
                trigger="hover"
                placement={cardState.tooltipPosition === 'bottom' ? 'top' : 'bottom'}
                className={classNames(
                  agentData.isAvailable ? 'opacity-0 pointer-events-none' : 'opacity-100',
                  'min-w-[280px] text-center',
                )}
                hidden={agentData.isAvailable}
                style="dark"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="secondary"
                  isLink={agentData.isAvailable}
                  linkTo={agentData.isAvailable ? `/chat/${agent.id}` : ''}
                  dataAttributes={{ 'data-test': 'chat-agent-button' }}
                  handleClick={(e) => e.stopPropagation()}
                  className={classNames(
                    'relative h-8 w-20 overflow-hidden border border-solid rounded-lg transition duration-300 justify-center',
                    {
                      'border-v2-blue bg-white hover:bg-v2-blue/10': agentData.isAvailable,
                      'border-[#D1D1D1] bg-gray-100 cursor-not-allowed': !agentData.isAvailable,
                    },
                  )}
                  Icon={
                    <div className="block">
                      <ChatIconWithTail
                        className="mr-1"
                        stroke={agentData.isAvailable ? '#3C89F9' : '#727272'}
                        fill={agentData.isAvailable ? '#3C89F9' : '#727272'}
                      />
                    </div>
                  }
                  addIcon
                  onMouseEnter={() => cardState.setIsButtonTooltipVisible(true)}
                  onMouseLeave={() => cardState.setIsButtonTooltipVisible(false)}
                >
                  <span
                    className={classNames('text-sm font-normal font-body', {
                      'text-v2-blue': agentData.isAvailable,
                      'text-[#5a5a5a]': !agentData.isAvailable,
                    })}
                  >
                    Chat
                  </span>
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </Tooltip>

      {/* Modals */}
      <AgentDeleteConfirmationModal
        isOpen={showDeleteConfirmationModal}
        isDeleting={cardState.isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirmationModal(false)}
      />

      <AgentContributorsModal
        isOpen={isContributorsModalOpen}
        contributors={agent.contributors || []}
        onClose={() => setIsContributorsModalOpen(false)}
      />

      <AgentActivityModal
        isOpen={isActivityModalOpen}
        activities={[]}
        onClose={() => setIsActivityModalOpen(false)}
      />
    </>
  );
}
