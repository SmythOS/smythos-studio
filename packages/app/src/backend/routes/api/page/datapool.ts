/**
 * Data Pool API Routes
 *
 * Proxies requests to API_SERVER/user/datapools/*
 */

import axios from 'axios';
import express from 'express';
import config from '../../../config';

const router = express.Router();

/**
 * Get auth headers from request
 */
const getAuthHeaders = (req: any) => {
  const headers: Record<string, string> = {};

  if (req.user?.accessToken) {
    headers['Authorization'] = `Bearer ${req.user.accessToken}`;
  }

  // Add debug header for routing through debugger server
  headers['x-smyth-debug'] = 'true';

  return headers;
};

/**
 * List all namespaces with pagination
 * GET /api/page/datapool/namespaces
 */
router.get('/namespaces', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const url = `${config.env.API_SERVER}/user/data-pools/namespaces`;

    const result = await axios.get(url, {
      params: { page, limit },
      headers: getAuthHeaders(req),
    });

    return res.json(result.data);
  } catch (error) {
    console.error('Error fetching namespaces:', error?.response?.data || error.message);

    const errorData = error?.response?.data;

    if (errorData && typeof errorData === 'object') {
      return res.status(error?.response?.status || 500).json(errorData);
    }

    return res.status(error?.response?.status || 500).json({
      error: errorData || 'Failed to fetch namespaces',
    });
  }
});

/**
 * Create a new namespace
 * POST /api/page/datapool/namespaces
 */
router.post('/namespaces', async (req, res) => {
  try {
    const url = `${config.env.API_SERVER}/user/data-pools/namespaces`;

    const result = await axios.post(url, req.body, {
      headers: getAuthHeaders(req),
    });

    return res.json(result.data);
  } catch (error) {
    console.error('Error creating namespace:', error?.response?.data || error.message);

    // Forward the error response from the SRE server
    const errorData = error?.response?.data;

    // If the error data is already an object with an error property, send it as-is
    // This preserves the nested error structure: { error: { error: "message" } }
    if (errorData && typeof errorData === 'object') {
      return res.status(error?.response?.status || 500).json(errorData);
    }

    // Otherwise, wrap it in an error object
    return res.status(error?.response?.status || 500).json({
      error: errorData || 'Failed to create namespace',
    });
  }
});

/**
 * Delete a namespace
 * DELETE /api/page/datapool/namespaces/:namespaceId
 */
router.delete('/namespaces/:label', async (req, res) => {
  try {
    const { label } = req.params;
    const url = `${config.env.API_SERVER}/user/data-pools/namespaces/${label}`;

    const result = await axios.delete(url, {
      headers: getAuthHeaders(req),
    });

    return res.json(result.data);
  } catch (error) {
    console.error('Error deleting namespace:', error?.response?.data || error.message);

    const errorData = error?.response?.data;

    if (errorData && typeof errorData === 'object') {
      return res.status(error?.response?.status || 500).json(errorData);
    }

    return res.status(error?.response?.status || 500).json({
      error: errorData || 'Failed to delete namespace',
    });
  }
});

/**
 * List all available embedding models
 * GET /api/page/datapool/embeddings/models
 */
router.get('/embeddings/models', async (req, res) => {
  try {
    const url = `${config.env.API_SERVER}/user/data-pools/embeddings/models`;

    const result = await axios.get(url, {
      headers: getAuthHeaders(req),
    });

    return res.json(result.data);
  } catch (error) {
    console.error('Error fetching embedding models:', error?.response?.data || error.message);

    const errorData = error?.response?.data;

    if (errorData && typeof errorData === 'object') {
      return res.status(error?.response?.status || 500).json(errorData);
    }

    return res.status(error?.response?.status || 500).json({
      error: errorData || 'Failed to fetch embedding models',
    });
  }
});

export default router;
