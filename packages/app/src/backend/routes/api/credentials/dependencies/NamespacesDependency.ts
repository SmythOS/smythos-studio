import config from '@src/backend/config';
import axios from 'axios';
import { CredentialDependency, IDependencyResult } from './CredentialDependency';

export class NamespacesDependency extends CredentialDependency {
  private state: IDependencyResult = {
    errors: [],
    warnings: [],
  };
  constructor(req: any, credentialId: string) {
    super(req, credentialId);
  }

  async checkDependency(): Promise<IDependencyResult> {
    // get namespaces that use this credential
    let namespaces: any[] = [];
    try {
      const url = `${config.env.API_SERVER}/user/data-pools/namespaces`;

      const res = await axios.get(url, {
        headers: await this.getAuthHeaders(this.req),
      });
      namespaces = res.data.namespaces;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to get namespaces');
    }

    const linkedNamespaces = namespaces.filter(
      (namespace: any) => namespace.credentialId === this.credentialId,
    );

    if (linkedNamespaces.length > 0) {
      this.state.warnings.push(
        `This credential is linked to ${linkedNamespaces.length} namespaces`,
      );
    }

    return this.state;
  }

  async deleteDependencies(): Promise<void> {
    throw new Error('Not implemented');
  }

  private async getAuthHeaders(req: any) {
    const headers: Record<string, string> = {};

    if (req.user?.accessToken) {
      headers['Authorization'] = `Bearer ${req.user.accessToken}`;
    }

    console.log('headers: x-smyth-team-id', req.headers['x-smyth-team-id']);
    if (req.headers['x-smyth-team-id']) {
      headers['x-smyth-team-id'] = req.headers['x-smyth-team-id'];
    }

    // Add debug header for routing through debugger server
    headers['x-smyth-debug'] = 'true';

    return headers;
  }

  isGroupMatch(credGroup: string) {
    return credGroup === 'vector_db_creds';
  }
}
