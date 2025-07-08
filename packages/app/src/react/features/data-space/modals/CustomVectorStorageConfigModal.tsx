import {
  deleteCustomVectorStorage,
  saveCustomVectorStorage,
} from '@react/features/data-space/client/dataspace.api-client.service';
import Modal from '@react/shared/components/ui/modals/Modal';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import { SmythAPIError, VectorsCustomStorage } from '@react/shared/types/api-results.types';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { useMutation } from '@tanstack/react-query';
import { Tooltip } from 'flowbite-react';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import { useState } from 'react';
import { FaCircleExclamation } from 'react-icons/fa6';
import { IoInformationCircleOutline } from 'react-icons/io5';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

type Props = {
  onClose: () => void;
  data: VectorsCustomStorage;
  resetDataAndRefetch: () => void;
};

const inputClass = ` bg-white 
            border
            text-gray-900
            rounded
            block 
            w-full
            outline-none
            focus:outline-none
            focus:ring-0
            focus:ring-offset-0
            focus:ring-shadow-none
            text-sm 
            font-normal
            placeholder:text-sm
            placeholder:font-normal
            border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500
`;

// Create a custom error component
const CustomErrorMessage = ({ children }) => (
  <span className="flex items-start text-[12px] text-red-500 font-normal mt-2">
    <FaCircleExclamation className="text-red-500 mr-1 w-[10px] h-[10px] mt-[3px]" />
    {children}
  </span>
);

