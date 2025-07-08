import FileUpload from '@react/features/data-space/components/fileUpload';
import { constructS3Url } from '@react/shared/utils/utils';
import { ChangeEvent, useState } from 'react';

export default function DatasourceFileUpload({
  fileName,
  setFile,
  setUploadedUrl,
  setFileName,
  disableUpload,  
  setFileUploadError,
}) {
  const [isUploaded, setIsUploaded] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const uploadFile = async (fileValue) => {
    const formData = new FormData();
    formData.append('file', fileValue);
    return fetch(`/api/uploads/datasources`, {
      method: 'PUT',
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error uploading datasource: ${response.status} ${response.statusText}`);
        }
        setUploadLoading(false);

        return response.json();
      })
      .catch((error) => {
        console.error('Error uploading datasource:', error);
        setUploadLoading(false);
        throw error;
      });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setFileUploadError('');
    const selectedFile = e.target.files[0];
    const { name, type } = selectedFile;

    if (!isValidDataSourceFileType(name, type)) {
      setFileUploadError(
        'Invalid file type. Please upload a .pdf, .doc, .docx, .txt, .xml, .html, or .htm file.',
      );
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
    e.target.disabled = true;
    setUploadLoading(true);

    try {
      const uploadedFile = await uploadFile(selectedFile);
      const fileURL = constructS3Url(uploadedFile.file.key);

      setFileName(name);
      setUploadedUrl(fileURL);
      setIsUploaded(uploadedFile.file);
    } catch (error) {
      console.log(error);
    } finally {
      e.target.disabled = false;
      e.target.value = null;
      setUploadLoading(false);
    }
  };

  async function deleteFile(key: string) {
    setDeleteLoading(true);
    return fetch(`/api/uploads/datasources?key=${key}`, {
      method: 'DELETE',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error deleting datasource: ${response.status} ${response.statusText}`);
        }
        setDeleteLoading(false);
        return response.json();
      })
      .catch((error) => {
        console.error('Error deleting datasource:', error);
        setDeleteLoading(false);
        throw error;
      });
  }

  const handleDelete = async (key) => {
    try {
      await deleteFile(key);
      setFile(null);
      setFileName(null);
      setUploadedUrl(null);
      setIsUploaded(null);
    } catch (error) {
      console.log(error);
    }
  };

   const isValidDataSourceFileType = (name: string, type: string) => {
    const allowedExtensions = /(\.pdf|\.doc|\.docx|\.txt|\.xml|\.html|\.htm)$/i;
    const mimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/xml',
      'text/xml',
      'text/html',
    ];
  
    return allowedExtensions.test(name) && mimeTypes.includes(type);
  };
  

  return (
    <div className="">
      <div className="text-black pb-2">
        Add File <span className="italic text-sm text-gray-500">(.xml, .docx, .pdf) </span>
      </div>
      <FileUpload
        uploadLoading={uploadLoading}
        onChange={handleFileChange}
        fileName={fileName}
        handleDelete={() => handleDelete(isUploaded.key)}
        disableUpload={disableUpload}
        deleteLoading={deleteLoading}
        accept=".pdf,.doc,.docx,.txt,.xml,.html,.htm"
      />
    </div>
  );
}
