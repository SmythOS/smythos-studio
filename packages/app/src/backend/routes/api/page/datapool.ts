/**
 * Data Pool API Routes
 *
 * Proxies requests to API_SERVER/user/datapools/*
 */

import axios, { AxiosError } from 'axios';
import express from 'express';
import FormData from 'form-data';
import multer from 'multer';
import config from '../../../config';

const router = express.Router();

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

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
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    res.status(500).json(axiosError?.response?.data);
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
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    res.status(500).json(axiosError?.response?.data);
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
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    res.status(500).json(axiosError?.response?.data);
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
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    res.status(500).json(axiosError?.response?.data);
  }
});

/**
 * List all datasources for a namespace
 * GET /api/page/datapool/namespaces/:namespaceLabel/datasources
 */
router.get('/namespaces/:namespaceLabel/datasources', async (req, res) => {
  try {
    const { namespaceLabel } = req.params;
    const url = `${config.env.API_SERVER}/user/data-pools/namespaces/${encodeURIComponent(namespaceLabel)}/datasources`;

    const result = await axios.get(url, {
      headers: getAuthHeaders(req),
    });

    return res.json(result.data);
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    res.status(500).json(axiosError?.response?.data);
  }
});

/**
 * Create a new datasource
 * POST /api/page/datapool/namespaces/:namespaceLabel/datasources
 */
router.post('/namespaces/:namespaceLabel/datasources', upload.single('file'), async (req, res) => {
  try {
    const { namespaceLabel } = req.params;
    const url = `${config.env.API_SERVER}/user/data-pools/namespaces/${encodeURIComponent(namespaceLabel)}/datasources`;

    // Create FormData to forward the file
    const formData = new FormData();
    formData.append('datasourceLabel', req.body.datasourceLabel);

    // Add optional chunking parameters
    if (req.body.chunkSize) {
      formData.append('chunkSize', req.body.chunkSize);
    }
    if (req.body.chunkOverlap) {
      formData.append('chunkOverlap', req.body.chunkOverlap);
    }

    // Add optional metadata
    if (req.body.metadata) {
      formData.append('metadata', req.body.metadata);
    }

    if (req.file) {
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
    }

    const result = await axios.post(url, formData, {
      headers: {
        ...getAuthHeaders(req),
        ...formData.getHeaders(),
      },
    });

    return res.json(result.data);
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    res.status(500).json(axiosError?.response?.data);
  }
});

/**
 * Delete a datasource
 * DELETE /api/page/datapool/namespaces/:namespaceLabel/datasources/:datasourceId
 */
router.delete('/namespaces/:namespaceLabel/datasources/:datasourceId', async (req, res) => {
  try {
    const { namespaceLabel, datasourceId } = req.params;
    const url = `${config.env.API_SERVER}/user/data-pools/namespaces/${encodeURIComponent(namespaceLabel)}/datasources/${encodeURIComponent(datasourceId)}`;

    const result = await axios.delete(url, {
      headers: getAuthHeaders(req),
    });

    return res.json(result.data);
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    res.status(500).json(axiosError?.response?.data);
  }
});

export default router;
