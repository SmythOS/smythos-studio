import { ChangeEvent, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { domainAPI } from '@react/features/domains-space/clients';
import { AddDomain, DomainsTable } from '@react/features/domains-space/components';
import HeaderSearch from '@react/shared/components/headerSearch';
import TableRowSkeleton from '@react/shared/components/ui/table/table.row.skeleton';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useQuery } from '@tanstack/react-query';

const DomainsPage = () => {
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainData, setDomainData] = useState([]);

  const { isLoading: loading } = useQuery({
    queryKey: ['domains'],
    queryFn: domainAPI.getDomains,
    onSuccess: (data) => setDomainData(data),
  });

  const { hasReadOnlyPageAccess } = useAuthCtx();

  const isReadOnlyAccess = hasReadOnlyPageAccess('/domains');

  // Filter domains based on search query
  const filteredDomains = useMemo(() => {
    if (!searchQuery) return domainData;
    return domainData.filter((domain: any) =>
      domain.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [domainData, searchQuery]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value);

  const renderSkeletonLoading = () => {
    return Array.from({ length: 3 }).map((_, index) => (
      <TableRowSkeleton key={`skeleton-row-${index}`} className="py-5 my-3" />
    ));
  };

  return (
    <div className="pl-12 md:pl-0">
      <div className="flex mb-6 flex-wrap flex-col md:flex-row md:flex-nowrap items-center w-full justify-between md:justify-end">
        <HeaderSearch
          leftComponent={
            <div className="verfication flex items-center">
              <img src="/img/domain.icons/check-badge.svg" alt="" />
              <span className="pl-1 min-w-[200px]">VERIFIED SUBDOMAINS</span>
            </div>
          }
          handleClick={() => setOpenAddDialog(true)}
          label="Add Subdomain"
          addIcon
          search
          placeholder="Search Subdomain"
          isReadOnlyAccess={isReadOnlyAccess}
          btnAttributes={{ 'data-test': 'add-subdomain-button' }}
          handleChange={handleSearchChange}
        />
      </div>
      {loading ? (
        <div className="py-3">{renderSkeletonLoading()}</div>
      ) : filteredDomains.length === 0 ? (
        <div className="text-center text-xl font-bold py-6 md:py-12">
          {searchQuery
            ? 'No matching subdomains found.'
            : 'Click Add Subdomain to register new subdomain.'}
        </div>
      ) : (
        <div className="pb-6 overflow-hidden rounded-lg">
          <DomainsTable dataArray={filteredDomains} setDomainData={setDomainData} />
        </div>
      )}
      {openAddDialog &&
        createPortal(
          <AddDomain onClose={() => setOpenAddDialog(false)} setDomainData={setDomainData} />,
          document.body,
        )}
    </div>
  );
};

export default DomainsPage;
