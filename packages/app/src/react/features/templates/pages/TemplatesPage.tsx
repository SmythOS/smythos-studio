import { debounce } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import TemplateCard from '@src/react/features/templates/components/templateCard';
import {
  SORT_FIELDS_TEMPLATES,
  TEMPLATE_REQUEST_FORM,
} from '@src/react/features/templates/constants';
import { categories } from '@src/react/features/templates/data/templates.json';
import HeaderSearch from '@src/react/shared/components/headerSearch';
import {
  AscendingIcon,
  AvatarIcon,
  DescendingIcon,
  FileIcon,
} from '@src/react/shared/components/svgs';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { navigateTo } from '@src/react/shared/utils/general';

const CategoryPill = ({ category, handleCategoryClick, isActive }) => {
  return (
    <button
      onClick={() => handleCategoryClick(category.toLowerCase())}
      className={`px-4 py-1 capitalize rounded-full dark:border-gray-600 text-gray-900 dark:text-white text-sm bg-gray-200 hover:bg-v2-blue hover:text-white font-medium font-sans transition-colors duration-100 ${
        isActive ? 'bg-v2-blue text-white' : ''
      }`}
    >
      {category}
    </button>
  );
};

const TemplatesPage = () => {
  const [agentTemplates, setAgentTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortCriteria, setSortCriteria] = useState<string>(
    SORT_FIELDS_TEMPLATES.find((s) => s.isDefault)?.value ?? 'name',
  );
  const [sortOrder, setSortOrder] = useState('asc');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingAfterAction, setIsLoadingAfterAction] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const endOfPageRef = useRef(null);
  const { hasReadOnlyPageAccess } = useAuthCtx();
  const isReadOnlyAccess = hasReadOnlyPageAccess('/templates');
  const toggleSortOrder = () => setSortOrder((sortOrder) => (sortOrder === 'asc' ? 'desc' : 'asc'));

  useEffect(() => {
    setIsLoadingAfterAction(true);
    fetch('/api/page/templates/agent-templates')
      .then((response) => response.json())
      .then(({ data }) => {
        setAgentTemplates(data);
      })
      .catch((error) => {
        console.error(`Error fetching templates: ${error}`);
      })
      .finally(() => {
        setIsInitialLoading(false);
        setIsLoadingMore(false);
        setIsLoadingAfterAction(false);
      });
  }, []);

  const handleSearch = useCallback(debounce(setSearchQuery, 200), []);

  const handleCreateTemplateClick = () => navigateTo(TEMPLATE_REQUEST_FORM, false, '_blank');

  const sortedAndFilteredTemplates = useMemo(() => {
    // Converting agentTemplates object of objects into an array of [key, value] pairs for processing
    const templatesArray = Object.entries(agentTemplates).map(([key, value]) => ({
      ...value,
      file: key,
    }));

    // First apply filters
    let filtered = templatesArray;
    if (activeCategory !== 'All') {
      filtered = filtered.filter(
        (item) => item.category?.toLowerCase() === activeCategory.toLowerCase(),
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query),
      );
    }

    // Then apply sorting
    return filtered.sort((a, b) => {
      const aValue = a[sortCriteria];
      const bValue = b[sortCriteria];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return 0;
    });
  }, [agentTemplates, searchQuery, sortCriteria, sortOrder, activeCategory]);

  const renderSkeletonLoading = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <div
          role="status"
          key={`${_}${index}`}
          className="w-full p-4 border border-gray-200 rounded shadow animate-pulse md:p-6 dark:border-gray-700"
        >
          <div className="flex items-center justify-center h-12 mb-4 bg-gray-300 rounded dark:bg-gray-700">
            <FileIcon />
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-48 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
          <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 mb-2.5"></div>
          <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>
          <div className="flex items-center mt-4 space-x-3">
            <AvatarIcon />
            <div>
              <div className="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2"></div>
              <div className="w-48 h-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>
            </div>
          </div>
          <span className="sr-only">Loading...</span>
        </div>
      ));
  };

  const handleCategoryClick = (category: string) => setActiveCategory(category);

  const renderTemplateCategories = () => {
    return (
      <div className="flex flex-wrap gap-2 w-full justify-center sm:justify-start">
        {categories.map((category) => (
          <CategoryPill
            key={category}
            category={category}
            handleCategoryClick={() => handleCategoryClick(category)}
            isActive={activeCategory.toLowerCase() === category.toLowerCase()}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <main className="pl-12 md:pl-0">
        <div className="flex mb-4 justify-between flex-wrap gap-4 sm:items-center">
          <div className="w-full sm:w-auto self-center flex justify-center sm:justify-start">
            {renderTemplateCategories()}
          </div>
          <div className="w-full sm:w-max flex justify-between gap-2 flex-col sm:flex-row sm:flex-nowrap">
            <div className="flex items-center">
              <select
                id="sorting"
                onChange={(e) => setSortCriteria(e.target.value)}
                value={sortCriteria}
                className="bg-gray-50 w-36 border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block px-4 py-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              >
                {SORT_FIELDS_TEMPLATES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.title}
                  </option>
                ))}
              </select>

              <button onClick={toggleSortOrder} className="mx-2" aria-label="Sort agents">
                {sortOrder === 'asc' ? <AscendingIcon /> : <DescendingIcon />}
              </button>
            </div>
            <HeaderSearch
              handleChange={(e) => handleSearch(e.target.value)}
              handleClick={() => handleCreateTemplateClick()}
              label="Request a Template"
              addIcon={false}
              search
              placeholder="Search Templates"
              isReadOnlyAccess={isReadOnlyAccess}
              btnAttributes={{ 'data-test': 'add-template-button' }}
            />
          </div>
        </div>

        <div className="py-5 mx-auto">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 min-[1900px]:grid-cols-5 ">
            {isInitialLoading || isLoadingAfterAction ? (
              renderSkeletonLoading()
            ) : sortedAndFilteredTemplates?.length === 0 ? (
              <div className="py-5 mx-auto w-11/12">
                <p className="secondary-grey mt-15">No templates available.</p>
              </div>
            ) : (
              <>
                {sortedAndFilteredTemplates &&
                  sortedAndFilteredTemplates.map((template, index) => (
                    <TemplateCard data={template} key={template.name + index} type="template" />
                  ))}
                {isLoadingMore && renderSkeletonLoading()}
              </>
            )}
          </div>
          <div ref={endOfPageRef}></div>
        </div>
      </main>
    </div>
  );
};

export default TemplatesPage;
