import classNames from 'classnames';
import { useRef } from 'react';
import { FaArrowRight, FaRotateRight } from 'react-icons/fa6';
import { Agent } from '../types/agents.types';
import AgentCard from './agentCard';
import { SkeletonLoader } from './SkeletonLoader';

interface AgentsGridProps {
  agents: Agent[];
  totalAgents: number;
  isInitialLoading: boolean;
  isLoadingAfterAction: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onRefreshAgents: () => void;
  updateAgentInPlace: (updatedAgent: Agent) => void;
}

/**
 * Component for displaying agents in a grid layout with loading states and pagination
 */
export function AgentsGrid({
  agents,
  totalAgents,
  isInitialLoading,
  isLoadingAfterAction,
  isLoadingMore,
  onLoadMore,
  onRefreshAgents,
  updateAgentInPlace,
}: AgentsGridProps) {
  const endOfPageRef = useRef<HTMLDivElement>(null);

  // Filter out model agents (client-side filtering for now)
  const excludeModelAgents = (agent: Agent) => {
    return !agent.id?.startsWith('model-');
  };

  const currentAgentCount = agents.length;

  const filteredAgents = agents.filter(excludeModelAgents);

  if (isInitialLoading || isLoadingAfterAction) {
    return (
      <div className="py-5 mx-auto mb-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  if (filteredAgents.length === 0) {
    return (
      <div className="py-5 mx-auto mb-6">
        <div className="py-5 mx-auto w-11/12">
          <p className="secondary-grey mt-15">No agents available.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-qa="agents-list-section" className="py-5 mx-auto mb-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {filteredAgents.map((agent) => (
          <AgentCard 
            agent={agent} 
            key={agent.id} 
            loadAgents={onRefreshAgents}
            updateAgentInPlace={updateAgentInPlace}
          />
        ))}
        {isLoadingMore && <SkeletonLoader />}
      </div>

      {currentAgentCount < totalAgents && !isInitialLoading && (
        <button
          onClick={onLoadMore}
          type="button"
          className="group mt-3 float-right mr-0 flex justify-center items-center
           text-gray-700 relative py-2 text-sm hover:no-underline after:absolute 
           after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-current after:transition-all after:duration-300"
        >
          {isLoadingMore && (
            <FaRotateRight
              className={classNames('w-5 h-5 text-gray-600 dark:text-white mr-2', {
                'animate-spin': isLoadingMore,
              })}
            />
          )}
          <span>
            View more agents
            <FaArrowRight className="inline-block ml-1" />
          </span>
        </button>
      )}
      <div ref={endOfPageRef} />
    </div>
  );
}
