/**
 * Shared Types for Credentials
 *
 * Common type definitions used across frontend and backend for credentials management.
 *
 * @module
 */

/**
 * Credential Connection
 * Represents a stored credential (OAuth, vector DB, etc.)
 */
export interface CredentialConnection {
  /** Unique identifier for the credential */
  id: string;

  /** Display name for the credential */
  name: string;

  /** Provider ID (e.g., 'google', 'pinecone') */
  provider: string;

  /** Credential fields (sanitized in GET requests) */
  credentials: Record<string, any>;

  /** Group category (e.g., 'oauth_connections_creds', 'vector_db_creds') */
  group: string;

  /** ISO timestamp when credential was created */
  createdAt: string;

  /** ISO timestamp when credential was last updated */
  updatedAt: string;

  /** Whether the credential is read-only */
  isReadOnly?: boolean;

  /** Whether this is an internal managed credential */
  isManaged?: boolean;

  /** Whether the credential is currently authenticated/active */
  isActive?: boolean;
}

/**
 * Input for creating a new credential
 */
export interface CreateCredentialInput {
  /** Group category */
  group: string;

  /** Display name */
  name: string;

  /** Provider ID */
  provider: string;

  /** Credential fields with value and sensitivity flag */
  credentials: Record<string, { value: string; sensitive: boolean }>;
}

/**
 * Input for updating an existing credential
 */
export interface UpdateCredentialInput {
  /** Display name */
  name?: string;

  /** Provider ID */
  provider?: string;

  /** Credential fields with value and sensitivity flag */
  credentials?: Record<string, { value: string; sensitive: boolean }>;

  /** Extra data to be stored in the credential */
  customProperties?: Record<string, any>;
}

/**
 * Input for deleting a credential
 */
export interface DeleteCredentialInput {
  /** Credential ID */
  id: string;

  /** Group category */
  group: string;

  /** Whether user has consented to warnings */
  consentedWarnings?: boolean;
}

/**
 * Result of credential deletion
 */
export interface DeleteCredentialResult {
  /** Whether deletion was successful */
  success: boolean;

  /** Success/error message */
  message?: string;

  /** Warnings that require user confirmation */
  warnings?: string[];
}

/**
 * API Response wrapper for credentials
 */
export interface CredentialsApiResponse<T = any> {
  /** Whether the request was successful */
  success: boolean;

  /** Response data */
  data?: T;

  /** Error message if unsuccessful */
  error?: string;

  /** Optional message */
  message?: string;

  /** Warnings that require user attention */
  warnings?: string[];
}
