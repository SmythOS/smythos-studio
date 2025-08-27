import { Dialog, Transition } from '@headlessui/react';
import {
  HUMAN_DESCRIPTION_LIMIT,
  HUMAN_DESCRIPTION_THRESHOLD,
  MODEL_DESCRIPTION_LIMIT,
  MODEL_DESCRIPTION_THRESHOLD,
} from '@react/features/agent-settings/constants';
import { mapGptEmbodimentProperties } from '@react/features/agent-settings/utils';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { Spinner } from '@react/shared/components/ui/spinner';
import { EMBODIMENT_TYPE } from '@react/shared/enums';
import { validateURL } from '@react/shared/utils/utils';
import { errorToast, successToast } from '@src/shared/components/toast';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import { Fragment, useEffect, useState } from 'react';
import { IoClose } from 'react-icons/io5';

interface IFormValues {
  humanName: string;
  modelName: string;
  humanDescription: string;
  modelDescription: string;
  logoUrl: string;
  contactEmail: string;
  legalInfoUrl: string;
}

type FormErrors = {
  [K in keyof IFormValues]?: string;
};

interface IChatGptDialogProps {
  isOpen: boolean;
  closeModal: () => void;
  currentData: any;
  refreshEmbodiments: (agentId: string, embodimentId: string) => void;
  style: any;
  activeAgent: any;
  agentId: string;
}

