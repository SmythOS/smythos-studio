export type AclAccessSymbols = 'r' | 'rw' | 'w';

export enum DefaultRole {
  View = 'view',
  Edit = 'edit',
  Admin = 'admin',
}

export interface AclRule {
  access: AclAccessSymbols | string;
  name?: string;
  internal?: boolean;
  redirect?: string;
}

export interface CombinedAclRules {
  default_role?: DefaultRole;
  page: { [key: string]: AclRule };
  api: { [key: string]: AclRule };
}
