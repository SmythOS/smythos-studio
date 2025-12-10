/**
 * Credentials Router
 *
 * Handles CRUD operations for team credentials (vector databases, OAuth, etc.)
 * Routes delegate business logic to CredentialsService
 */

import express, { Request, Response } from 'express';
import { includeTeamDetails } from '../../../middlewares/auth.mw';
import { CredentialsService } from './credentials.service';

export const credentialsRouter = express.Router();

/**
 * Get all credentials for a specific group
 * GET /api/credentials?group=vector_db_creds
 */
credentialsRouter.get('/', includeTeamDetails, async (req: Request, res: Response) => {
  const group = req.query.group as string;

  if (!group) {
    return res.status(400).json({
      success: false,
      error: 'Group parameter is required',
    });
  }

  try {
    const credentials = await CredentialsService.getCredentialsByGroup(group, req);

    res.json({
      success: true,
      data: credentials,
    });
  } catch (error: any) {
    console.error('Error fetching credentials:', error?.message);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: error?.response?.data?.message || error?.message || 'Failed to fetch credentials',
    });
  }
});

/**
 * Get a specific credential by ID
 * GET /api/credentials/:id?group=vector_db_creds&resolveVaultKeys=true
 */
credentialsRouter.get('/:id', includeTeamDetails, async (req: Request, res: Response) => {
  const { id } = req.params;
  const group = req.query.group as string;
  const resolveVaultKeys = req.query.resolveVaultKeys === 'true';

  if (!group) {
    return res.status(400).json({
      success: false,
      error: 'Group parameter is required',
    });
  }

  try {
    const credential = await CredentialsService.getCredentialById(id, group, req, {
      resolveVaultKeys,
    });

    res.json({
      success: true,
      data: credential,
    });
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.message === 'Credential not found') {
      return res.status(404).json({
        success: false,
        error: 'Credential not found',
      });
    }

    console.error('Error fetching credential:', error?.message);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: error?.response?.data?.message || error?.message || 'Failed to fetch credential',
    });
  }
});

/**
 * Create a new credential
 * POST /api/credentials
 * Body: { group, name, provider, credentials: { fieldName: { value, sensitive }, ... } }
 */
credentialsRouter.post('/', includeTeamDetails, async (req: Request, res: Response) => {
  const { group, name, provider, credentials } = req.body;

  // Validation
  if (!group || !name || !provider || !credentials) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: group, name, provider, credentials',
    });
  }

  try {
    const result = await CredentialsService.createCredential(
      { group, name, provider, credentials },
      req,
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Credential created successfully',
    });
  } catch (error: any) {
    console.error('Error creating credential:', error?.message);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: error?.response?.data?.message || error?.message || 'Failed to create credential',
    });
  }
});

/**
 * Update an existing credential
 * PUT /api/credentials/:id
 * Body: { group, name, provider, credentials: { fieldName: { value, sensitive }, ... } }
 */
credentialsRouter.put('/:id', includeTeamDetails, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { group, name, provider, credentials } = req.body;

  // Validation
  if (!group || !name || !provider || !credentials) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: group, name, provider, credentials',
    });
  }

  try {
    const result = await CredentialsService.updateCredential(
      id,
      group,
      { name, provider, credentials },
      req,
    );

    res.json({
      success: true,
      data: result,
      message: 'Credential updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating credential:', error?.message);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: error?.response?.data?.message || error?.message || 'Failed to update credential',
    });
  }
});

/**
 * Delete a credential
 * DELETE /api/credentials/:id?group=vector_db_creds&consentedWarnings=true
 */
credentialsRouter.delete('/:id', includeTeamDetails, async (req: Request, res: Response) => {
  const { id } = req.params;
  const group = req.query.group as string;
  const consentedWarnings = req.query.consentedWarnings === 'true';

  if (!group) {
    return res.status(400).json({
      success: false,
      error: 'Group parameter is required',
    });
  }

  try {
    const result = await CredentialsService.deleteCredential({ id, group, consentedWarnings }, req);

    // Handle warnings (requires user confirmation)
    if (!result.success && result.warnings) {
      return res.status(200).json({
        success: false,
        warnings: result.warnings,
      });
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Error deleting credential:', error?.message);
    res.status(error?.response?.status || 500).json({
      success: false,
      error: error?.message || error?.response?.data?.message || 'Failed to delete credential',
    });
  }
});
