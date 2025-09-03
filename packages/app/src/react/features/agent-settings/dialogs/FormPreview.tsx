import { Dialog, Transition } from '@headlessui/react';
import { mapFormPreviewEmbodimentProperties } from '@react/features/agent-settings/utils';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { Spinner } from '@react/shared/components/ui/spinner';
import { EMBODIMENT_TYPE } from '@react/shared/enums';
import { extractError } from '@react/shared/utils/errors';
import { validateDomains, validateURL } from '@react/shared/utils/utils';
import { CloseIcon } from '@src/react/shared/components/svgs';
import { Switch } from '@src/react/shared/components/ui/switch';
import { FormPreviewEmbodimentData } from '@src/react/shared/types/api-results.types';
import { errorToast, successToast, warningToast } from '@src/shared/components/toast';
import { useQueryClient } from '@tanstack/react-query';
import { Tooltip } from 'flowbite-react';
import { ErrorMessage, Field, Form, Formik, FormikProps } from 'formik';
import { Info } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { saveEmbodiment } from '../clients';

interface IFormPreviewDialogProps {
  isOpen: boolean;
  closeModal: () => void;
  currentData: any;
  style: any;
  activeAgent: any;
  agentId: string;
}

const FormPreviewDialog = ({
  isOpen,
  closeModal,
  currentData,
  style,
  activeAgent,
  agentId,
}: IFormPreviewDialogProps) => {
  const [activeData, setActiveData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [domainError, setDomainError] = useState(false);
  const queryClient = useQueryClient();

  // Default values to prevent uncontrolled to controlled input warning
  const defaultFormValues = {
    name: '',
    allowedDomains: [],
    outputPreview: false,
  };

  useEffect(() => {
    const properties = currentData?.properties;
    const _activeData = mapFormPreviewEmbodimentProperties(properties, activeAgent);

    setActiveData(_activeData);
  }, [currentData, activeAgent]);

  const submitForm = async (data) => {
    if (isSubmitting) {
      return; // If submission is already in progress, do nothing
    }

    if (data.allowedDomains?.filter((domain) => domain)?.length > 0) {
      const hasInvalidDomains = !validateDomains(data.allowedDomains);

      if (hasInvalidDomains) {
        setDomainError(true);
        return;
      }
    }

    if (data.icon && !validateURL(data.icon)) {
      warningToast('The URL entered for icon does not appear to be valid.');
    }

    try {
      setIsSubmitting(true); // Set the flag to true to indicate that submission is in progress
      const dataToSend = {
        type: EMBODIMENT_TYPE.FORM,
        properties: {
          ...data,
          allowedDomains: data?.allowedDomains
            ?.filter((domain) => domain && domain.trim() !== '')
            ?.map((item) => item.trim()),
        },
      };

      try {
        await saveEmbodiment(
          currentData ? 'PUT' : 'POST',
          currentData
            ? { ...dataToSend, embodimentId: currentData?.id }
            : { ...dataToSend, aiAgentId: agentId },
        );
        // Invalidate the agentEmbodiments query to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['agentEmbodiments', agentId] });
        // Also invalidate the embodiments query used in deploy modal
        queryClient.invalidateQueries({ queryKey: ['embodiments', agentId] });
        // Invalidate the agent_embodiments query used in OverviewWidgetsContainer
        queryClient.invalidateQueries({ queryKey: ['agent_embodiments', agentId] });
        // Invalidate the availableEmbodiments query
        queryClient.invalidateQueries({ queryKey: ['availableEmbodiments', agentId] });

        successToast('Embodiment saved');
        closeModal();
      } catch (error) {
        errorToast(extractError(error) || 'Embodiment not saved. Please try again.');
        console.log(error);
      }

      setIsSubmitting(false); // Reset the flag after submission is complete
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal} style={style}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="w-[80vw] max-w-[600px]">
                <Dialog.Panel className="w-full relative transform overflow-hidden rounded-xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title className="text-xl font-semibold leading-6 text-[#1E1E1E] mb-4 flex justify-between items-center">
                    <span>Form Preview Configuration</span>
                    <div
                      className="cursor-pointer w-8 h-8 bg-transparent rounded-lg hover:text-gray-900 hover:bg-gray-200 p-2"
                      onClick={() => closeModal()}
                    >
                      <CloseIcon width={16} height={16} />
                    </div>
                  </Dialog.Title>
                  <Formik
                    initialValues={activeData || defaultFormValues}
                    enableReinitialize={true}
                    // validate={(values) => validateForm(values)}
                    onSubmit={(values) => {
                      submitForm(values);
                    }}
                  >
                    {(props: FormikProps<FormPreviewEmbodimentData>) => {
                      return (
                        <Form>
                          <div className="mt-5 space-y-4">
                            <div>
                              <label
                                htmlFor="name"
                                className="block text-[#1E1E1E] mb-1 text-base font-normal"
                              >
                                Name
                              </label>
                              <Field
                                type="text"
                                className="bg-white
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
                                  mb-4
                                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                                name="name"
                                id="name"
                                onChange={props.handleChange}
                                onBlur={props.handleBlur}
                                value={props.values?.name}
                                placeholder="Enter form preview name"
                                disabled={true}
                              />
                              <ErrorMessage
                                name="name"
                                component="div"
                                className="text-red-500 text-sm"
                              />
                            </div>

                            {/* ALLOWED DOMAINS START */}
                            <div>
                              <label
                                htmlFor="allowedDomains"
                                className="text-[#1E1E1E] mb-1 text-base font-normal flex items-center"
                              >
                                Allowed Domains{' '}
                                <Tooltip
                                  className="w-60 text-center"
                                  content={
                                    <div>
                                      Restrict form preview to specific domains.
                                      <br /> Use commas to separate multiple domains (e.g.,
                                      example.com, mysite.org).
                                      <br /> Leave empty for no restrictions.
                                    </div>
                                  }
                                >
                                  <Info className="w-5 h-5 ml-1" />
                                </Tooltip>
                              </label>

                              <Field
                                type="text"
                                id="allowedDomains"
                                className={`bg-white
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
                                  mb-4
                                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500 ${
                                  domainError
                                    ? 'border-red-500 text-red-900 placeholder-red-700 focus:border-red-500 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500'
                                    : ''
                                }`}
                                name="allowedDomains"
                                placeholder="Enter comma separated values for domains"
                                value={
                                  Array.isArray(props.values?.allowedDomains)
                                    ? props.values.allowedDomains.join(',')
                                    : props.values?.allowedDomains || ''
                                }
                                onChange={(e) => {
                                  if (domainError) {
                                    setDomainError(false);
                                  }
                                  const newValue = e.target.value ? e.target.value.split(',') : [];
                                  props.setFieldValue('allowedDomains', newValue);
                                }}
                              />

                              {domainError && (
                                <p className="mb-2 text-sm text-red-600 dark:text-red-500">
                                  <span className="font-medium">
                                    One or more domains are invalid. Make sure there is no trailing
                                    comma.
                                  </span>
                                </p>
                              )}

                              <ErrorMessage
                                name="allowedDomains"
                                component="div"
                                className="text-red-500 text-sm mb-2"
                              />
                            </div>
                            {/* ALLOWED DOMAINS END */}

                            {/* OUTPUT PREVIEW START */}
                            <div className="flex items-center justify-between">
                              <label
                                htmlFor="outputPreview"
                                className="text-[#1E1E1E] mb-1 text-base font-normal flex items-center"
                              >
                                Output Preview
                                <Tooltip
                                  className="w-60 text-center"
                                  content={
                                    <div>
                                      Enabling output preview will show the download and copy
                                      options for the output.
                                    </div>
                                  }
                                >
                                  <Info className="w-5 h-5 ml-1" />
                                </Tooltip>
                              </label>
                              <Switch
                                name="outputPreview"
                                className="bg-gray-200 data-[state=checked]:bg-[#3f83f8]"
                                onCheckedChange={(checked) =>
                                  props.setFieldValue('outputPreview', checked)
                                }
                                checked={props.values?.outputPreview}
                              />
                            </div>
                            {/* OUTPUT PREVIEW END */}
                          </div>

                          <div className="flex justify-end w-full mt-4">
                            <Button
                              handleClick={() => submitForm(props.values)}
                              label="Save"
                              addIcon={isSubmitting}
                              Icon={<Spinner classes="w-4 h-4 mr-2" />}
                              disabled={isSubmitting}
                              type="submit"
                              className="px-8 rounded-lg"
                            />
                          </div>
                        </Form>
                      );
                    }}
                  </Formik>
                </Dialog.Panel>
              </div>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default FormPreviewDialog;
