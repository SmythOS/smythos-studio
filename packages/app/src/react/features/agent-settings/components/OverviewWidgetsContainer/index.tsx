import { saveAgentSettingByKey } from '@react/features/agent-settings/clients';
import { AgentInfoWidget, SettingsWidget } from '@react/features/agent-settings/components';
import { SETTINGS_KEYS } from '@react/features/agent-settings/constants';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import * as agentSettingsUtils from '@react/features/agents/utils';
import { errKeys } from '@react/shared/constants';
import { EMBODIMENT_TYPE } from '@react/shared/enums';
import { Agent } from '@react/shared/types/agent-data.types';
import { Embodiment } from '@react/shared/types/api-results.types';
import { LLMFormController } from '@src/frontend/helpers/LLMFormController.helper';
import { errorToast } from '@src/shared/components/toast';
import { EVENTS } from '@src/shared/posthog/constants/events';
import { PostHog } from '@src/shared/posthog/index';
import { LLMRegistry } from '@src/shared/services/LLMRegistry.service';
import { llmModelsStore } from '@src/shared/state_stores/llm-models';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { pick } from 'lodash-es';
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Yup from 'yup';

// Create the context type
interface WidgetsContextType {
  formik: ReturnType<typeof useFormik>;
  isWriteAccess: boolean;
  isLoading: {
    agent: boolean;
    settings: boolean;
    embodiments: boolean;
    llmModels: boolean;
  };
  models: Array<{
    label: string;
    value: string;
    tags: string[];
  }>;
  modal: {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    handleClose: () => void;
  };
  postHogEvent: {
    app_LLM_selected: string | null;
    setPostHogEvent: Dispatch<SetStateAction<{ app_LLM_selected: string | null }>>;
  };
  isSaving: boolean;
}

// Create the context with a default value
const WidgetsContext = createContext<WidgetsContextType | undefined>(undefined);

// Create a custom hook for using the context
export const useWidgetsContext = () => {
  const context = useContext(WidgetsContext);
  if (!context) {
    throw new Error('useWidgetsContext must be used within a WidgetsContextProvider');
  }
  return context;
};

interface FormValues {
  chatGptModel?: string;
  behavior?: string;
  // introMessage?: string;
  name?: string;
  shortDescription?: string;
}

