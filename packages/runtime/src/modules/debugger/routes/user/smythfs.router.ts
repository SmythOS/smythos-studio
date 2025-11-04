import express from 'express';
import { pipeline } from 'stream';
import { promisify } from 'util';

import { AccessCandidate, BinaryInput, Logger, SmythFS } from '@smythos/sre';

const console = Logger('[Builder] Router: File');
const router = express.Router();
const pipelineAsync = promisify(pipeline);

/**
 * Extracts the agent ID from a SmythFS URL
 * Follows the exact pattern from TypeChecker.helper.ts extractSmythFsAgentId
 *
 * @param url - The SmythFS URL (e.g., smythfs://teamId.team/agentId/_temp/filename.ext)
 * @returns The agent ID or null if the URL is invalid
 */
function extractSmythFsAgentId(url: string): string | null {
  if (!url?.startsWith('smythfs://')) return null;

  try {
    // Split by '/' and get the agent ID (third segment)
    const segments = url.split('/');
    if (segments.length < 4) return null;

    return segments[3];
  } catch {
    return null;
  }
}

/**
 * Streams a file from SmythFS to the response
 * Supports range requests for partial content delivery (e.g., video streaming)
 * Follows the BinaryInput pattern from TypeChecker.helper.ts
 *
 * Endpoint: GET /smythfs/stream
 * Query Parameters:
 * - url: The smythfs:// URL to read from (e.g., smythfs://teamId.team/agentId/_temp/file.ext)
 */
router.get('/stream', async (req, res, _next) => {
  try {
    const { url } = req.query as { url: string };

    // Validate required parameters
    if (!url) {
      return res.status(400).send('Missing required parameter: url');
    }

    if (!url.startsWith('smythfs://')) {
      return res.status(400).send('Invalid URL format. Expected smythfs:// URL');
    }

    // Extract agent ID from smythfs:// URL to create an access candidate
    // Following the exact pattern from TypeChecker.helper.ts _createBinaryInput (lines 203, 210, 216)
    const agentId = extractSmythFsAgentId(url);
    if (!agentId) {
      return res.status(400).send('Invalid SmythFS URL: could not extract agent ID');
    }

    // Create access candidate for the agent
    // Following the pattern from TypeChecker.helper.ts line 216
    const candidate = AccessCandidate.agent(agentId);

    // Create BinaryInput following the TypeChecker.helper.ts pattern
    // When value is a smythfs:// URL string, pass it directly as data (line 212)
    // BinaryInput.from(data, fileName, mimetype, candidate) - line 219
    const binaryInput = BinaryInput.from(url, undefined, undefined, candidate);
    await binaryInput.ready();

    // Get metadata from BinaryInput
    const metadata = await SmythFS.Instance.getMetadata(url, candidate);
    if (!metadata) {
      return res.status(404).send('File not found');
    }

    const contentType = metadata.ContentType || 'application/octet-stream';
    const fileSize = metadata.ContentLength || 0;

    // Determine if this is a range request
    const rangeHeader = req.headers.range;

    if (rangeHeader && fileSize > 0) {
      // Handle range request
      const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).send('Requested Range Not Satisfiable');
      }

      const chunkSize = end - start + 1;

      // Set partial content headers
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');

      // Get buffer and send the requested range
      const buffer = await binaryInput.getBuffer();
      const chunk = buffer.subarray(start, end + 1);

      res.send(chunk);
    } else {
      // Handle full file request
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');

      if (fileSize > 0) {
        res.setHeader('Content-Length', fileSize);
      }

      // Stream the file using BinaryInput's getReadStream method
      const stream = await binaryInput.getReadStream();

      // Handle client disconnect
      res.on('close', () => {
        if (stream && typeof stream.destroy === 'function') {
          stream.destroy();
        }
      });

      await pipelineAsync(stream, res);
    }
  } catch (error: any) {
    console.error('Error reading file:', error?.message || error);

    if (!res.headersSent) {
      if (error.message?.includes('Access Denied')) {
        return res.status(403).send('Access denied');
      }
      return res.status(500).send(error.message || 'Internal Server Error');
    }
  }
});

export default router;