const ChatGptDialog = ({
  isOpen,
  closeModal,
  currentData,
  refreshEmbodiments,
  style,
  activeAgent,
  agentId,
}: IChatGptDialogProps) => {
  const [activeData, setActiveData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const properties = currentData?.properties;
    const _activeData = mapGptEmbodimentProperties(properties, activeAgent);
    setActiveData(_activeData);
  }, [currentData, activeAgent]);

  const submitForm = async (data) => {
    if (isSubmitting) {
      return;
    }
    if (data?.logoUrl && !validateURL(data?.logoUrl)) {
      errorToast('The URL entered for logo does not appear to be valid.');
    }
    if (data?.legalInfoUrl && !validateURL(data?.legalInfoUrl)) {
      errorToast('The URL entered for legal info does not appear to be valid.');
    }

    try {
      setIsSubmitting(true); // Set the flag to true to indicate that submission is in progress
      const dataToSend = {
        type: EMBODIMENT_TYPE.CHAT_GPT,
        properties: {
          ...data,
        },
      };

      const requestOptions = {
        method: currentData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          currentData
            ? { ...dataToSend, embodimentId: currentData?.id }
            : { ...dataToSend, aiAgentId: agentId },
        ),
      };

      fetch('/api/page/agents/embodiment', requestOptions)
        .then((response) => {
          response.json().then((data) => {
            // Invalidate all embodiment-related queries to ensure fresh data
            queryClient.invalidateQueries({ queryKey: ['agentEmbodiments', agentId] });
            queryClient.invalidateQueries({ queryKey: ['embodiments', agentId] });
            queryClient.invalidateQueries({ queryKey: ['agent_embodiments', agentId] });
            queryClient.invalidateQueries({ queryKey: ['availableEmbodiments', agentId] });
            refreshEmbodiments(agentId, currentData?.id);
            successToast('Embodiment saved');
            closeModal();
          });
        })
        .catch((error) => {
          errorToast(error || 'Embodiment not saved');
          console.log(error);
        })
        .finally(() => {
          setIsSubmitting(false); // Reset the flag after submission is complete
        });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const validateForm = (values) => {
    const errors: FormErrors = {};

    if (values.logoUrl && !validateURL(values.logoUrl)) {
      errors.logoUrl = 'Please enter a valid URL for logo';
    }
    if (values.legalInfoUrl && !validateURL(values.legalInfoUrl)) {
      errors.legalInfoUrl = 'Please enter a valid URL for legal info';
    }

    return errors;
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
          <div className="flex min-h-full items-center justify-center pt-16 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="w-[70%] min-w-[600px] max-w-[1200px]">
                <Dialog.Panel className="w-full relative transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title className="text-xl font-semibold leading-6 text-[#1E1E1E] mb-4 flex justify-between items-center">
                    <span>ChatGPT Configurations</span>
                    <IoClose className="cursor-pointer" size={24} onClick={() => closeModal()} />
                  </Dialog.Title>
                  <Formik
                    initialValues={activeData}
                    enableReinitialize={true}
                    // validate={(values) => validateForm(values)}
                    onSubmit={(values) => {
                      submitForm(values);
                    }}
                  >
                    {(props) => {
                      return (
                        <Form>
                          <div className="flex gap-5 justify-between items-center mt-4">
                            <div className="flex-1 mb-4">
                              <label
                                htmlFor="humanName"
                                className="block text-[#1E1E1E] mb-1 text-base font-normal"
                              >
                                Name for Human:
                              </label>
                              <Field
                                type="text"
                                className=" bg-white 
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
                                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                                name="humanName"
                                onChange={props.handleChange}
                                onBlur={props.handleBlur}
                                value={props.values?.humanName}
                                placeholder="Enter human name"
                              />
                            </div>
                            <div className="flex-1 mb-4">
                              <label
                                htmlFor="modelName"
                                className="block text-[#1E1E1E] mb-1 text-base font-normal"
                              >
                                Name for Model:
                              </label>
                              <Field
                                type="text"
                                className=" bg-white 
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
                                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                                name="modelName"
                                onChange={props.handleChange}
                                onBlur={props.handleBlur}
                                value={props.values?.modelName}
                                placeholder="Enter model name"
                              />
                            </div>
                          </div>
                          <div className="flex gap-5 justify-between items-center mt-2">
                            <div className="flex-1 mb-2">
                              <label
                                htmlFor="humanDescription"
                                className="block text-[#1E1E1E] mb-1 text-base font-normal"
                              >
                                Description for Human:
                              </label>
                              <Field
                                as="textarea"
                                rows={2}
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
                                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                                name="humanDescription"
                                onChange={(e) => {
                                  // Check if the new length doesn't exceed the limit
                                  if (e.target.value.length <= HUMAN_DESCRIPTION_LIMIT) {
                                    props.handleChange(e);
                                  }
                                }}
                                onBlur={props.handleBlur}
                                value={props.values?.humanDescription}
                                placeholder="Enter Human Description"
                              />
                              <div className="text-sm mb-4 text-right">
                                <span
                                  className={`${
                                    props.values?.humanDescription?.length >
                                    HUMAN_DESCRIPTION_THRESHOLD
                                      ? 'text-red-500'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {Math.max(
                                    0,
                                    HUMAN_DESCRIPTION_LIMIT -
                                      (props.values?.humanDescription?.length || 0),
                                  )}
                                  /{HUMAN_DESCRIPTION_LIMIT} characters remaining
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 mb-2">
                              <label
                                htmlFor="modelDescription"
                                className="block text-[#1E1E1E] mb-1 text-base font-normal"
                              >
                                Description for Model:
                              </label>
                              <Field
                                as="textarea"
                                rows={2}
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
                                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                                name="modelDescription"
                                onChange={(e) => {
                                  // Check if the new length doesn't exceed the limit
                                  if (e.target.value.length <= MODEL_DESCRIPTION_LIMIT) {
                                    props.handleChange(e);
                                  }
                                }}
                                onBlur={props.handleBlur}
                                value={props.values?.modelDescription}
                                placeholder="Enter Model Description"
                              />
                              <div className="text-sm mb-4 text-right">
                                <span
                                  className={`${
                                    props.values?.modelDescription?.length >
                                    MODEL_DESCRIPTION_THRESHOLD
                                      ? 'text-red-500'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {Math.max(
                                    0,
                                    MODEL_DESCRIPTION_LIMIT -
                                      (props.values?.modelDescription?.length || 0),
                                  )}
                                  /{MODEL_DESCRIPTION_LIMIT} characters remaining
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mb-4">
                            <label
                              htmlFor="logoUrl"
                              className="block text-[#1E1E1E] mb-1 text-base font-normal"
                            >
                              Logo Url:
                            </label>
                            <div className="flex justify-between gap-4 items-center">
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
                                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                                name="logoUrl"
                                placeholder="Enter logoUrl's URL"
                                value={props.values?.logoUrl}
                                onChange={(event) => {
                                  props.setFieldValue('logoUrl', event.target.value);
                                }}
                              />
                              <div
                                className="w-10 h-10 border-solid border-gray-300 rounded-md flex items-center justify-center"
                                style={{
                                  border: '1px solid',
                                }}
                              >
                                {props.values?.logoUrl && validateURL(props.values?.logoUrl) && (
                                  <img
                                    src={props.values.logoUrl}
                                    alt="logoUrl"
                                    className="w-full"
                                  />
                                )}
                              </div>
                            </div>
                            <ErrorMessage
                              name="logoUrl"
                              component="div"
                              className="text-red-500 text-sm"
                            />
                          </div>

                          <div className="flex gap-5 justify-between items-center mb-4">
                            <div className="flex-1">
                              <label
                                htmlFor="contactEmail"
                                className="block text-[#1E1E1E] mb-1 text-base font-normal"
                              >
                                Email:
                              </label>
                              <Field
                                type="text"
                                className=" bg-white 
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
                                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                                name="contactEmail"
                                onChange={props.handleChange}
                                onBlur={props.handleBlur}
                                value={props.values?.contactEmail}
                                placeholder="Enter email"
                              />
                            </div>
                            <div className="flex-1">
                              <label
                                htmlFor="legalInfoUrl"
                                className="block text-[#1E1E1E] mb-1 text-base font-normal"
                              >
                                Legal Info Url:
                              </label>
                              <Field
                                type="text"
                                className=" bg-white 
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
                                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                                name="legalInfoUrl"
                                onChange={props.handleChange}
                                onBlur={props.handleBlur}
                                value={props.values?.legalInfoUrl}
                                placeholder="Enter email"
                              />
                              <ErrorMessage
                                name="legalInfoUrl"
                                component="div"
                                className="text-red-500 text-sm"
                              />
                            </div>
                          </div>

                          <div className="mt-8 flex justify-end w-full">
                            <Button
                              className="w-[100px] h-[48px] rounded-lg"
                              handleClick={() => submitForm(props.values)}
                              label="Save"
                              addIcon={isSubmitting}
                              Icon={<Spinner classes="w-4 h-4 mr-2" />}
                              disabled={isSubmitting}
                              type="submit"
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

export default ChatGptDialog;
