export type TUploadFile = {
  id: string;
  file: File;
  url?: string;
  name?: string;
  type?: string;
  size?: number;
  metadata: {
    key?: string;
    fileType?: string;
    publicUrl?: string;
    previewUrl?: string;
    isUploading?: boolean;
  };
};

export type TUploadStatus = {
  status: 'uploading' | 'completed' | 'error';
  progress: number;
};

