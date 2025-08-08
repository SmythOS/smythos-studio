import { addDatasource } from '@react/features/data-space/client/dataspace.api-client.service';
import DatasourceFileUpload from '@react/features/data-space/components/datasourceFileUpload';
import { Input as CustomInput } from '@react/shared/components/ui/input';
import Modal from '@react/shared/components/ui/modals/Modal';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import { queryClient } from '@react/shared/query-client';
import { SmythAPIError } from '@react/shared/types/api-results.types';
import { extractError } from '@react/shared/utils/errors';
import { autoDetectDSFileType } from '@react/shared/utils/utils';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import * as yup from 'yup';

type Props = {
  namespaceName: string;
  onClose: () => void;
};

export const autoDetectDSByURL = (url: string) => {
  let _url: URL | null = null;

  try {
    _url = new URL(url);
  } catch (error) {
    return null;
  }

  // if no extension, consider it as a webpage
  if (_url.pathname.split('.').length == 1) return 'WEBPAGE';
  // if it's a youtube video, consider it as a transcript
  if (_url.hostname === 'www.youtube.com' || _url.hostname === 'youtube.com') {
    return 'TRANSCRIPT';
  }

  const ext = _url.pathname.split('.').pop().toLowerCase();

  switch (ext) {
    case 'pdf':
      return 'PDF';
    case 'xml':
      return 'SITEMAP';
    case 'html':
    case 'htm':
    case 'txt':
      return 'WEBPAGE';
    case 'doc':
    case 'docx':
      return 'WORD';
    default:
      return null;
  }
};

type DsForm = 'URL' | 'FILE';

const AddDatasourceDialog = ({ namespaceName, onClose }: Props) => {
  const [dsFile, setDsFile] = useState<File>();
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [disableUpload, setDisableUpload] = useState(false);
  const [dsDetails, setDsDetails] = useState({ name: '', type: '', url: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [fileUploadError, setFileUploadError] = useState('');

  const [errors, setValidationErrors] = useState({
    url: null,
    name: null,
  });
  const urlSchema = yup.string().url();

  const handleDataSourceChange = (value: string, dsForm: DsForm) => {
    if (dsForm !== 'URL') return;
    setValidationErrors((prev) => ({ ...prev, url: null }));
    // if value does not include http or https, add it
    // const completeUrl = value.includes('http') ? value.trim() : `https://${value.trim()}`;
    const type = autoDetectDSByURL(value);
    setDsDetails({
      ...dsDetails,
      type,
      url: value?.trim(),
    });
    if (!value?.trim()) {
      setDisableUpload(false);
    } else {
      setDisableUpload(true);
    }
  };

  const addDsMutation = useMutation({
    mutationFn: addDatasource,

    onError: (error: SmythAPIError) => {
      const _errorMessage =
        error.status === 403 && extractError(error) === 'Forbidden'
          ? 'You are not authorized to add a new data source'
          : extractError(error) || 'An error occurred. Please try again later.';
      setErrorMessage(_errorMessage);
      console.log(error);
    },
    onSuccess: () => {
      toast.success('Data source added successfully');
      queryClient.invalidateQueries({ queryKey: [`datasources-${namespaceName}`] });
    },
  });

  // TODO: refactor function
  const handlePostDataSource = async (url: string, name: string, namespaceName: string, type) => {
    if (!name?.trim()) {
      setValidationErrors((prev) => ({ ...prev, name: 'Please enter a name for the datasource.' }));
      return;
    }

    if ((!dsFile || !uploadedFileUrl) && !urlSchema.isValidSync(url)) {
      // in case not file was uploaded, and the url is not valid
      setValidationErrors((prev) => ({ ...prev, url: 'Please enter a valid URL.' }));
      return;
    }

    let urlValue = '';
    let typeValue = '';

    if (dsFile) {
      urlValue = uploadedFileUrl;
      typeValue = await autoDetectDSFileType(dsFile);
    } else if (url !== '') {
      urlValue = url;
      typeValue = type;
    }

    try {
      const data = await addDsMutation.mutateAsync({
        body: {
          name: name,
          namespaceName,
          type: typeValue,
          url: urlValue,
        },
      });

      onClose();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <Modal
        onClose={onClose}
        title="Add Data Source"
        panelWidthClasses="mx-auto w-[290px] sm:w-[400px]"
      >
        <div className="modal-body">
          <div className="flex flex-col gap-4">
            <div className="w-full pb-4">
              <CustomInput
                label="Name"
                labelExample="(required)"
                value={dsDetails.name}
                onChange={(event) => {
                  setValidationErrors((prev) => ({ ...prev, name: null }));
                  setDsDetails({ ...dsDetails, name: event.target.value });
                }}
                fullWidth
                placeholder="Type data source name"
                id="datasourceInput"
                required={true}
              />
              {errors?.name && <div className="text-red-600 text-sm">{errors.name}</div>}
            </div>

            <DatasourceFileUpload
              disableUpload={disableUpload}
              fileName={fileName}
              setFile={setDsFile}
              setUploadedUrl={setUploadedFileUrl}
              setFileName={setFileName}
              setFileUploadError={setFileUploadError}
            />
            <div className="py-4 text-center text-black">OR</div>

            <div>
              <CustomInput
                value={dsDetails.url}
                fullWidth
                placeholder="Type data source URL"
                label="Enter URL"
                labelExample="(sitemap or website URL)"
                disabled={!!dsFile}
                onChange={(event) => handleDataSourceChange(event.target.value, 'URL')}
              />

              {dsDetails.type && (
                <div className="success-message pt-1" id="verify-message">
                  <span id="selectedType">{dsDetails.type} </span> format automatically detected.
                </div>
              )}
              {errors?.url && <div className="text-red-600 text-sm">{errors.url}</div>}
            </div>

            {addDsMutation.isError && (
              <div className="pt-2 text-red-600 text-sm">{errorMessage}</div>
            )}

            {!addDsMutation.isError && fileUploadError && (
              <div className="pt-2 text-red-600 text-sm">{fileUploadError}</div>
            )}

            <div className="flex gap-3 mt-4 ">
              <CustomButton
                type="submit"
                className="justify-center flex-1"
                disabled={addDsMutation.isLoading}
                label={'Add Data Source'}
                loading={addDsMutation.isLoading}
                handleClick={() =>
                  handlePostDataSource(dsDetails.url, dsDetails.name, namespaceName, dsDetails.type)
                }
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
export default AddDatasourceDialog;
