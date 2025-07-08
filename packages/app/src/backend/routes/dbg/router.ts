import { pipeline, Readable } from 'stream';
import { promisify } from 'util';
import express from 'express';
import axios from 'axios';
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  GetObjectCommandInput,
} from '@aws-sdk/client-s3';

import config from '../../config';

import { includeTeamDetails } from '../../middlewares/auth.mw';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
const router = express.Router();
const pipelineAsync = promisify(pipeline);

// const debuggerProxy: any = createProxyMiddleware({
//     target: config.env.API_SERVER, // the target server
//     changeOrigin: false, // needed for virtual hosted sites
//     pathRewrite: {
//         '^/dbg': '', // remove the /proxy prefix when forwarding
//     },
//     onProxyReq: (proxyReq, req: any, res) => {
//         // Log the full URL to which the request is redirected
//         const targetUrl = `//${proxyReq.getHeader('host')}${proxyReq.path}`;
//         console.log(`DBG Proxy Redirecting to: ${targetUrl}`);
//         console.log('body', req.body);
//         console.log('headers', req.headers);

//         //const accessToken = req.user.accessToken;
//         //proxyReq.setHeader('Authorization', 'Bearer ' + accessToken);

//         // Remove the Cookie header
//         proxyReq.removeHeader('Cookie');
//     },
//     onProxyRes: (proxyRes, req, res) => {
//         console.log('DBG Proxy Response:', proxyRes.statusCode, proxyRes.statusMessage);
//     },
//     onError: (err, req, res) => {
//         console.log(err);
//     },
// });
// router.use('/', debuggerProxy);

router.get('/debugSession/:id', async (req, res, next) => {
  console.log('DBG Session', req.params.id);
  try {
    const { id } = req.params;
    const url = `${config.env.API_SERVER}/agent/${id}/debugSession`;
    console.log('DBG Session URL', url);

    //x-hash-id is configured in smyth load balancer to use user IP by default or custom value if provided
    //here we force it to use the real client IP in order to keep debug sessions consistent
    const client_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const headers = {
      'x-hash-id': client_ip,
      'x-smyth-debug': 'true',
    };
    console.log('### DBG Session Headers x-hash-id', url, headers);
    const result: any = await axios.get(url, { headers });

    console.log('### DBG Session result', result.data);
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
    const url = `${config.env.API_SERVER}/api/`;

    //x-hash-id is configured in smyth load balancer to use user IP by default or custom value if provided
    //here we force it to use the real client IP in order to keep debug sessions consistent
    const client_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(
      'DBG call with x-hash-id',
      client_ip,
      'req.socket.remoteAddress',
      req.socket.remoteAddress,
    );
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
    console.log('SSE Path rewrite:', path, '->', newPath);
    return newPath;
  },

  // Configure proxy headers
  onProxyReq: (proxyReq: any, req: any, res: any) => {
    const hashId = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log('SSE Proxy Request to:', `${targetUrl}${proxyReq.path}`);
    console.log('SSE Request Headers:', req.headers);
    console.log(
      'SSE request with x-hash-id',
      hashId,
      'req.socket.remoteAddress',
      req.socket.remoteAddress,
    );

    proxyReq.setHeader('x-hash-id', hashId);
    proxyReq.setHeader('x-smyth-debug', 'true');
    proxyReq.setHeader('Accept', 'text/event-stream');
    proxyReq.setHeader('Connection', 'keep-alive');
    proxyReq.setHeader('Cache-Control', 'no-cache');

    proxyReq.removeHeader('Accept-Encoding');

    console.log('SSE Modified Headers:', proxyReq.getHeaders());
  },

  // Handle proxy response
  onProxyRes: (proxyRes: any, req: any, res: any) => {
    console.log('SSE Proxy Response Status:', proxyRes.statusCode);
    console.log('SSE Response Headers:', proxyRes.headers);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    res.flushHeaders();

    let messageCount = 0;
    let buffer = '';

    proxyRes.on('data', (chunk: Buffer) => {
      // console.log('SSE Received chunk:', chunk.toString());

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
      console.log(`SSE Connection ended after ${messageCount} messages`);
      res.end();
    });

    proxyRes.on('error', (error: Error) => {
      console.error('SSE Response stream error:', error);
    });

    // Monitor client disconnection
    req.on('close', () => {
      console.log('SSE Client disconnected');
    });
  },

  // Error handling
  onError: (err: Error, req: any, res: any) => {
    console.error('SSE Proxy Error:', err);

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
    console.log('Sending error message:', errorMessage);
    res.write(errorMessage);
  },

  // Additional options
  timeout: 0,
  proxyTimeout: 0,
  logLevel: 'debug',
  selfHandleResponse: true,
});

