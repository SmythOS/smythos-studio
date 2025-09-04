import { debounce } from 'lodash-es';
import { useCallback, useEffect, useState } from 'react';
import { Agent } from '../types/agents.types';

const DEFAULT_SORT_FIELD = 'isPinned,createdAt';
const DEFAULT_SORT_ORDER = 'desc' as const;
export const AGENTS_PAGINATION_LIMIT = 8;

interface UseAgentsDataResult {
  agents: Agent[];
  isAgentsLoading: boolean;
  currentPage: number;
  totalAgents: number;
  agentsUpdated: boolean;
  searchQuery: string;
  sortCriteria: string;
  sortOrder: 'asc' | 'desc';
  sortField: string;
  isLoadingMore: boolean;
  isInitialLoading: boolean;
  isLoadingAfterAction: boolean;
  setAgentsUpdated: (updated: boolean) => void;
  loadAgents: (page?: number, isActionTriggered?: boolean) => void;
  updateAgentInPlace: (updatedAgent: Agent) => void;
  handleSearch: (query: string) => void;
  setSortCriteria: (criteria: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  toggleSortOrder: () => void;
  handleLoadMore: () => void;
}

/**
 * Custom hook for managing agents data, search, sorting, and pagination
 */
export function useAgentsData(): UseAgentsDataResult {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isAgentsLoading, setIsAgentsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAgents, setTotalAgents] = useState(0);
  const [agentsUpdated, setAgentsUpdated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCriteria, setSortCriteria] = useState(() => {
    const stored = localStorage.getItem('agentSortCriteria');
    // Only update if the stored value doesn't contain 'isPinned'
    if (stored && !stored.includes('isPinned')) {
      const updatedValue = `isPinned,${stored}`;
      localStorage.setItem('agentSortCriteria', updatedValue);
      return updatedValue;
    }
    return stored || DEFAULT_SORT_FIELD;
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (localStorage.getItem('agentSortOrder') as 'asc' | 'desc') || DEFAULT_SORT_ORDER,
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingAfterAction, setIsLoadingAfterAction] = useState(false);

  const loadAgents = useCallback(
    (page = 1, isActionTriggered = false) => {
      if (page === 1 && isActionTriggered) {
        setIsLoadingAfterAction(true);
      } else if (page === 1) {
        setIsInitialLoading(true);
      }
      setIsAgentsLoading(true);

      // Ensure sort parameters are always included in the request
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: AGENTS_PAGINATION_LIMIT.toString(),
        search: searchQuery,
        sortField: sortCriteria,
        order: sortOrder,
      });

      fetch(`/api/page/agents/agents?${queryParams.toString()}`)
        .then((response) => response.json())
        .then(({ agents: newAgents, total }: { agents: Agent[]; total: number }) => {
          // Backend handles all sorting (including pinned agents first), no need to sort on frontend
          if (page === 1) {
            setAgents(newAgents);
          } else {
            setAgents((prev) => [...prev, ...newAgents]);
          }
          setTotalAgents(total);
          setCurrentPage(page);
        })
        .catch((error) => {
          console.error(`Error fetching agents: ${error}`);
        })
        .finally(() => {
          setIsInitialLoading(false);
          setIsLoadingMore(false);
          setIsLoadingAfterAction(false);
          setIsAgentsLoading(false);
        });
    },
    [searchQuery, sortCriteria, sortOrder],
  );

  // Debounced function for search input
  const handleSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
      setCurrentPage(1); // Reset to first page on new search
    }, 500),
    [],
  );

  const toggleSortOrder = useCallback(() => {
    setSortOrder((sortOrder) => (sortOrder === 'asc' ? 'desc' : 'asc'));
  }, []);

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    loadAgents(currentPage + 1);
  }, [currentPage, loadAgents]);

  const updateAgentInPlace = useCallback((updatedAgent: Agent) => {
    setAgents((prevAgents) =>
      prevAgents.map((agent) => (agent.id === updatedAgent.id ? updatedAgent : agent)),
    );
  }, []);

  // Load agents on mount and when search/sort changes
  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortCriteria, sortOrder]); // Direct dependencies instead of loadAgents

  // Persist sort settings to localStorage
  useEffect(() => {
    localStorage.setItem('agentSortCriteria', sortCriteria);
    localStorage.setItem('agentSortOrder', sortOrder);
  }, [sortCriteria, sortOrder]);

  // Extract the actual sort field for dropdown (remove isPinned if present)
  const sortField = sortCriteria.includes(',')
    ? sortCriteria.split(',').find((field) => field !== 'isPinned') || 'createdAt'
    : sortCriteria;

  return {
    agents,
    isAgentsLoading,
    currentPage,
    totalAgents,
    agentsUpdated,
    searchQuery,
    sortCriteria,
    sortOrder,
    sortField,
    isLoadingMore,
    isInitialLoading,
    isLoadingAfterAction,
    setAgentsUpdated,
    loadAgents,
    updateAgentInPlace,
    handleSearch,
    setSortCriteria,
    setSortOrder,
    toggleSortOrder,
    handleLoadMore,
  };
}
