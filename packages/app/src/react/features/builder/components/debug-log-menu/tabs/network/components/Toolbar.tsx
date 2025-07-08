import { FC, useState } from 'react';
import { FaRegCopy } from 'react-icons/fa6';
import { HiOutlineDownload } from 'react-icons/hi';
import { IoMdTrash } from 'react-icons/io';
import { IoStopCircle } from 'react-icons/io5';
import { MdFilterList, MdSearch } from 'react-icons/md';

interface ToolbarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
  isRecording: boolean;
  toggleRecording: () => void;
  filters: {
    componentNames: string[];
    selectedComponentNames: string[];
  };
  updateFilters: (selectedNames: string[]) => void;
}

/**
 * Filter dropdown component
 */
interface FilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    componentNames: string[];
    selectedComponentNames: string[];
  };
  updateFilters: (selectedNames: string[]) => void;
}

const FilterDropdown: FC<FilterDropdownProps> = ({ isOpen, onClose, filters, updateFilters }) => {
  const [localSelected, setLocalSelected] = useState<string[]>(filters.selectedComponentNames);

  if (!isOpen) return null;

  const handleToggleAll = (select: boolean) => {
    setLocalSelected(select ? [...filters.componentNames] : []);
  };

  const handleToggleItem = (name: string) => {
    setLocalSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const handleApply = () => {
    updateFilters(localSelected);
    onClose();
  };

  return (
    <div className="absolute top-full right-0 mt-1 bg-white shadow-lg rounded-md border border-solid border-gray-200 z-50 w-80 animate-fadeIn">
      <div className="p-2 border-b border-solid border-gray-200 flex justify-between items-center">
        <span className="font-medium text-sm">Filter by Component</span>
        <div className="flex gap-2">
          <button
            className="text-xs text-blue-500 hover:underline"
            onClick={() => handleToggleAll(true)}
          >
            Select All
          </button>
          <button
            className="text-xs text-blue-500 hover:underline"
            onClick={() => handleToggleAll(false)}
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto p-2">
        {filters.componentNames.length === 0 ? (
          <div className="text-sm text-gray-500 p-2">No components found</div>
        ) : (
          filters.componentNames.map((name) => (
            <div key={name} className="flex items-center py-1">
              <input
                type="checkbox"
                id={`filter-${name}`}
                checked={localSelected.includes(name)}
                onChange={() => handleToggleItem(name)}
                className="mr-2"
              />
              <label htmlFor={`filter-${name}`} className="text-sm truncate cursor-pointer">
                {name}
              </label>
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-gray-200 flex justify-end">
        <button
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          onClick={handleApply}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

/**
 * Toolbar for the network tab
 */
export const Toolbar: FC<ToolbarProps> = ({
  searchTerm,
  setSearchTerm,
  onCopy,
  onDownload,
  onClear,
  isRecording,
  toggleRecording,
  filters,
  updateFilters,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Calculate how many filters are active
  const activeFilterCount = filters.componentNames.length - filters.selectedComponentNames.length;

  return (
    <div className="flex items-center justify-between p-2 border-b border-solid border-gray-200">
      <div className="flex items-center gap-2 flex-1">
        <div className="relative flex-1 max-w-md">
          <MdSearch
            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Filter requests..."
            className="pl-8 pr-4 py-1 w-full text-sm border border-solid border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <button
            className={`p-1 ${
              activeFilterCount > 0 ? 'text-blue-500' : 'text-gray-500'
            } hover:text-gray-700 hover:bg-gray-100 rounded flex items-center`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            title="Filter components"
          >
            <MdFilterList size={18} />
            {activeFilterCount > 0 && (
              <span className="ml-1 text-xs bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <FilterDropdown
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            filters={filters}
            updateFilters={updateFilters}
          />
        </div>
        <button
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          title={isRecording ? 'Stop recording' : 'Start recording'}
          onClick={toggleRecording}
        >
          <IoStopCircle size={18} color={isRecording ? 'red' : 'gray'} />
        </button>
      </div>

      <div className="flex gap-1">
        <button
          onClick={onCopy}
          title="Copy"
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
        >
          <FaRegCopy size={14} />
        </button>
        <button
          onClick={onDownload}
          title="Download"
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
        >
          <HiOutlineDownload size={15} />
        </button>
        <button
          onClick={onClear}
          title="Clear"
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
        >
          <IoMdTrash size={15} />
        </button>
      </div>
    </div>
  );
};
