import axios from 'axios';
import express from 'express';
import { pipeline } from 'stream';
import { promisify } from 'util';

import config from '../../config';

import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { includeTeamDetails } from '../../middlewares/auth.mw';
const router = express.Router();
const pipelineAsync = promisify(pipeline);

router.get('/debugSession/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const url = `${config.env.API_SERVER}/agent/${id}/debugSession`;

    //x-hash-id is configured in smyth load balancer to use user IP by default or custom value if provided
    //here we force it to use the real client IP in order to keep debug sessions consistent
    const client_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const headers = {
      'x-hash-id': client_ip,
      'x-smyth-debug': 'true',
    };
    const result: any = await axios.get(url, { headers });

    const dbgSession = result.data?.dbgSession;

    res.send({ dbgSession });
  } catch (e) {
    res
      .status(e?.response?.status || 400)
      .send({ error: e?.response?.data || 'Cannot get debug session info' });
  }
});

router.post(`/api`, async (req, res) => {
  try {
    const { includeNewState } = req.query;
    const url = `${config.env.API_SERVER}/api/${includeNewState ? '?includeNewState=true' : ''}`;

    //x-hash-id is configured in smyth load balancer to use user IP by default or custom value if provided
    //here we force it to use the real client IP in order to keep debug sessions consistent
    //TODO : set trust proxy to true in production and use req.ip instead of req.headers['x-forwarded-for']
    const client_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const headers = {
      'x-hash-id': client_ip,
      'x-smyth-debug': 'true',
    };

    for (let header in req.headers) {
      if (header.startsWith('x-')) {
        headers[header] = req.headers[header];
      }
    }
    const result: any = await axios.post(url, req.body, { headers });

    res.send(result.data);
  } catch (e) {
    res
      .status(e?.response?.status || 400)
      .send({ error: e?.response?.data || 'Cannot run debug action' });
  }
});

/**
 * Creates proxy options specifically configured for SSE connections
 * @param {string} targetUrl - The target URL to proxy to
 * @returns {Object} Proxy middleware options
 */
const createSSEProxyOptions: (targetUrl: string) => Options = (targetUrl: string) => ({
  target: targetUrl,
  changeOrigin: true,
  ws: false,
  pathRewrite: (path: string) => {
    const newPath = path.split('/sse')[1];
    return newPath;
  },
  logLevel: 'silent',

  // Configure proxy headers
  onProxyReq: (proxyReq: any, req: any, res: any) => {
    const hashId = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    proxyReq.setHeader('x-hash-id', hashId);
    proxyReq.setHeader('x-smyth-debug', 'true');
    proxyReq.setHeader('Accept', 'text/event-stream');
    proxyReq.setHeader('Connection', 'keep-alive');
    proxyReq.setHeader('Cache-Control', 'no-cache');

    proxyReq.removeHeader('Accept-Encoding');
  },

  // Handle proxy response
  onProxyRes: (proxyRes: any, req: any, res: any) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    res.flushHeaders();

    let messageCount = 0;
    let buffer = '';

    proxyRes.on('data', (chunk: Buffer) => {
      // Append the new chunk to our buffer
      buffer += chunk.toString();

      // Process any complete messages in the buffer
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || ''; // Keep the incomplete message in the buffer

      // Forward complete messages
      for (const message of messages) {
        if (message.trim()) {
          messageCount++;
          // Ensure proper SSE format with double newlines
          res.write(`${message}\n\n`);
          res.flush(); // Force flush after each message
        }
      }
    });

    proxyRes.on('end', () => {
      // Send any remaining buffered data
      if (buffer.trim()) {
        res.write(`${buffer}\n\n`);
      }
      res.end();
    });

    proxyRes.on('error', (error: Error) => {});

    // Monitor client disconnection
    req.on('close', () => {});
  },

  // Error handling
  onError: (err: Error, req: any, res: any) => {
    // console.error('SSE Proxy Error:', err);

    if (!res.headersSent) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
    }

    const errorMessage = `event: error\ndata: ${JSON.stringify({
      message: 'Proxy connection error',
      details: err.message,
    })}\n\n`;
    // console.log('Sending error message:', errorMessage);
    res.write(errorMessage);
  },

  // Additional options
  timeout: 0,
  proxyTimeout: 0,
  selfHandleResponse: true,
});

// Replace the existing SSE proxy route with the new implementation
router.use('/sse', createProxyMiddleware(createSSEProxyOptions(config.env.API_SERVER)));

// TODO: should be moved to any SRE server
//! FIX: but this will not work with self-hosted env since SRE is not guranteed to store in S3 and so this
//! needs to be reloacted to the debugger server

router.get('/file-proxy', includeTeamDetails, async (req, res) => {
  const { url } = req.query as { url: string };

  const smythURI = URIParser(url);
  if (!smythURI) {
    return res.status(400).send('Invalid Resource URI');
  }

  const teamId = req._team?.id;

  if (teamId !== smythURI.team) {
    return res.status(403).send('Forbidden');
  }

  try {
    // Validate the smythfs URL
    if (!url.startsWith('smythfs://')) {
      return res.status(400).send('Invalid URL format');
    }

    // Construct the debugger server URL for file streaming
    // The debugger server will extract agent ID from the URL path
    const debuggerUrl = new URL(`${config.env.API_SERVER}/user/smythfs/stream`);
    debuggerUrl.searchParams.set('url', url);

    // Forward the range header if present
    const headers: Record<string, string | boolean> = {
      'x-smyth-debug': true,
    };
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    // Make request to debugger server
    if (req.user?.accessToken) {
      headers['Authorization'] = `Bearer ${req.user.accessToken}`;
    }

    const response = await axios.get(debuggerUrl.toString(), {
      headers,
      responseType: 'stream', // Stream the response
      validateStatus: (status: number) => status < 500, // Treat 4xx as successful so we can forward them to client; only throw on 5xx server errors
    });

    // Forward status code and headers from debugger server
    res.status(response.status);

    // Forward relevant headers
    const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges'];

    for (const header of headersToForward) {
      const value = response.headers[header];
      if (value) {
        res.setHeader(header, value);
      }
    }

    // Handle client disconnect
    res.on('close', () => {
      if (response.data && typeof response.data.destroy === 'function') {
        response.data.destroy();
      }
    });

    // Stream the file from debugger server to client
    await pipelineAsync(response.data, res);
  } catch (error: any) {
    console.error('Error proxying file from debugger server:', error?.message);
    if (!res.headersSent) {
      const status = error.response?.status || 500;
      const message = error.response?.data || 'Error reading file';
      res.status(status).send(message);
    }
  }
});

function URIParser(uri: string) {
  const parts = uri.split('://');
  if (parts.length !== 2) return undefined;
  if (parts[0].toLowerCase() !== 'smythfs') return undefined;
  const parsed = new URL(`http://${parts[1]}`);
  const tld = parsed.hostname.split('.').pop();
  if (tld !== 'team') throw new Error('Invalid Resource URI');
  const team = parsed.hostname.replace(`.${tld}`, '');
  //TODO: check if team exists

  return {
    hash: parsed.hash,
    team,
    path: parsed.pathname,
  };
}

/**
 * Get content type based on file extension
 */
function getContentType(extension?: string): string {
  const contentTypes: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Others
    txt: 'text/plain',
    json: 'application/json',
    csv: 'text/csv',
  };

  return contentTypes[extension || ''] || 'application/octet-stream';
}

export default router;