// Replace the existing SSE proxy route with the new implementation
router.use('/sse', createProxyMiddleware(createSSEProxyOptions(config.env.API_SERVER)));

// TODO: refactor file-proxy implementation

router.get('/file-proxy', includeTeamDetails, async (req, res) => {
  const { url } = req.query as { url: string };

  const smythURI = URIParser(url);
  if (!smythURI) {
    return res.status(400).send('Invalid Resource URI');
  }

  const resourceId = `teams/${smythURI.team}${smythURI.path}`;
  const teamId = req._team?.id;

  if (teamId !== smythURI.team) {
    return res.status(403).send('Forbidden');
  }

  try {
    // Validate and decode the smythfs URL
    if (!url.startsWith('smythfs://')) {
      return res.status(400).send('Invalid URL format');
    }

    // Determine content type based on file extension
    const extension = smythURI.path.split('.').pop()?.toLowerCase();
    const contentType = getContentType(extension);

    // Set appropriate headers for streaming
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    // Handle range requests
    const rangeHeader = req.headers.range;
    let s3Range: string | undefined;
    let statusCode = 200;
    let contentLength: number | undefined;

    if (rangeHeader) {
      const s3Client = new S3Client({
        region: config.env.AWS_S3_REGION,
        credentials: {
          accessKeyId: config.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      // Get file size from S3 metadata
      const headCommand = new HeadObjectCommand({
        Bucket: config.env.AWS_S3_BUCKET_NAME,
        Key: resourceId,
      });
      const headResponse = await s3Client.send(headCommand);
      const fileSize = headResponse.ContentLength;

      if (fileSize) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).send('Requested Range Not Satisfiable');
        }

        const chunkSize = end - start + 1;
        s3Range = `bytes=${start}-${end}`;
        statusCode = 206;
        contentLength = chunkSize;

        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunkSize);
      }
    }

    // Get the S3 stream with the appropriate range
    const s3Stream = await getS3Stream(resourceId, s3Range);

    // Handle 'close' event to clean up if client disconnects
    res.on('close', () => {
      s3Stream.destroy();
    });

    // Set the status code
    res.status(statusCode);

    // Stream the file from S3
    await pipelineAsync(s3Stream, res);
  } catch (error: any) {
    if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      console.error('Error streaming file from S3:', error);
      if (!res.headersSent) {
        res.status(500).send('Error streaming file');
      }
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
 * Reads a file from S3 bucket and returns a readable stream
 * @param {string} resourceId - The full path of the S3 object (e.g., 'teams/team-id/path/to/file')
 * @param {string} [range] - The byte range to retrieve from S3 (e.g., 'bytes=0-1023')
 * @returns {Promise<Readable>} A readable stream of the S3 object
 * @throws {Error} If the object cannot be retrieved from S3
 */
async function getS3Stream(resourceId: string, range?: string): Promise<Readable> {
  const s3Client = new S3Client({
    region: config.env.AWS_S3_REGION,
    credentials: {
      accessKeyId: config.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const commandParams: GetObjectCommandInput = {
    Bucket: config.env.AWS_S3_BUCKET_NAME,
    Key: resourceId,
  };

  if (range) {
    commandParams.Range = range;
  }

  const command = new GetObjectCommand(commandParams);

  try {
    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('No data returned from S3');
    }

    return response.Body as Readable;
  } catch (error: any) {
    console.error('Error reading from S3:', error);
    throw new Error(`Failed to read file from S3: ${error.message}`);
  }
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
