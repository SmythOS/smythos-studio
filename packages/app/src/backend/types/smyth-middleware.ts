import { CombinedAclRules } from '../../shared/constants/acl.constant';
import { PlanProperties, SubscriptionProperties } from '../../react/shared/types/subscription';

export interface Team {
  id: string;
  name: string;
  subscription: {
    id: number;
    status: string;
    properties: SubscriptionProperties;
    plan: {
      id: number;
      name: string;
      price: number;
      stripeId: string;
      properties: PlanProperties; //!!
    };
  };
  userId: number;
}

export interface TeamUserRole {
  sharedTeamRole: {
    id: number;
    name: string;
    canManageTeam: boolean;
    acl?: CombinedAclRules | null;
    isOwnerRole: boolean;
  };
  isTeamInitiator: boolean;
  roleId: number;
  userSpecificAcl: CombinedAclRules;

  userId: number;
}
