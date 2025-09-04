import HeaderSearch from '@react/shared/components/headerSearch';
import { AscendingIcon, DescendingIcon } from '@react/shared/components/svgs';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@react/shared/components/ui/select';
import { Suspense } from 'react';

import { SortOption } from '../types/agents.types';

interface AgentsHeaderProps {
  sortCriteria: string;
  sortOrder: 'asc' | 'desc';
  onSortCriteriaChange: (criteria: string) => void;
  onSortOrderToggle: () => void;
  onSearch: (query: string) => void;
  onCreateAgentClick: () => void;
  isReadOnlyAccess: boolean;
}

const SORT_FIELDS = [
  {
    title: 'Name',
    value: 'name',
  },
  {
    title: 'Date Created',
    value: 'createdAt',
    isDefault: true,
  },
  {
    title: 'Date Modified',
    value: 'updatedAt',
  },
];

/**
 * Header component for the agents section containing title, search, sorting controls, and create button
 */
export function AgentsHeader({
  sortCriteria,
  sortOrder,
  onSortCriteriaChange,
  onSortOrderToggle,
  onSearch,
  onCreateAgentClick,
  isReadOnlyAccess,
}: AgentsHeaderProps) {
  return (
    <div className="flex justify-between flex-wrap flex-col sm:flex-row sm:items-center gap-4">
      <Suspense
        fallback={
          <div className="w-20 h-4 bg-gray-200 rounded-full dark:bg-gray-700 animate-pulse" />
        }
      >
        <h2 className="capitalize text-lg">Agents</h2>
      </Suspense>

      <div className="w-max flex justify-between gap-2 flex-wrap flex-col sm:flex-row sm:flex-nowrap">
        <div className="flex items-center">
          <Select onValueChange={onSortCriteriaChange} value={sortCriteria}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Select sort criteria" />
            </SelectTrigger>
            <SelectContent>
              {SORT_FIELDS.map((s: SortOption) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button onClick={onSortOrderToggle} className="mx-2" aria-label="Sort agents">
            {sortOrder === 'asc' ? (
              <AscendingIcon className="text-[#616161]" />
            ) : (
              <DescendingIcon className="text-[#616161]" />
            )}
          </button>
        </div>
        <HeaderSearch
          BtnComponent={
            <CustomButton
              handleClick={onCreateAgentClick}
              label="Create Agent"
              addIcon
              dataAttributes={{
                'data-test': 'create-agent-button',
                'data-qa': 'create-agent-button',
              }}
            />
          }
          handleChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
          handleClick={onCreateAgentClick}
          label="Create Agent"
          addIcon
          search
          placeholder="Search Agents"
          isReadOnlyAccess={isReadOnlyAccess}
        />
      </div>
    </div>
  );
}
