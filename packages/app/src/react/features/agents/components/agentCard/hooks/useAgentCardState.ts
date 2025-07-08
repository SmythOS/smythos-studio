import { AgentCardState, TooltipPosition } from '@react/features/agents/components/agentCard/types';
import { useCallback, useEffect, useState } from 'react';

const HOVER_TIMEOUT = 1500;

interface UseAgentCardStateProps {
  agentId: string;
}

interface UseAgentCardStateResult extends AgentCardState {
  setIsDeleted: (deleted: boolean) => void;
  setIsDeleting: (deleting: boolean) => void;
  setIsDuplicating: (duplicating: boolean) => void;
  setIsActionDropdownVisible: (visible: boolean) => void;
  setIsButtonTooltipVisible: (visible: boolean) => void;
  setTooltipPosition: (position: TooltipPosition) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

/**
 * Custom hook for managing agent card state and hover interactions
 */
export function useAgentCardState({ agentId }: UseAgentCardStateProps): UseAgentCardStateResult {
  const [state, setState] = useState<AgentCardState>({
    isDeleted: false,
    isDeleting: false,
    isDuplicating: false,
    showTooltip: false,
    tooltipPosition: 'bottom',
    isActionDropdownVisible: false,
    isButtonTooltipVisible: false,
    hoverTimeout: null,
  });

  const updateState = useCallback((updates: Partial<AgentCardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setIsDeleted = useCallback(
    (isDeleted: boolean) => {
      updateState({ isDeleted });
    },
    [updateState],
  );

  const setIsDeleting = useCallback(
    (isDeleting: boolean) => {
      updateState({ isDeleting });
    },
    [updateState],
  );

  const setIsDuplicating = useCallback(
    (isDuplicating: boolean) => {
      updateState({ isDuplicating });
    },
    [updateState],
  );

  const setIsActionDropdownVisible = useCallback(
    (isActionDropdownVisible: boolean) => {
      updateState({ isActionDropdownVisible });
    },
    [updateState],
  );

  const setIsButtonTooltipVisible = useCallback(
    (isButtonTooltipVisible: boolean) => {
      updateState({ isButtonTooltipVisible });
    },
    [updateState],
  );

  const setTooltipPosition = useCallback(
    (tooltipPosition: TooltipPosition) => {
      updateState({ tooltipPosition });
    },
    [updateState],
  );

  const handleMouseEnter = useCallback(() => {
    const timeout = setTimeout(() => {
      updateState({ showTooltip: true });
    }, HOVER_TIMEOUT);
    updateState({ hoverTimeout: timeout });
  }, [updateState]);

  const handleMouseLeave = useCallback(() => {
    if (state.hoverTimeout) {
      clearTimeout(state.hoverTimeout);
    }
    updateState({ hoverTimeout: null, showTooltip: false });
  }, [state.hoverTimeout, updateState]);

  // Calculate tooltip position based on viewport
  useEffect(() => {
    const calculateTooltipPosition = () => {
      const cardElement = document.getElementById(`agent-card-${agentId}`);
      if (cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setTooltipPosition(spaceBelow < 100 ? 'top' : 'bottom');
      }
    };

    calculateTooltipPosition();
    window.addEventListener('resize', calculateTooltipPosition);
    return () => window.removeEventListener('resize', calculateTooltipPosition);
  }, [agentId, setTooltipPosition]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (state.hoverTimeout) {
        clearTimeout(state.hoverTimeout);
      }
    };
  }, [state.hoverTimeout]);

  return {
    ...state,
    setIsDeleted,
    setIsDeleting,
    setIsDuplicating,
    setIsActionDropdownVisible,
    setIsButtonTooltipVisible,
    setTooltipPosition,
    handleMouseEnter,
    handleMouseLeave,
  };
}
