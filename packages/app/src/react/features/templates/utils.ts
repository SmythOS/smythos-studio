import { OUT_OF_BOX_TEMPLATES } from '@src/builder-ui/constants';

export const filterTemplates = (
  templatesArray,
  activeCategory = 'All',
  searchQuery = '',
  sortCriteria = 'name',
  sortOrder = 'asc',
) => {
  // Filter by category if not 'All'
  const categoryFilteredTemplates =
    activeCategory.toLowerCase() === 'all'
      ? templatesArray
      : templatesArray.filter((template) => template.category.toLowerCase() === activeCategory);

  const filteredTemplates = categoryFilteredTemplates.filter(({ name, description }) => {
    const searchFields = [name, description];
    return searchFields.some(
      (field) => field && field.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  });

  // Get non-priority templates
  const nonPriorityTemplates = filteredTemplates.filter((template) => {
    return !OUT_OF_BOX_TEMPLATES.includes(template.id);
  });

  // Sort non-priority templates
  const sortedNonPriorityTemplates = nonPriorityTemplates.sort((a, b) => {
    const aValue = a[sortCriteria];
    const bValue = b[sortCriteria];
    if (aValue === undefined || bValue === undefined) return 0;
    return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
  });

  // Find priority templates from templatesArray in OUT_OF_BOX_TEMPLATES order
  const sortedPriorityTemplates = OUT_OF_BOX_TEMPLATES.map((id) =>
    templatesArray.find((template) => template.id === id),
  ).filter(Boolean); // Remove undefined entries

  return [...sortedPriorityTemplates, ...sortedNonPriorityTemplates];
};
