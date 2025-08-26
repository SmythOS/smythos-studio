# Storage Services Documentation

This directory contains storage service implementations for handling file uploads and management.

## Available Storage Implementations

### S3Storage
- **Purpose**: AWS S3 cloud storage
- **Use case**: Production environments with cloud infrastructure
- **Features**: Cloud storage, automatic scaling, lifecycle management via AWS

### LocalStorage
- **Purpose**: Local file system storage
- **Use case**: Development, testing, or self-hosted deployments
- **Features**: Local file storage, automatic directory creation, built-in purge policies

## Usage

The storage system uses a factory pattern that automatically selects the appropriate storage implementation based on configuration:

```typescript
import { publicStorage, privateStorage } from '@src/backend/services/storage';

// The storage implementation is automatically selected based on environment variables
// - S3Storage when PUBLIC_STORAGE_DRIVER=s3
// - LocalStorage otherwise (default)
```

### Configuration

#### For S3Storage
Set the following environment variables:
```env
PUBLIC_STORAGE_DRIVER=s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_private_bucket
AWS_S3_PUB_BUCKET_NAME=your_public_bucket
AWS_S3_REGION=us-east-1
AWS_S3_PUB_REGION=us-east-1
```

#### For LocalStorage
Set the data path (optional):
```env
DATA_PATH=/path/to/storage/directory
# If not set, defaults to ~/smyth-ui-data
```

### Storage Structure

When using LocalStorage, files are organized as follows:
```
{DATA_PATH}/
├── public/          # Files accessible via public URLs
│   └── uploads/
└── private/         # Protected files (require authentication)
    └── internal/
```

### File Upload Example

```typescript
import { publicStorage } from '@src/backend/services/storage';

// Create upload middleware
const uploadMw = publicStorage.createUploadMw({
  key: (req, file) => `uploads/${Date.now()}-${file.originalname}`,
  purge: 'DAILY', // Auto-delete after 24 hours
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Use in route
app.post('/upload', uploadMw.single('file'), (req, res) => {
  const publicUrl = publicStorage.getPublicUrl(req.file.filename);
  res.json({ url: publicUrl });
});
```

### Direct File Operations

```typescript
// Save content directly
const result = await publicStorage.saveContent({
  key: 'documents/report.pdf',
  body: pdfBuffer,
  contentType: 'application/pdf',
  purge: 'WEEKLY', // Auto-delete after 7 days
});

console.log('File saved:', result.url);

// Delete content
await publicStorage.deleteContent({
  key: 'documents/report.pdf',
});
```

### Purge Policies

Both storage implementations support automatic cleanup:

- **DAILY**: Files are deleted after 24 hours
- **WEEKLY**: Files are deleted after 7 days  
- **MONTHLY**: Files are deleted after 30 days

For S3Storage, this uses AWS lifecycle policies.
For LocalStorage, this uses Node.js timers for cleanup.

### URL Generation

```typescript
// Generate public URL for a stored file
const publicUrl = publicStorage.getPublicUrl('uploads/image.jpg');
// LocalStorage: http://localhost:3000/static/public/uploads/image.jpg
// S3Storage: https://your-bucket.s3.amazonaws.com/uploads/image.jpg
```

### Security Features

#### LocalStorage Security
- **Path Traversal Protection**: Automatically sanitizes file keys to prevent `../` attacks
- **Directory Isolation**: Public and private files are stored in separate directories
- **Access Control**: Private storage requires authentication middleware

#### S3Storage Security
- **IAM Policies**: Uses AWS IAM for access control
- **Bucket Policies**: Separate buckets for public and private content
- **Encryption**: Supports server-side encryption

## Migration

### From S3 to Local
1. Set `PUBLIC_STORAGE_DRIVER` to empty or remove it
2. Ensure `DATA_PATH` is configured
3. Restart the application

### From Local to S3
1. Set `PUBLIC_STORAGE_DRIVER=s3`
2. Configure AWS credentials
3. Restart the application

## Monitoring and Cleanup

### LocalStorage
- Files are automatically organized by access control
- Purge jobs run automatically based on policy
- Call `localStorage.cleanup()` on application shutdown to clear pending timers

### S3Storage
- Uses AWS CloudWatch for monitoring
- Lifecycle policies handle automatic cleanup
- No manual cleanup required
