export enum UserSettingsKey {
  GPTPlugins = 'GPTPlugins',
  AgentPlugins = 'AgentPlugins',
  HuggingFaceModels = 'HuggingFaceModels',
  UserMarketingMetadata = 'UserMarketingMetadata',
  UserBookAnIntroCall = 'UserBookAnIntroCall',
  UserBuildingMetadata = 'UserBuildingMetadata',
  OnboardingTasks = 'OnboardingTasks',
  HasSignedUp = 'HasSignedUp',
  UserTeam = 'userTeam',
}

export interface IUserMarketingMetadata {
  name?: string;
  firstname?: string;
  lastname?: string;
  jobtype?: string;
  jobrole?: string;
  message?: string;
  company?: string;
  introCallBooked?: boolean;
  planName?: string;
}

export interface IUserTeamData {
  name: string;
  firstname?: string;
  lastname?: string;
  jobtype: string;
  jobRoleLabel: string;
  jobRoleValue: string;
}
export interface IUserBuildingType {
  targetText: string;
}

export interface IUserBookAnIntroCall {
  introCallBooked: boolean;
  planName: string;
}
