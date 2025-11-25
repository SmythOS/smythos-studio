import { Logger } from '@smythos/sre';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import os from 'os';
import path from 'path';
import * as datapoolsController from './controller.datapools';
// use express async handler
import expressAsyncHandler from 'express-async-handler';

const console = Logger('[Builder] Router: Data Pools');
const router = express.Router();

// Ensure upload directory exists
const ensureUploadDir = () => {
  const tmpDir = os.tmpdir();
  const uploadDir = path.join(tmpDir, 'smythos-datasources');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return uploadDir;
};

// Configure multer for file uploads (disk storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store files in OS temp directory
    const uploadDir = ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate small unique ID (6 characters)
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);

    // Keep original name with small unique ID
    cb(null, `${basename}-${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only .txt, .pdf, and .docx files
    const allowedMimeTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.txt', '.pdf', '.docx'];

    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt, .pdf, and .docx files are allowed'));
    }
  },
});

// Namespace routes
router.post('/namespaces', expressAsyncHandler(datapoolsController.createNamespace));
router.get('/namespaces', expressAsyncHandler(datapoolsController.listNamespaces));
router.delete('/namespaces/:label', expressAsyncHandler(datapoolsController.deleteNamespace));

// Embeddings routes
router.get('/embeddings/models', expressAsyncHandler(datapoolsController.listEmbeddingsModels));

// Datasource routes
router.post('/namespaces/:namespaceLabel/datasources', upload.single('file'), expressAsyncHandler(datapoolsController.createDatasource));
router.get('/namespaces/:namespaceLabel/datasources', expressAsyncHandler(datapoolsController.listDatasources));
router.delete('/namespaces/:namespaceLabel/datasources/:datasourceId', expressAsyncHandler(datapoolsController.deleteDatasource));

export default router;
