import classNames from 'classnames';
import { AiOutlineSortAscending, AiOutlineSortDescending } from 'react-icons/ai';
import { FaPencil, FaTrashCan } from 'react-icons/fa6';

import { SpaceMember } from '@react/features/teams/pages/space-settings';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { Spinner } from '@react/shared/components/ui/spinner';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { ChangeEvent, FC, useEffect, useState } from 'react';

interface MembersProps {
  handleSearch: (event: ChangeEvent<HTMLInputElement>) => void; // eslint-disable-line no-unused-vars
  handleSortChange: (event: ChangeEvent<HTMLSelectElement>) => void; // eslint-disable-line no-unused-vars
  toggleSortDirection: () => void;
  searchTerm: string;
  sortBy: string;
  sortDirection: string;
  paginatedMembers: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  handleDeleteMember: (member: SpaceMember) => void; // eslint-disable-line no-unused-vars
  handleEditMember: (member: SpaceMember) => void; // eslint-disable-line no-unused-vars
}

const ROWS_PER_PAGE = 4;

export const Members: FC<MembersProps> = (props) => {
  const {
    sortBy,
    searchTerm,
    sortDirection,
    paginatedMembers,
    handleSearch,
    handleSortChange,
    handleEditMember,
    handleDeleteMember,
    toggleSortDirection,
  } = props;

  const [currentPage, setCurrentPage] = useState(1);
  const { userInfo, getPageAccess } = useAuthCtx();
  const [totalPages, setTotalPages] = useState(1);

  const membersAccess = getPageAccess('/teams/members');

  useEffect(() => {
    const calculatedTotalPages = Math.max(1, Math.ceil(paginatedMembers.length / ROWS_PER_PAGE));
    setTotalPages(calculatedTotalPages);
    if (currentPage > calculatedTotalPages) setCurrentPage(calculatedTotalPages);
  }, [paginatedMembers.length, searchTerm, currentPage]);

  return (
    <div
      className="w-full md:w-3/4 bg-white rounded-lg p-6 mb-4 border border-solid border-gray-200 flex flex-col"
      style={{ height: '500px' }}
    >
      <div className="flex justify-between items-center mb-4 gap-2">
        <h2 className="text-xl font-semibold">Members</h2>
        <div className="flex">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <img className="search-icon" src="/img/home.icons/search.svg" />
          </div>
          <input
            type="text"
            placeholder="Member, role access"
            className="mr-2 p-2 pl-10 border rounded-md placeholder:text-base placeholder:text-gray-500"
            onChange={handleSearch}
            value={searchTerm}
          />
          <select
            className="mr-2 p-2 px-3 border rounded-md pr-10"
            onChange={handleSortChange}
            value={sortBy}
          >
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="role">Sort by Role</option>
          </select>
          <Button handleClick={toggleSortDirection}>
            {sortDirection === 'asc' ? (
              <AiOutlineSortAscending size={20} />
            ) : (
              <AiOutlineSortDescending size={20} />
            )}
          </Button>
        </div>
      </div>
      <div className="flex-grow">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-2 px-4 w-4/12">Name</th>
              <th className="text-left py-2 px-4 w-4/12">Email</th>
              <th className="text-left py-2 px-4 w-3/12">Role</th>
              <th className="text-left py-2 px-4 w-1/12">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMembers
              .slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE)
              .map((member, index) => (
                <tr
                  key={index}
                  className={classNames(
                    'transition-all duration-300 border-b overflow-hidden h-[72px]',
                  )}
                >
                  <td className="py-2 px-4">
                    <div className="flex items-center">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name || ''}
                          className="w-8 h-8 rounded-full mr-2"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
                          {(member.name || member.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate capitalize">
                        {member.name || member.email?.split?.('@')?.[0]}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-4 truncate">{member.email}</td>
                  <td className="py-2 px-4 truncate">{member.userTeamRole.sharedTeamRole.name}</td>
                  <td className="py-2 px-4">
                    {member.email !== userInfo?.user?.email && (
                      <div className="flex items-center">
                        <button
                          className={classNames(
                            'py-2 px-1 mr-2 text-sm rounded-lg text-gray-300 hover:text-v2-blue hover:bg-gray-50',
                            {
                              hidden: !membersAccess.write || member?.userTeamRole?.isTeamInitiator,
                            },
                          )}
                          type="button"
                          onClick={() => handleDeleteMember(member)}
                        >
                          {member.isInProgress ? (
                            <Spinner classes="w-6 h-6 mr-2" />
                          ) : (
                            <FaTrashCan />
                          )}
                        </button>
                        <button
                          className={classNames(
                            'py-2 px-1 mr-2 text-sm rounded-lg text-gray-300 hover:text-v2-blue hover:bg-gray-50',
                            {
                              hidden: !membersAccess.write || member?.userTeamRole?.isTeamInitiator,
                            },
                          )}
                          type="button"
                          onClick={() => handleEditMember(member)}
                        >
                          <FaPencil />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            {Array.from({
              length:
                ROWS_PER_PAGE -
                paginatedMembers.slice(
                  (currentPage - 1) * ROWS_PER_PAGE,
                  currentPage * ROWS_PER_PAGE,
                ).length,
            }).map((_, index) => (
              <tr key={`empty-${index}`} className="h-[72px]">
                <td colSpan={4} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(paginatedMembers.length / ROWS_PER_PAGE) > 1 && (
        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-500">
            Showing {Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, paginatedMembers.length)} to{' '}
            {Math.min(currentPage * ROWS_PER_PAGE, paginatedMembers.length)} of{' '}
            {paginatedMembers.length} entries
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={classNames(
                'px-3 py-1 rounded border',
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50',
              )}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx + 1)}
                className={classNames('px-3 py-1 rounded border', {
                  'bg-v2-blue text-white': idx + 1 === currentPage,
                  'bg-white hover:bg-gray-50': idx + 1 !== currentPage,
                })}
              >
                {idx + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={classNames(
                'px-3 py-1 rounded border',
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-50',
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
