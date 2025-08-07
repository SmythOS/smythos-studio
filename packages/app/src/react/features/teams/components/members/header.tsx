import { ChangeEvent, Dispatch, FC, SetStateAction, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { PendingInvite } from '@react/features/teams/hooks';
import HeaderSearch from '@react/shared/components/headerSearch';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { Tabs, TabsList, TabsTrigger } from '@react/shared/components/ui/tabs';
import { useAuthCtx } from '@react/shared/contexts/auth.context';

interface TeamMembersHeaderProps {
  tab: string;
  isReadOnlyAccess: boolean;
  localPendingInvites: PendingInvite[];
  setTab: Dispatch<SetStateAction<string>>;
  setMembersSearchTerm: Dispatch<SetStateAction<string>>;
  setInvitesSearchTerm: Dispatch<SetStateAction<string>>;
  handleAddMemberClick: () => void;
}

export const TeamMembersHeader: FC<TeamMembersHeaderProps> = ({
  tab,
  isReadOnlyAccess,
  localPendingInvites,
  setTab,
  setMembersSearchTerm,
  setInvitesSearchTerm,
  handleAddMemberClick,
}) => {
  // Get page access permissions for team roles management
  const { getPageAccess } = useAuthCtx();
  const canViewTeamRoles = getPageAccess('/teams/roles')?.read;

  /**
   * Handles search input changes based on current tab
   * @param e - Change event from search input
   */
  const handleSearch = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (tab === 'members') {
        setMembersSearchTerm(value);
      } else {
        setInvitesSearchTerm(value);
      }
    },
    [tab, setMembersSearchTerm, setInvitesSearchTerm],
  );

  /**
   * Handles tab switching and clears search terms
   * @param newTab - The new tab to switch to
   */
  const handleTabChange = useCallback(
    (newTab: string) => {
      setTab(newTab);
      // Clear search terms when switching tabs
      setMembersSearchTerm('');
      setInvitesSearchTerm('');
    },
    [setTab, setMembersSearchTerm, setInvitesSearchTerm],
  );

  return (
    <div className="flex mb-4 justify-between flex-wrap flex-col sm:flex-row md:flex-nowrap sm:items-center gap-2.5">
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="mr-4 mb-0">
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="invites">Pending Invites({localPendingInvites.length})</TabsTrigger>
        </TabsList>
      </Tabs>
      <HeaderSearch
        key={`${tab}-search`}
        handleChange={handleSearch}
        handleClick={handleAddMemberClick}
        label="Invite Member"
        addIcon
        search
        placeholder={tab === 'members' ? 'Search Members' : 'Search Invites'}
        isReadOnlyAccess={isReadOnlyAccess}
      />
      {/* Only show Manage Roles button if user has permission to view team roles */}
      {canViewTeamRoles && (
        <Link to="/teams/roles" className="min-w-fit">
          <Button variant="secondary">Manage Roles</Button>
        </Link>
      )}
    </div>
  );
};
