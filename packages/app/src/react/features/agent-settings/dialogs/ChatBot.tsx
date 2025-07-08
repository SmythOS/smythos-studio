import { Dialog, Transition } from '@headlessui/react';
import { ErrorMessage, Field, Form, Formik, FormikProps } from 'formik';
import { Fragment, Suspense, lazy, useEffect, useState } from 'react';

import { saveAgentSettingByKey } from '@react/features/agent-settings/clients';
import {
  CHATBOT_DEFAULT_TEXTS,
  MODEL_DESCRIPTION_LIMIT,
  MODEL_DESCRIPTION_THRESHOLD,
  SETTINGS_KEYS,
  SYNTAX_HIGHLIGHT_THEMES,
} from '@react/features/agent-settings/constants';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { mapBotEmbodimentProperties } from '@react/features/agent-settings/utils';
import {
  ChatIcon,
  CloseIcon,
  ColorPickerIcon,
  ExpandIcon,
  InfoIcon,
  SendIcon,
} from '@react/shared/components/svgs';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { Spinner } from '@react/shared/components/ui/spinner';
import { EMBODIMENT_TYPE } from '@react/shared/enums';
import { extractError } from '@react/shared/utils/errors';
import { validateDomains, validateURL } from '@react/shared/utils/utils';
import { ChatbotEmbodimentData } from '@src/react/shared/types/api-results.types';
import {
  errorToast,
  successToast,
  warningToast,
} from '@src/shared/components/toast';
import { Analytics } from '@src/shared/posthog/services/analytics';
import { LLMRegistry } from '@src/shared/services/LLMRegistry.service';
import classNames from 'classnames';

const CHATGPT_MODELS_V2 = LLMRegistry.getSortedModelsByFeatures('tools').map((model) => ({
  name: model.label,
  value: model.entryId,
  tags: model.tags,
}));

// #region Temporary Badges
const TEMP_BADGES = {
  enterprise: true,
  smythos: true,
  personal: true,
  limited: true,
};

function getTempBadge(tags: string[]) {
  return tags.filter((tag) => TEMP_BADGES?.[tag?.toLowerCase()]).join(' ');
}
// #endregion Temporary Badges

interface IChatBotDialogProps {
  isOpen: boolean;
  closeModal: () => void;
  currentData: any;
  refreshEmbodiments: (agentId: string, embodimentId: string) => void;
  style: any;
  activeAgent: any;
  agentId: string;
}