const CustomVectorStorageConfigModal = ({
  onClose,
  data,
  resetDataAndRefetch: refetchData,
}: Props) => {
  const [existingConfigPrompts, setExistingConfigPrompts] = useState({
    showDeleteExistingConfigModal: false,
    hasAccepedDeletingExistingConfig: false,
  });

  const initialValues = {
    apiKey: data?.storage?.apiKey || '',
    indexName: data?.storage?.indexName || '',
    environment: data?.storage?.environment || '',
    projectUrl: data?.storage?.projectUrl || '',
  };

  const validationSchema = Yup.object().shape({
    apiKey: Yup.string().required('API Key is required'),
    indexName: Yup.string().required('Index Name is required'),
    environment: Yup.string().required('Environment is required'),
    projectUrl: Yup.string().url('Invalid URL').required('Project URL is required'),
  });

  const saveConfigMutation = useMutation({
    mutationFn: saveCustomVectorStorage,
    mutationKey: ['custom_vector_storage_configuration_save'],

    onSuccess: () => {
      toast.success('Configuration saved successfully');
      refetchData();
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: deleteCustomVectorStorage,
    mutationKey: ['custom_vector_storage_configuration_delete'],

    onError: (error: SmythAPIError) => {
      toast.error(error.error.message ?? 'Something went wrong');
      console.log(error);
    },
    onSuccess: () => {
      toast.success('Configuration deleted successfully');
    },
  });

  const handleSubmit = async (
    values: {
      apiKey: string;
      environment: string;
      indexName: string;
      projectUrl: string;
    },
    { setSubmitting },
  ) => {
    // IF data is configured, prompt the user to delete the existing configuration first
    if (data.isConfigured && !existingConfigPrompts.hasAccepedDeletingExistingConfig) {
      setExistingConfigPrompts((prev) => ({ ...prev, showDeleteExistingConfigModal: true }));
    } else {
      await saveConfigMutation.mutateAsync({
        apiKey: values.apiKey,
        environment: values.environment,
        indexName: values.indexName,
        projectUrl: values.projectUrl,
      });
      onClose();
    }
    setSubmitting(false);
  };

  const tutorialInfo = (
    <a href={`${SMYTHOS_DOCS_URL}/agent-collaboration/data-pool/custom-storage`} target="_blank" rel="noreferrer">
      <IoInformationCircleOutline
        size="1.2rem"
        cursor={'pointer'}
        className="hover:text-primary-500 dark:hover:text-primary-400 hover:scale-110 transition-all inline-block "
      />
    </a>
  );

  return (
    <>
      <Modal onClose={onClose} title="Pinecone Configuration">
        <div className="modal-body">
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ resetForm, isSubmitting, dirty }) => (
              <Form className="flex flex-col justify-between mt-6 gap-4">
                <div>
                  <label
                    htmlFor="apiKey"
                    className="flex items-start gap-2 text-gray-700 mb-1 text-sm font-normal"
                  >
                    <span>
                      API Key <span className="text-red-500">*</span>
                    </span>
                    <Tooltip
                      content={
                        <span>
                          Enter your Pinecone API key to authenticate requests to your vector
                          database.{' '}
                          <a
                            href={`${SMYTHOS_DOCS_URL}/agent-collaboration/data-pool/custom-storage`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-500 hover:text-primary-400 hover:underline"
                          >
                            Learn more
                          </a>
                        </span>
                      }
                      style="light"
                      placement="right"
                    >
                      <span className="text-gray-500 text-sm inline-flex items-center cursor-help">
                        <IoInformationCircleOutline size="1.2rem" />
                      </span>
                    </Tooltip>
                  </label>
                  <Field
                    name="apiKey"
                    type="text"
                    placeholder="e.g. 123-456-7890"
                    id="apiKey"
                    className={inputClass}
                  />
                  <ErrorMessage name="apiKey" component={CustomErrorMessage} />
                </div>

                <div>
                  <label
                    htmlFor="indexName"
                    className="flex items-start gap-2 text-gray-700 mb-1 text-sm font-normal"
                  >
                    Index Name <span className="text-red-500">*</span>
                  </label>
                  <Field
                    name="indexName"
                    type="text"
                    placeholder="e.g. index1"
                    id="indexName"
                    className={inputClass}
                  />
                  <ErrorMessage name="indexName" component={CustomErrorMessage} />
                </div>

                <div>
                  <label
                    htmlFor="environment"
                    className="flex items-start gap-2 text-gray-700 mb-1 text-sm font-normal"
                  >
                    Environment/Region
                  </label>
                  <Field
                    name="environment"
                    type="text"
                    placeholder="e.g. us-west4-gcp"
                    id="environment"
                    className={inputClass}
                  />
                  <ErrorMessage name="environment" component={CustomErrorMessage} />
                </div>

                <div>
                  <label
                    htmlFor="projectUrl"
                    className="flex items-start gap-2 text-gray-700 mb-1 text-sm font-normal"
                  >
                    Index Host
                  </label>
                  <Field
                    name="projectUrl"
                    type="url"
                    placeholder="e.g. https://index1-0000.svc.us-west4-gcp.pinecone.io"
                    className={inputClass}
                  />
                  <ErrorMessage name="projectUrl" component={CustomErrorMessage} />
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {/* tell the user that he needs to have an index that its vector dimentation is 1536 (tell him in a friendly way) */}
                  <b>Note:</b> Make sure that the index has a vector dimension of <b>1536</b>.
                </p>

                {/* {submission error span} */}
                {saveConfigMutation.isError && (
                  <span className="text-red-500 text-sm">
                    {(saveConfigMutation?.error as any)?.error?.message ?? 'Something went wrong'}
                  </span>
                )}

                <div className="flex gap-3 mt-4 ">
                  {data.isConfigured && (
                    <CustomButton
                      className="flex-0.5"
                      type="button"
                      label="Delete"
                      isDelete
                      handleClick={() =>
                        setExistingConfigPrompts((prev) => ({
                          ...prev,
                          showDeleteExistingConfigModal: true,
                        }))
                      }
                    />
                  )}
                  <CustomButton
                    type="submit"
                    className="flex-1"
                    disabled={
                      isSubmitting ||
                      saveConfigMutation.isLoading ||
                      (!dirty && !existingConfigPrompts.hasAccepedDeletingExistingConfig)
                    }
                    label={'Save Configuration'}
                    loading={saveConfigMutation.isLoading}
                  />
                </div>
              </Form>
            )}
          </Formik>
        </div>

        {existingConfigPrompts.showDeleteExistingConfigModal && (
          <Modal
            onClose={() =>
              setExistingConfigPrompts((prev) => ({
                ...prev,
                showDeleteExistingConfigModal: false,
              }))
            }
            title="Delete Existing Configuration"
          >
            <div className="modal-body">
              <div className="flex flex-col gap-4">
                <p>
                  Are you sure you want to delete the existing configuration? <br /> <br />
                  <b>Note:</b> This will delete all existing namespaces associated with this
                  configuration.
                </p>
                <div className="flex gap-3 mt-4 ">
                  <CustomButton
                    className="flex-1"
                    variant="secondary"
                    type="button"
                    handleClick={() =>
                      setExistingConfigPrompts((prev) => ({
                        ...prev,
                        showDeleteExistingConfigModal: false,
                      }))
                    }
                    label="Cancel"
                  />
                  <CustomButton
                    type="button"
                    isDelete
                    handleClick={async () => {
                      if (deleteConfigMutation.isLoading) return;
                      await deleteConfigMutation.mutateAsync();
                      refetchData();
                      setExistingConfigPrompts((prev) => ({
                        ...prev,
                        showDeleteExistingConfigModal: false,
                        hasAccepedDeletingExistingConfig: true,
                      }));
                    }}
                    disabled={deleteConfigMutation.isLoading}
                    loading={deleteConfigMutation.isLoading}
                    label="Delete"
                    className="justify-center flex-1"
                  />
                </div>
              </div>
            </div>
          </Modal>
        )}
      </Modal>
    </>
  );
};

export default CustomVectorStorageConfigModal;
