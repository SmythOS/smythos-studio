import { ChangeEvent, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { domainAPI } from '@react/features/domains-space/clients';
import { AddDomain, DomainsTable } from '@react/features/domains-space/components';
import HeaderSearch from '@react/shared/components/headerSearch';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import TableRowSkeleton from '@react/shared/components/ui/table/table.row.skeleton';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
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
          isButtonHidden={domainData?.length === 0}
        />
      </div>
      {loading ? (
        <div className="py-3">{renderSkeletonLoading()}</div>
      ) : filteredDomains.length === 0 ? (
        searchQuery ? (
          <div className="text-center text-xl font-bold py-6 md:py-12">
            No matching subdomains found.
          </div>
        ) : (
          <div className="flex justify-center items-start py-16 pl-12 md:pl-0">
            <div className="max-w-md w-full mx-auto flex flex-col items-center p-4 text-center">
              <h4 className="text-2xl font-medium text-black text-center ml-2 mb-2">
                Add your subdomain
              </h4>
              <p className="mb-8">
                Use subdomains to host your agents on custom, branded URLs. SmythOS supports custom
                subdomain verification through DNS and lets you connect verified domains directly
                during deployment.
              </p>
              <div className="flex justify-between items-center gap-4 mt-2 w-full">
                <CustomButton
                  handleClick={() => {
                    window.open(
                      `${SMYTHOS_DOCS_URL}/agent-deployments/subdomains/`,
                      '_blank',
                      'noopener,noreferrer',
                    );
                  }}
                  className="flex-1"
                  label={'Learn more'}
                  variant="secondary"
                />
                <CustomButton
                  handleClick={() => setOpenAddDialog(true)}
                  addIcon={true}
                  label={'Add Subdomain'}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )
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
