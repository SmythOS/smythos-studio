export interface IDependencyResult {
  errors: string[];
  warnings: string[];
}

export abstract class CredentialDependency {
  constructor(
    protected readonly req: any,
    protected readonly credentialId: string,
  ) {}

  public abstract checkDependency(): Promise<IDependencyResult>;
  public abstract deleteDependencies(): Promise<void>;
  public abstract isGroupMatch(credentialGroup: string): boolean;
}