const OverviewWidgetsContainer = ({ isWriteAccess }: { isWriteAccess: boolean }) => {
  const queryClient = useQueryClient();
  const { agentQuery, agentId, settingsQuery, workspace } = useAgentSettingsCtx();

  const [postHogEvent, setPostHogEvent] = useState({ app_LLM_selected: null });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLLMModelsLoading, setIsLLMModelsLoading] = useState<boolean>(true);
  const [llmModels, setLlmModels] = useState<
    Array<{
      label: string;
      value: string;
      tags: string[];
    }>
  >([]);
  const [defaultModel, setDefaultModel] = useState<string>('');

  // Memoized validation schema that uses dynamic models
  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string()
          .max(50, 'Name must be less than 50 characters')
          .required('Please enter a name'),
        shortDescription: Yup.string()
          .max(250, 'Description must be less than 200 characters')
          .optional(),
        chatGptModel: Yup.string()
          .required('Please select a model')
          .oneOf(
            // Use dynamic models with fallback to static models
            llmModels.map((model) => model.value),
            'Invalid model',
          ),
        behavior: Yup.string().optional(),
        // introMessage: Yup.string()
        //   .required('Intro Message is required')
        //   .max(190, 'Intro Message cannot exceed 190 characters'),
      }),
    [llmModels], // Only recreate when models change
  );

  // Initialize LLM models store on component mount
  useEffect(() => {
    llmModelsStore
      .getState()
      .init()
      .finally(() => {
        const llmModels: {
          label: string;
          value: string;
          tags: string[];
          default?: boolean;
        }[] = LLMRegistry.getSortedModelsByFeatures('tools').map((model) => ({
          label: model.label,
          value: model.entryId,
          tags: model.tags,
          default: model?.default || false,
        }));

        // set the default model
        const defaultModel = LLMFormController.getDefaultModel(llmModels);
        setDefaultModel(defaultModel);

        // Prepend a blank option to display 'Select a model' by default if a custom model is removed or modified
        llmModels.unshift({ label: 'Select a model', value: '', tags: [] });

        setLlmModels(llmModels);

        setIsLLMModelsLoading(false);
      });
  }, []); // Empty dependency array means this runs once on mount

  //* we deprecated the agent embodiments settings and instead we are using the agent settings
  // for backward compatibility we will show the agent embodiment settings in case the agent settings are not available (empty)
  const agentEmbodiments = useQuery({
    queryKey: ['agent_embodiments', agentId],
    queryFn: () =>
      fetch(`/api/page/agent_settings/embodiments/${agentId}`).then(
        (res) => res.json() as Promise<{ embodiments: Embodiment[] }>,
      ),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const chatbotEmbodiment = useMemo(() => {
    if (!agentEmbodiments.data) return null;
    const chatbotEmbodiment = agentEmbodiments.data.embodiments.find(
      (embodiment: { type: string }) => embodiment.type === EMBODIMENT_TYPE.CHAT_BOT,
    );

    return chatbotEmbodiment;
  }, [agentEmbodiments.data]);

  const initialValues: FormValues = useMemo(() => {
    return {
      chatGptModel:
        settingsQuery.data?.settings?.chatGptModel ||
        chatbotEmbodiment?.properties?.chatGptModel ||
        defaultModel,
      behavior: workspace ? workspace.agent.data.behavior : agentQuery.data?.data?.behavior || '',
      // introMessage:
      //   workspace?.agent?.data?.introMessage ||
      //   settingsQuery.data?.settings?.introMessage ||
      //   chatbotEmbodiment?.properties?.introMessage ||
      //   `Hi, I'm ${agentQuery.data?.name || 'an AI Agent'}. How can I help you today?`,
      name: agentQuery.data?.name || '',
      shortDescription: agentQuery.data?.data?.shortDescription || '',
    };
  }, [chatbotEmbodiment, settingsQuery.data, agentQuery.data, workspace, defaultModel]);

  const formik = useFormik({
    initialValues: initialValues,
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setIsSaving(true);

      await handleSave();

      setSubmitting(false);
      setIsSaving(false);
    },
    enableReinitialize: true,
  });

  function handleWorkSpaceChange() {
    if (workspace?.agent?.data) {
      // Immediately update form with workspace values
      formik.resetForm({
        values: {
          chatGptModel: formik.values.chatGptModel, // Keep existing model
          behavior: workspace.agent.data.behavior,
          // introMessage: workspace.agent.data.introMessage,
          name: workspace.agent.name,
          shortDescription: workspace.agent.data.shortDescription,
        },
      });

      // Then refetch settings for completeness
      settingsQuery.refetch().then((values) => {
        if (values?.data?.settings?.chatGptModel) {
          formik.setFieldValue('chatGptModel', values.data.settings.chatGptModel);
        }
      });
    }
  }

  /**
   * Resets all modified fields (name and description) to their original values.
   */
  const handleResetAll = (): void => {
    formik.setFieldValue('name', agentQuery.data?.name || '');
    formik.setFieldValue('shortDescription', agentQuery.data?.data?.shortDescription || '');

    formik.setFieldValue(
      'chatGptModel',
      settingsQuery.data?.settings?.chatGptModel ||
        chatbotEmbodiment?.properties?.chatGptModel ||
        defaultModel,
    );
    formik.setFieldValue('behavior', agentQuery.data?.data?.behavior || '');
  };

  async function handleSave(): Promise<void> {
    const hasError = false;

    // Show toast if there are errors in global variables widget.
    if (hasError) {
      errorToast('Error! please check your variables.');
      return;
    }

    if (agentQuery.isLoading || !agentQuery.isSuccess || !agentQuery.data || !agentQuery.data.data)
      return;

    // TODO: uncomment this when intro message is implemented
    // if (formik.initialValues.introMessage !== values.introMessage) {
    //   promises.push(
    //     saveAgentSettingByKey(SETTINGS_KEYS.introMessage, values.introMessage, agentId).catch((e) => {
    //       toast('Failed to save intro message', 'Error', 'alert');
    //     failedFields.push(SETTINGS_KEYS.introMessage);
    //   }),
    // );

    // if (workspace) {
    //   try {
    //     workspace.agent.data.introMessage = values.introMessage;
    //     // workspace.agent.introMessage = values.introMessage;
    //     const data = await workspace.export();
    //     await workspace.saveAgent(workspace.agent.name, null, data, workspace.agent.id);
    //   } catch (e) {
    //     toast('Failed to update workspace with intro message', 'Error', 'alert');
    //       failedFields.push(SETTINGS_KEYS.introMessage);
    //     }
    //   }
    // }

    let lockId = null;
    const promises = [];
    const failedFields = [];

    const nameChanged: boolean = formik.values.name.trim() !== agentQuery.data?.name;
    const descriptionChanged: boolean =
      formik.values.shortDescription.trim() !== agentQuery.data?.data?.shortDescription;

    const chatGptModelChanged: boolean =
      formik.initialValues.chatGptModel !== formik.values.chatGptModel;
    const behaviorChanged: boolean = formik.initialValues.behavior !== formik.values.behavior;

    if (chatGptModelChanged) {
      promises.push(
        saveAgentSettingByKey(
          SETTINGS_KEYS.chatGptModel,
          formik.values.chatGptModel,
          agentId,
        ).catch((e) => {
          errorToast('Failed to save model');
          failedFields.push(SETTINGS_KEYS.chatGptModel);
        }),
      );
    }

    try {
      if (workspace) {
        // Only update changed fields in workspace
        if (nameChanged) {
          workspace.agent.name = formik.values.name.trim();
        }
        if (descriptionChanged) {
          workspace.agent.data.shortDescription = formik.values.shortDescription.trim();
        }

        if (behaviorChanged) {
          workspace.agent.data.behavior = formik.values.behavior;
        }

        if (nameChanged || descriptionChanged || behaviorChanged) {
          const data = await workspace.export();
          const id = workspace.agent.id || agentId;

          promises.push(workspace.saveAgent(formik.values.name.trim(), null, data, id));
        }
      } else {
        const lockResponse = await agentSettingsUtils.accquireLock(agentId);
        lockId = lockResponse.lockId;

        const updatedData = {
          ...agentQuery.data,
          id: agentId,
          lockId,
        };

        // Only include changed fields in the update
        if (nameChanged) {
          updatedData.name = formik.values.name.trim();
        }

        if (descriptionChanged) {
          updatedData.data = {
            ...agentQuery.data?.data,
            shortDescription: formik.values.shortDescription?.trim(),
          };
        }

        if (behaviorChanged) {
          updatedData.data = {
            ...agentQuery.data?.data,
            behavior: formik.values.behavior,
          };
        }

        if (nameChanged || descriptionChanged || behaviorChanged) {
          promises.push(
            fetch('/api/agent', {
              method: 'POST',
              body: JSON.stringify(updatedData),
              headers: {
                'Content-Type': 'application/json',
              },
            }),
          );
        }
      }

      await Promise.all(promises);

      if (postHogEvent.app_LLM_selected) {
        await PostHog.track(EVENTS.AGENT_SETTINGS_EVENTS.app_LLM_selected, {
          model: formik.values.chatGptModel,
        });
        setPostHogEvent((prev) => ({ ...prev, app_LLM_selected: null }));
      }

      updateAgentSettingsCache(formik.values.chatGptModel);
      updateAgentDataSettingsCache();

      formik.resetForm({
        values: { ...formik.values, ...pick(formik.initialValues, failedFields) },
      });
    } catch (error) {
      console.error('Error in save operation:', error);

      if (error?.errKey == errKeys.AGENT_LOCK_FAIL) {
        errorToast(
          'Failed to update agent behavior as the agent is being edited by another user. Please try again later.',
        );
      } else {
        errorToast('Failed to save settings');
      }
    } finally {
      if (lockId) {
        await agentSettingsUtils.releaseLock(agentId, lockId).catch((e) => console.error(e));
      }
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  function updateAgentDataSettingsCache(): void {
    queryClient.setQueryData(['agent_data_settings'], (oldData: Agent) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        name: formik.values.name.trim(),
        data: {
          ...(oldData.data || {}),
          shortDescription: formik.values.shortDescription.trim(),
        },
      };
    });
  }

  const updateAgentSettingsCache = (model: string) => {
    queryClient.setQueryData(['agent_settings', agentId], (oldData: any) => {
      return {
        ...oldData,
        settings: {
          ...oldData.settings,
          chatGptModel: model,
        },
      };
    });
  };

  useEffect(() => {
    if (workspace) {
      workspace.on('AgentSaved', handleWorkSpaceChange);

      // Cleanup subscription on unmount
      return () => {
        workspace.off('AgentSaved', handleWorkSpaceChange);
      };
    }
  }, [workspace]);

  useEffect(
    function migration() {
      // MIGRATION: if agent settings "chatGptModel" is not set,
      //  and the agent embodiment has a "chatGptModel" property == "gpt-4", set the agent settings "chatGptModel" to gpt-4o-mini
      // THIS SHOULD ONLY HAPPEN ONCE
      if (!settingsQuery.data || !agentEmbodiments?.data) return;

      const agentSettings = settingsQuery.data.settings;
      if (
        agentSettings?.chatGptModel ||
        (chatbotEmbodiment?.properties?.chatGptModel &&
          chatbotEmbodiment?.properties?.chatGptModel !==
            llmModels.find((m) => m.value === 'gpt-4')?.value)
      )
        return;

      async function migrate() {
        await saveAgentSettingByKey(SETTINGS_KEYS.chatGptModel, defaultModel, agentId);
        // then update the agent settings query (local cache)
        queryClient.setQueryData(['agent_settings', agentId], {
          settings: {
            ...agentSettings,
            chatGptModel: defaultModel,
          },
        });
      }

      migrate();
    },
    [chatbotEmbodiment, settingsQuery.data],
  );

  // Create the context value
  const contextValue = useMemo<WidgetsContextType>(
    () => ({
      formik,
      isWriteAccess,
      isLoading: {
        agent: agentQuery.isLoading,
        settings: settingsQuery.isLoading,
        embodiments: agentEmbodiments.isLoading,
        llmModels: isLLMModelsLoading,
      },
      models: llmModels,
      modal: {
        isOpen: isModalOpen,
        setIsOpen: setIsModalOpen,
        handleClose: handleModalClose,
      },
      postHogEvent: {
        app_LLM_selected: postHogEvent.app_LLM_selected,
        setPostHogEvent,
      },
      isSaving,
    }),
    [
      formik,
      isWriteAccess,
      agentQuery.isLoading,
      settingsQuery.isLoading,
      agentEmbodiments.isLoading,
      isModalOpen,
      postHogEvent,
      isSaving,
      isLLMModelsLoading,
      llmModels,
    ],
  );

  const fieldChanged =
    formik.values.name.trim() !== agentQuery.data?.name ||
    formik.values.shortDescription.trim() !== agentQuery.data?.data?.shortDescription ||
    formik.initialValues.chatGptModel !== formik.values.chatGptModel ||
    formik.initialValues.behavior !== formik.values.behavior;

  return (
    <WidgetsContext.Provider value={contextValue}>
      <div className="grid grid-cols-1 gap-6">
        <AgentInfoWidget />
        <SettingsWidget />

        <FloatingButtonContainer
          showFloatingButton={fieldChanged}
          isSaving={isSaving}
          handleCancel={() => handleResetAll()}
          handleSave={() => formik.submitForm()}
        />
      </div>
    </WidgetsContext.Provider>
  );
};

export default OverviewWidgetsContainer;

const FloatingButtonContainer = ({
  showFloatingButton,
  isSaving,
  handleCancel,
  handleSave,
}: {
  showFloatingButton: boolean;
  isSaving: boolean;
  handleCancel: () => void;
  handleSave: () => void;
}) => {
  return (
    <div
      className={`sticky bottom-0 flex justify-end w-full bg-gray-50 p-4 rounded-lg border border-solid border-gray-200 ${
        showFloatingButton ? 'block' : 'hidden'
      }`}
    >
      {!isSaving && (
        <button
          type="button"
          className="font-medium bg-transparent text-sm text-gray-500"
          disabled={isSaving}
          onClick={handleCancel}
        >
          Cancel
        </button>
      )}
      <button
        type="button"
        className="bg-transparent ml-5 font-semibold text-sm text-v2-blue flex items-center"
        disabled={isSaving}
        onClick={handleSave}
      >
        {isSaving ? (
          <div role="status" className="flex items-center">
            <svg
              aria-hidden="true"
              className="w-4 h-4 me-2 text-gray-200 animate-spin fill-v2-blue"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
            <span className="sr-only">Loading...</span>
          </div>
        ) : (
          'Save'
        )}
      </button>
    </div>
  );
};
