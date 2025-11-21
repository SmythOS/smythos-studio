import { CredentialDependency, type IDependencyResult } from './CredentialDependency';
import { NamespacesDependency } from './NamespacesDependency';

// Re-export for convenience
export { CredentialDependency, IDependencyResult };

export class CredentialDependenciesChecker {
  private dependencies: CredentialDependency[] = [];

  constructor(
    private readonly req: any,
    private readonly credentialId: string,
    private readonly credentialGroup: string,
  ) {
    this.dependencies = [this.initIfMatch(NamespacesDependency)].filter(Boolean);
  }

  async checkDependencies(): Promise<IDependencyResult> {
    const result: IDependencyResult = {
      errors: [],
      warnings: [],
    };

    for (const dependency of this.dependencies) {
      const dependencyResult = await dependency.checkDependency();
      result.errors.push(...dependencyResult.errors);
      result.warnings.push(...dependencyResult.warnings);
    }

    return result;
  }

  private initIfMatch(
    DependencyClass: new (req: any, credentialId: string) => CredentialDependency,
  ): CredentialDependency | null {
    const instance = new DependencyClass(this.req, this.credentialId);
    if (instance.isGroupMatch(this.credentialGroup)) {
      return instance;
    }
    return null;
  }
}
