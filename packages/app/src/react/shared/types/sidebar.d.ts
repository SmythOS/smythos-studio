interface ISidebarMenuItemProps {
  title: string;
  path: string;
  isActive?: boolean;
  icon: any;
  isCollapsed?: boolean;
  hardReload?: boolean;
}

interface IBottomMenuItemProps extends ISidebarMenuItemProps {
  isExternal: boolean;
}

interface ITeamSpace {
  name: string;
  id: string;
  url: string;
}

interface ISecondaryMenuProps {
  isCollapsed: boolean;
  title: string;
  menuItems: ITeamSpace[];
}