const ChatBotDialog = ({
  isOpen,
  closeModal,
  currentData,
  refreshEmbodiments,
  style,
  activeAgent,
  agentId,
}: IChatBotDialogProps) => {
  const [activeData, setActiveData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [domainError, setDomainError] = useState(false);
  const [isChatBotFullScreen, setIsChatBotFullScreen] = useState(false);
  const { agentQuery, settingsQuery: agentSettingsQuery, workspace } = useAgentSettingsCtx();

  // Default values to prevent uncontrolled to controlled input warning
  const defaultFormValues = {
    name: '',
    introMessage: '',
    chatGptModel: '',
    syntaxHighlightTheme: SYNTAX_HIGHLIGHT_THEMES.find((m) => m.isDefault)?.name || '',
    personality: '',
    icon: '',
    colors: {
      botBubbleColors: {
        textColor: '',
        backgroundColorStart: '',
        backgroundColorEnd: '',
      },
      humanBubbleColors: {
        textColor: '',
        backgroundColorStart: '',
        backgroundColorEnd: '',
      },
      chatWindowColors: {
        backgroundColor: '',
        headerBackgroundColor: '',
        footerBackgroundColor: '',
      },
      chatTogglerColors: {
        backgroundColor: '',
        textColor: '',
      },
      sendButtonColors: {
        backgroundColor: '',
        textColor: '',
      },
    },
    allowedDomains: [],
    isFullScreen: false,
    allowFileAttachments: false,
  };

  useEffect(() => {
    const properties = currentData?.properties;
    const _activeData = mapBotEmbodimentProperties(properties, activeAgent);

    setActiveData(_activeData);
    setIsChatBotFullScreen(_activeData?.isFullScreen || false);
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
        type: EMBODIMENT_TYPE.CHAT_BOT,
        properties: {
          ...data,
          isFullScreen: isChatBotFullScreen,
          allowedDomains: data?.allowedDomains
            ?.filter((domain) => domain && domain.trim() !== '')
            ?.map((item) => item.trim()),
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

      if (data?.introMessage) {
        saveAgentSettingByKey(SETTINGS_KEYS.introMessage, data.introMessage, agentId);
      }
      fetch('/api/page/agents/embodiment', requestOptions)
        .then((response) => {
          response.json().then((data) => {
            refreshEmbodiments(agentId, currentData?.id);
            successToast('Embodiment saved');
            closeModal();
          });
        })
        .catch((error) => {
          errorToast(extractError(error) || 'Embodiment not saved. Please try again.');
          console.log(error);
        })
        .finally(() => {
          setIsSubmitting(false); // Reset the flag after submission is complete
        });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const SyntaxHighlighter = lazy(() => import('react-syntax-highlighter/dist/esm/prism'));
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
              <div
                style={{
                  height: '87.5vh',
                  width: '50vw',
                  maxWidth: '900px',
                }}
              >
                <Dialog.Panel className="w-full relative transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-bold text-center leading-6 text-gray-900 "
                  >
                    Chatbot Configurations
                  </Dialog.Title>
                  <Formik
                    initialValues={activeData || defaultFormValues}
                    enableReinitialize={true}
                    // validate={(values) => validateForm(values)}
                    onSubmit={(values) => {
                      submitForm(values);
                    }}
                  >
                    {(props: FormikProps<ChatbotEmbodimentData>) => {
                      const colors = props.values?.colors;
                      return (
                        <Form>
                          <div
                            className="flex justify-between"
                            style={{
                              gap: '2rem',
                            }}
                          >
                            <div className="w-1/2 mt-5">
                              <div>
                                <label
                                  htmlFor="name"
                                  className="block text-gray-700 mb-1 text-sm font-normal"
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
                                  placeholder="Enter chatbot name"
                                  disabled={true}
                                />
                                <ErrorMessage
                                  name="name"
                                  component="div"
                                  className="text-red-500 text-sm"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor="introMessage"
                                  className="block text-gray-700 mb-1 text-sm font-normal"
                                >
                                  Intro Message
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
                                  name="introMessage"
                                  id="introMessage"
                                  onChange={props.handleChange}
                                  onBlur={props.handleBlur}
                                  value={props.values?.introMessage}
                                  placeholder="Enter intro message"
                                />
                                <ErrorMessage
                                  name="introMessage"
                                  component="div"
                                  className="text-red-500 text-sm"
                                />
                              </div>
                              {/* <div>
                                <label
                                  htmlFor="chatGptModel"
                                  className="block text-gray-700 mb-1 text-sm font-normal"
                                >
                                  GPT Model
                                </label>
                                <Field
                                  type="text"
                                  as="select"
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
                                  name="chatGptModel"
                                  id="chatGptModel"
                                  onChange={props.handleChange}
                                  onBlur={props.handleBlur}
                                  value={
                                    Object.values(CHATGPT_MODELS_V2)
                                      .filter((model) => {
                                        let badge = getTempBadge(model.tags);
                                        badge = badge ? ' (' + badge + ')' : '';

                                        return model.name === props.values?.chatGptModel;
                                      })
                                      .map((model) => {
                                        let badge = getTempBadge(model.tags);
                                        badge = badge ? ' (' + badge + ')' : '';

                                        return model.name + badge;
                                      })[0] || ''
                                  }
                                  placeholder="Select GPT Model in Agent Settings"
                                  disabled={true}
                                >
                                </Field>

                                <ErrorMessage
                                  name="chatGptModel"
                                  component="div"
                                  className="text-red-500 text-sm"
                                />
                              </div> */}
                              <div>
                                <label
                                  htmlFor="personality"
                                  className="block text-gray-700 mb-1 text-sm font-normal"
                                >
                                  Personality
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
                                  mb-4
                                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                                  name="personality"
                                  id="personality"
                                  onChange={(e) => {
                                    // Check if the new length doesn't exceed the limit
                                    if (e.target.value.length <= MODEL_DESCRIPTION_LIMIT) {
                                      props.handleChange(e);
                                    }
                                  }}
                                  onBlur={props.handleBlur}
                                  value={props.values?.personality}
                                  placeholder="Enter chatbot personality"
                                />
                                <div className="text-sm mb-4 text-right">
                                  <span
                                    className={`${
                                      props.values?.personality?.length >
                                      MODEL_DESCRIPTION_THRESHOLD
                                        ? 'text-red-500'
                                        : 'text-gray-500'
                                    }`}
                                  >
                                    {Math.max(
                                      0,
                                      MODEL_DESCRIPTION_LIMIT -
                                        (props.values?.personality?.length || 0),
                                    )}
                                    /{MODEL_DESCRIPTION_LIMIT} characters remaining
                                  </span>
                                </div>
                                <ErrorMessage
                                  name="personality"
                                  component="div"
                                  className="text-red-500 text-sm"
                                />
                              </div>
                              {/* ALLOWED DOMAINS START */}
                              <div>
                                <label
                                  htmlFor="allowedDomains"
                                  className="block text-gray-700 mb-1 text-sm font-normal"
                                >
                                  Allowed Domains{' '}
                                  <InfoIcon data-tooltip-target="tooltip-no-arrow" />
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
                                  value={Array.isArray(props.values?.allowedDomains) ? props.values.allowedDomains.join(',') : (props.values?.allowedDomains || '')}
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
                                      One or more domains are invalid. Make sure there is no
                                      trailing comma.
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

                              <div className="mb-4">
                                <label
                                  htmlFor="icon"
                                  className="block text-gray-700 mb-1 text-sm font-normal"
                                >
                                  Icon
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
                                  mb-4
                                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                                    name="icon"
                                    placeholder="Enter icon's URL"
                                    value={props.values?.icon}
                                    onChange={(event) => {
                                      props.setFieldValue('icon', event.target.value);
                                    }}
                                  />
                                  {props.values?.icon && validateURL(props.values?.icon) && (
                                    <div className="w-10 h-[38px] border-solid border-gray-300 rounded-md flex items-center justify-center overflow-hidden">
                                      <img src={props.values.icon} alt="icon" className="w-full" />
                                    </div>
                                  )}
                                </div>
                                <ErrorMessage
                                  name="icon"
                                  component="div"
                                  className="text-red-500 text-sm"
                                />
                              </div>
                              <div className="mb-4">
                                <label className="block text-gray-700 mb-1 text-sm font-normal">
                                  Code Syntax Highlight Theme
                                </label>
                                <Field
                                  type="text"
                                  as="select"
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
                                  name="syntaxHighlightTheme"
                                  id="syntaxHighlightTheme"
                                  onChange={props.handleChange}
                                  onBlur={props.handleBlur}
                                  value={props.values?.syntaxHighlightTheme}
                                  placeholder="Enter intro message"
                                >
                                  {SYNTAX_HIGHLIGHT_THEMES.map((theme) => (
                                    <option key={theme.name} value={theme.name}>
                                      {theme.name}
                                    </option>
                                  ))}
                                </Field>

                                <ErrorMessage
                                  name="syntaxHighlightTheme"
                                  component="div"
                                  className="text-red-500 text-sm"
                                />
                              </div>
                              <div>
                                <div className="flex items-center mb-4">
                                  <div className="relative flex items-center">
                                    <Field
                                      type="checkbox"
                                      id="fullScreenChatBot"
                                      name="fullScreenChatBot"
                                      className="w-4 h-4 text-secondary bg-gray-100 border-gray-300 rounded peer appearance-none focus:outline-none box-shadow-none"
                                      checked={isChatBotFullScreen}
                                      onChange={(e) => {
                                        setIsChatBotFullScreen(e.target.checked);
                                        if (e.target.checked) {
                                          Analytics.track('app_chatbot_message_view_enabled', {
                                            description:
                                              'Event is triggered when the message view checkbox in chatbot configurations is ticked',
                                          });
                                        }
                                      }}
                                    />
                                    <svg
                                      className="absolute w-4 h-4 pointer-events-none hidden peer-checked:block top-0 left-0 text-secondary"
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  </div>
                                  <label
                                    htmlFor="fullScreenChatBot"
                                    className="ml-2 text-sm font-medium text-gray-900"
                                  >
                                    Message View
                                  </label>
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center mb-4">
                                  <div className="relative flex items-center">
                                    <Field
                                      type="checkbox"
                                      id="allowFileAttachments"
                                      name="allowFileAttachments"
                                      className="w-4 h-4 text-secondary bg-gray-100 border-gray-300 rounded peer appearance-none focus:outline-none box-shadow-none"
                                      checked={props.values?.allowFileAttachments || false}
                                      onChange={(e) => {
                                        props.setFieldValue(
                                          'allowFileAttachments',
                                          e.target.checked,
                                        );
                                      }}
                                    />
                                    <svg
                                      className="absolute w-4 h-4 pointer-events-none hidden peer-checked:block top-0 left-0 text-secondary"
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  </div>
                                  <label
                                    htmlFor="allowFileAttachments"
                                    className="ml-2 text-sm font-medium text-gray-900"
                                  >
                                    Allow file attachments
                                  </label>
                                </div>
                              </div>
                            </div>
                            <div className="w-1/2 mt-5">
                              <div
                                style={{
                                  margin: 'auto',
                                }}
                              >
                                <div
                                  className="flex items-center p-2 mb-2 text-sm text-gray-800 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
                                  role="alert"
                                >
                                  <InfoIcon />
                                  <span className="sr-only">Info</span>
                                  <div className="text-sm">
                                    Click on the color picker to change the style.
                                  </div>
                                </div>
                                <div className="shadow-md shadow-slate-400 rounded-md">
                                  {/* Chatbot Header */}
                                  <div
                                    id="chatbot-header"
                                    className={classNames(
                                      'px-4 flex justify-between items-center transition-all duration-300 overflow-hidden',
                                      {
                                        'h-0 py-0 ': isChatBotFullScreen,
                                        'h-10 py-2 border-solid border-b border-gray-300':
                                          !isChatBotFullScreen,
                                      },
                                    )}
                                    style={{
                                      backgroundColor:
                                        colors?.chatWindowColors?.headerBackgroundColor,
                                    }}
                                  >
                                    <img
                                      src={props.values?.icon || '/img/smythos-logo.png'}
                                      alt="logo"
                                      width={40}
                                      height={40}
                                      onError={(e: any) => {
                                        e.target.classList.toggle('opacity-0');
                                      }}
                                      onLoad={(e: any) => {
                                        e.target.classList.toggle('opacity-0');
                                      }}
                                      className={`object-contain ${
                                        props.values?.icon && !validateURL(props.values?.icon)
                                          ? 'opacity-0'
                                          : 'opacity-100'
                                      }`}
                                    />
                                    <div className="color-picker-wrapper rounded-full p-[3px] bg-white border border-solid border-gray-300 clear-both">
                                      <ColorPickerIcon />
                                      <Field
                                        type="color"
                                        name="colors.chatWindowColors.headerBackgroundColor"
                                        id="colors.chatWindowColors.headerBackgroundColor"
                                        {...props.getFieldProps(
                                          'colors.chatWindowColors.headerBackgroundColor',
                                        )}
                                        className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.chatWindowColors?.headerBackgroundColor}`}
                                        data-coloris={
                                          colors?.chatWindowColors?.headerBackgroundColor
                                        }
                                      />
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <ExpandIcon />
                                      <CloseIcon />
                                    </div>
                                  </div>
                                  {/* Chatbot Body */}
                                  <div
                                    className="chatbot-container relative group/bg cursor-pointer"
                                    style={{
                                      backgroundColor: colors?.chatWindowColors?.backgroundColor,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        gap: '5px',
                                        alignItems: 'center',
                                        clear: 'both',
                                      }}
                                      className="mb-5 mt-3"
                                    >
                                      <div
                                        className="chatbot-message relative group cursor-pointer"
                                        style={{
                                          backgroundColor:
                                            colors?.botBubbleColors?.backgroundColorStart,
                                          background: `linear-gradient(45deg, ${colors?.botBubbleColors?.backgroundColorStart}, ${colors?.botBubbleColors?.backgroundColorEnd})`,
                                        }}
                                      >
                                        <p
                                          style={{
                                            color: colors?.botBubbleColors?.textColor,
                                          }}
                                        >
                                          {props.values?.introMessage ||
                                            CHATBOT_DEFAULT_TEXTS.systemMessage}
                                        </p>
                                        {/* GRADIENT START SYSTEM MESSAGE */}

                                        <div className="color-picker-wrapper rounded-full p-[3px] bg-white border border-solid border-gray-300 clear-both absolute top-[-10px] left-[-5px]">
                                          <ColorPickerIcon />
                                          <Field
                                            type="color"
                                            name="colors.botBubbleColors.backgroundColorStart"
                                            id="botBubbleBackgroundColorStart"
                                            {...props.getFieldProps(
                                              'colors.botBubbleColors.backgroundColorStart',
                                            )}
                                            className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.botBubbleColors?.backgroundColorStart}`}
                                            data-coloris={
                                              colors?.botBubbleColors?.backgroundColorStart
                                            }
                                          />
                                        </div>

                                        {/* GRADIENT END SYSTEM MESSAGE */}
                                        <div className="color-picker-wrapper rounded-full p-[3px] bg-white border border-solid border-gray-300 clear-both absolute bottom-[-5px] right-[-5px]">
                                          <ColorPickerIcon />
                                          <Field
                                            type="color"
                                            name="colors.botBubbleColors.backgroundColorEnd"
                                            id="botBubbleBackgroundColorEnd"
                                            {...props.getFieldProps(
                                              'colors.botBubbleColors.backgroundColorEnd',
                                            )}
                                            className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.botBubbleColors?.backgroundColorEnd}`}
                                            data-coloris={
                                              colors?.botBubbleColors?.backgroundColorEnd
                                            }
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <span
                                          style={{
                                            fontFamily: 'Times New Roman',
                                            fontWeight: '500',
                                            fontSize: '16px',
                                            textDecoration: 'underline',
                                          }}
                                        >
                                          T
                                        </span>
                                        <Field
                                          type="color"
                                          name="colors.botBubbleColors.textColor"
                                          id="botTextColor"
                                          {...props.getFieldProps(
                                            'colors.botBubbleColors.textColor',
                                          )}
                                          className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.botBubbleColors?.textColor}`}
                                          data-coloris={colors?.botBubbleColors?.textColor}
                                        />
                                      </div>
                                    </div>
                                    {/* USER MESSAGE  */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        gap: '5px',
                                        alignItems: 'center',
                                        clear: 'both',
                                        flexDirection: 'row-reverse',
                                      }}
                                      className="mb-5"
                                    >
                                      <div
                                        className="user-message relative group cursor-pointer"
                                        style={{
                                          backgroundColor:
                                            colors?.humanBubbleColors?.backgroundColorStart,
                                          background: `linear-gradient(45deg, ${colors?.humanBubbleColors?.backgroundColorStart}, ${colors?.humanBubbleColors?.backgroundColorEnd})`,
                                        }}
                                      >
                                        <p style={{ color: colors?.humanBubbleColors?.textColor }}>
                                          {CHATBOT_DEFAULT_TEXTS.userMessage}
                                        </p>
                                        {/* GRADIENT START */}
                                        <div
                                          className="color-picker-wrapper rounded-full p-[3px] bg-white border border-solid border-gray-300 clear-both absolute top-[-10px] left-[-5px]
                                                                                    "
                                          style={{
                                            position: 'absolute',
                                            top: '-10px',
                                            left: '-5px',
                                            borderRadius: '50%',
                                            border: '1px solid #ccc',
                                            backgroundColor: '#fff',
                                            padding: '4px',
                                          }}
                                        >
                                          <ColorPickerIcon />
                                          <Field
                                            type="color"
                                            name="colors.humanBubbleColors.backgroundColorStart"
                                            id="humanBubbleBackgroundColorStart"
                                            {...props.getFieldProps(
                                              'colors.humanBubbleColors.backgroundColorStart',
                                            )}
                                            className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.humanBubbleColors?.backgroundColorStart}`}
                                            data-coloris={
                                              colors?.humanBubbleColors?.backgroundColorStart
                                            }
                                          />
                                        </div>

                                        {/* GRADIENT END */}
                                        <div className="color-picker-wrapper rounded-full p-[3px] bg-white border border-solid border-gray-300 clear-both absolute bottom-[-5px] right-[-5px]">
                                          <ColorPickerIcon />
                                          <Field
                                            type="color"
                                            name="colors.humanBubbleColors.backgroundColorEnd"
                                            id="humanBubbleBackgroundColorEnd"
                                            {...props.getFieldProps(
                                              'colors.humanBubbleColors.backgroundColorEnd',
                                            )}
                                            className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.humanBubbleColors?.backgroundColorEnd}`}
                                            data-coloris={
                                              colors?.humanBubbleColors?.backgroundColorEnd
                                            }
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <span
                                          style={{
                                            fontFamily: 'Times New Roman',
                                            fontWeight: '500',
                                            fontSize: '16px',
                                            textDecoration: 'underline',
                                          }}
                                        >
                                          T
                                        </span>
                                        <Field
                                          type="color"
                                          name="colors.humanBubbleColors.textColor"
                                          id="humanTextColor"
                                          {...props.getFieldProps(
                                            'colors.humanBubbleColors.textColor',
                                          )}
                                          className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.humanBubbleColors?.textColor}`}
                                          data-coloris={colors?.humanBubbleColors?.textColor}
                                        />
                                      </div>
                                    </div>

                                    <div className="w-3/4 mb-5">
                                      <Suspense fallback={<div>Loading...</div>}>
                                        <SyntaxHighlighter
                                          language="javascript"
                                          style={
                                            SYNTAX_HIGHLIGHT_THEMES.find(
                                              (theme) =>
                                                theme.name ===
                                                  props?.values?.syntaxHighlightTheme && true,
                                            )?.value ||
                                            SYNTAX_HIGHLIGHT_THEMES.find((theme) => theme.isDefault)
                                              .name
                                          }
                                        >
                                          {CHATBOT_DEFAULT_TEXTS.functionText}
                                        </SyntaxHighlighter>
                                      </Suspense>
                                    </div>
                                    <div
                                      style={{
                                        display: 'flex',
                                        gap: '5px',
                                        alignItems: 'center',
                                        clear: 'both',
                                        flexDirection: 'row-reverse',
                                      }}
                                      className="mb-5"
                                    >
                                      <div
                                        className="user-message relative group cursor-pointer"
                                        style={{
                                          backgroundColor:
                                            colors?.humanBubbleColors?.backgroundColorStart,
                                          background: `linear-gradient(45deg, ${colors?.humanBubbleColors?.backgroundColorStart}, ${colors?.humanBubbleColors?.backgroundColorEnd})`,
                                        }}
                                      >
                                        <p style={{ color: colors?.humanBubbleColors?.textColor }}>
                                          {CHATBOT_DEFAULT_TEXTS.userMessageReply}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Text Input Field */}
                                  <div
                                    className="p-4 border-solid border-t border-gray-300"
                                    style={{
                                      backgroundColor:
                                        colors?.chatWindowColors?.footerBackgroundColor,
                                    }}
                                  >
                                    <div className="flex justify-between gap-4 items-center border border-solid border-gray-300 rounded-md py-1 px-2">
                                      <input
                                        type="text"
                                        id="input-group-1"
                                        readOnly
                                        className=" bg-transparent border-none  text-gray-900 text-sm rounded-lg focus:ring-white focus:border-white block w-full pr-10 p-2.5  dark:bg-gray-700 dark:border-none dark:placeholder-gray-400 dark:text-white dark:focus:ring-current dark:focus:border-none"
                                        placeholder="Type a message..."
                                      />
                                      <div
                                        className="w-11 h-9 border-solid border-gray-300 rounded-md flex items-center justify-center"
                                        style={{
                                          border: '1px solid',
                                          backgroundColor:
                                            colors?.sendButtonColors?.backgroundColor,
                                        }}
                                      >
                                        <SendIcon color={colors?.sendButtonColors?.textColor} />

                                        <div className="color-picker-wrapper rounded-full p-[2px] bg-white border border-solid border-gray-300 clear-both absolute top-[-8px] right-[-6px]">
                                          <ColorPickerIcon width="8px" height="8px" />
                                          <Field
                                            type="color"
                                            name="colors.sendButtonColors.backgroundColor"
                                            id="sendButtonBackgroundColor"
                                            {...props.getFieldProps(
                                              'colors.sendButtonColors.backgroundColor',
                                            )}
                                            className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.sendButtonColors?.backgroundColor}`}
                                            data-coloris={colors?.sendButtonColors?.backgroundColor}
                                          />
                                        </div>

                                        <div className="color-picker-wrapper rounded-full p-[2px] bg-white border border-solid border-gray-300 clear-both absolute bottom-[-4px] right-[-6px]">
                                          <ColorPickerIcon width="8px" height="8px" />
                                          <Field
                                            type="color"
                                            name="colors.sendButtonColors.textColor"
                                            id="sendButtonTextColor"
                                            {...props.getFieldProps(
                                              'colors.sendButtonColors.textColor',
                                            )}
                                            className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.sendButtonColors?.textColor}`}
                                            data-coloris={colors?.sendButtonColors?.textColor}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="color-picker-wrapper rounded-full p-[3px] bg-white border border-solid border-gray-300 clear-both absolute bottom-[0] left-1/2">
                                      <ColorPickerIcon />
                                      <Field
                                        type="color"
                                        name="colors.chatWindowColors.footerBackgroundColor"
                                        id="chatFooterBackgroundColor"
                                        {...props.getFieldProps(
                                          'colors.chatWindowColors.footerBackgroundColor',
                                        )}
                                        className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.chatWindowColors?.footerBackgroundColor}`}
                                        data-coloris={
                                          colors?.chatWindowColors?.footerBackgroundColor
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                                {/* Chat Toggle Icon Start */}
                                <div
                                  className={classNames(
                                    'flex justify-end items-center gap-4 group transition-all duration-300 overflow-hidden',
                                    {
                                      'h-0 ': isChatBotFullScreen,
                                      'h-16': !isChatBotFullScreen,
                                    },
                                  )}
                                >
                                  <div
                                    className="h-[50px] w-[50px] rounded-full my-[12px] shadow-md shadow-slate-400 relative group cursor-pointer flex justify-center items-center"
                                    style={{
                                      backgroundColor: colors?.chatTogglerColors?.backgroundColor,
                                    }}
                                  >
                                    <ChatIcon color={colors?.chatTogglerColors?.textColor} />
                                  </div>

                                  <div className="color-picker-wrapper rounded-full p-[3px] bg-white border border-solid border-gray-300 clear-both absolute top-[12px] right-[-2px]">
                                    <ColorPickerIcon width="8px" height="8px" />
                                    <Field
                                      type="color"
                                      name="colors.chatTogglerColors.backgroundColor"
                                      id="chatTogglerColor"
                                      {...props.getFieldProps(
                                        'colors.chatTogglerColors.backgroundColor',
                                      )}
                                      className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.chatTogglerColors?.backgroundColor}`}
                                      data-coloris={colors?.chatTogglerColors?.backgroundColor}
                                    />
                                  </div>
                                  <div className="color-picker-wrapper rounded-full p-[3px] bg-white border border-solid border-gray-300 clear-both absolute bottom-[8px] right-[-2px]">
                                    <ColorPickerIcon width="8px" height="8px" />
                                    <Field
                                      type="color"
                                      name="colors.chatTogglerColors.textColor"
                                      id="chatTogglerColors"
                                      {...props.getFieldProps('colors.chatTogglerColors.textColor')}
                                      className={`w-full h-full rounded-md text-sm absolute inset-0 opacity-0 z-10  cursor-pointer ${colors?.chatTogglerColors?.textColor}`}
                                      data-coloris={colors?.chatTogglerColors?.textColor}
                                    />
                                  </div>
                                </div>
                                {/* Chat Toggle Icon End */}
                              </div>
                              <div></div>
                            </div>
                          </div>
                          <div className="flex gap-5">
                            <Button
                              variant="primary"
                              handleClick={() => submitForm(props.values)}
                              label="Save Configurations"
                              addIcon={isSubmitting}
                              Icon={<Spinner classes="w-4 h-4 mr-2" />}
                              disabled={isSubmitting}
                              type="submit"
                            />

                            <Button
                              variant="secondary"
                              handleClick={() => closeModal()}
                              label="Cancel"
                              disabled={isSubmitting}
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

export default ChatBotDialog;
