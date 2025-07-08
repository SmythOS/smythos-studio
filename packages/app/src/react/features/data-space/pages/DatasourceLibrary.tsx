import AddDatasourceDialog from '@react/features/data-space/dialogs/addDatasource';
import HeaderSearch from '@react/shared/components/headerSearch';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useScreenSize } from '@react/shared/hooks/useScreenSize';
import DatasourceTable from '@src/react/features/data-space/components/datasourceTable';
import { Breadcrumb } from 'flowbite-react';
import { ChangeEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiHome } from 'react-icons/hi';
import { Link, useParams } from 'react-router-dom';

export default function DatasourceLibrary() {
  const param = useParams();
  const namespaceName = param?.dataspace;

  const [isCreateDSDialogOpen, setIsDSDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isSmallScreen } = useScreenSize();

  const { hasReadOnlyPageAccess } = useAuthCtx();
  const isReadOnlyAccess = hasReadOnlyPageAccess('/data');

  const breadcrumb = (
    <Breadcrumb aria-label="Breadcrumb" className="mb-2 sm:mb-0">
      <Breadcrumb.Item icon={HiHome}>
        <Link to="/agents">Home</Link>
      </Breadcrumb.Item>
      <Breadcrumb.Item>
        <Link to={`/data`}>Data Spaces</Link>
      </Breadcrumb.Item>
      <Breadcrumb.Item>{namespaceName}</Breadcrumb.Item>
    </Breadcrumb>
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className={`w-full h-full ${isSmallScreen ? 'small-screen-sidebar-margin' : ''}`}>
      <div className="flex justify-between flex-col md:flex-row items-start md:items-center mb-4">
        {breadcrumb}
        <div className="w-full md:w-auto mt-4 md:mt-0">
          <HeaderSearch
            handleClick={() => setIsDSDialogOpen(true)}
            label="Add Source"
            addIcon
            search
            placeholder="Search"
            isReadOnlyAccess={isReadOnlyAccess}
            handleChange={handleSearchChange}
          />
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <div className="w-full overflow-x-auto rounded-lg">
          <DatasourceTable namespaceName={namespaceName} searchQuery={searchQuery} />
        </div>
      </div>

      {isCreateDSDialogOpen &&
        createPortal(
          <AddDatasourceDialog
            namespaceName={namespaceName}
            onClose={() => setIsDSDialogOpen(false)}
          />,
          document.getElementById('root') as HTMLElement,
        )}
    </div>
  );
}
