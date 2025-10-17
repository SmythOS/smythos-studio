import { saveAgentSettingByKey } from '@react/features/agent-settings/clients';
import { AgentInfoWidget, SettingsWidget } from '@react/features/agent-settings/components';
import { SETTINGS_KEYS } from '@react/features/agent-settings/constants';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import * as agentSettingsUtils from '@react/features/agents/utils';
import { errKeys } from '@react/shared/constants';
import { EMBODIMENT_TYPE } from '@react/shared/enums';
import { Agent } from '@react/shared/types/agent-data.types';
import { Embodiment } from '@react/shared/types/api-results.types';
import { LLMFormController } from '@src/builder-ui/helpers/LLMFormController.helper';
import { errorToast } from '@src/shared/components/toast';
import { Observability } from '@src/shared/observability';
import { EVENTS } from '@src/shared/posthog/constants/events';
import { LLMRegistry } from '@src/shared/services/LLMRegistry.service';
import { llmModelsStore } from '@src/shared/state_stores/llm-models';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FaCheck } from 'react-icons/fa';
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
  updateCurrentFormValues: (values: FormValues) => void;
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
  name?: string;
  shortDescription?: string;
}

const OverviewWidgetsContainer = ({ isWriteAccess }: { isWriteAccess: boolean }) => {
  const queryClient = useQueryClient();
  const { agentQuery, agentId, settingsQuery, workspace } = useAgentSettingsCtx();

  const [postHogEvent, setPostHogEvent] = useState({ app_LLM_selected: null });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLLMModelsLoading, setIsLLMModelsLoading] = useState<boolean>(true);
  const [llmModels, setLlmModels] = useState<
    Array<{
      label: string;
      value: string;
      tags: string[];
    }>
  >([]);
  const [defaultModel, setDefaultModel] = useState<string>('');

  const initialValues: FormValues = {
    chatGptModel: '',
    behavior: '',
    name: '',
    shortDescription: '',
  };

  // Contains the current form values
  const currentFormValues = useRef<FormValues>(initialValues);
  // Contains the previous form values to compare with the current form values
  const initialFormValues = useRef<FormValues>(initialValues);

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
      }),
    [llmModels], // Only recreate when models change
  );

  const formik = useFormik({
    initialValues: initialValues,
    validationSchema: validationSchema,
    onSubmit: async (_, { setSubmitting }) => {
      await handleSave();

      setSubmitting(false);
    },
    enableReinitialize: false, // Don't reinitialize form when initialValues change
  });

  formik.handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    currentFormValues.current = {
      ...currentFormValues.current,
      [e.target.name]: e.target.value,
    };
    formik.setFieldValue(e.target.name, e.target.value, false);
    formik.validateField(e.target.name);
  };

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

  // Populate form with API data once it's available
  useEffect(() => {
    const isInitialMount = !formik.values.chatGptModel && !formik.values.name;
    if (agentQuery.data && settingsQuery.data && isInitialMount) {
      const values = {
        chatGptModel:
          settingsQuery.data?.settings?.chatGptModel ||
          chatbotEmbodiment?.properties?.chatGptModel ||
          defaultModel,
        behavior: workspace ? workspace.agent.data.behavior : agentQuery.data?.data?.behavior || '',
        name: agentQuery.data?.name || '',
        shortDescription: agentQuery.data?.data?.shortDescription || '',
      };

      formik.setValues(values);
      currentFormValues.current = values;
      initialFormValues.current = values;
    }
  }, [agentQuery.data, settingsQuery.data, chatbotEmbodiment, workspace, defaultModel, formik]);

  const updateAgentDataSettingsCache = useCallback((): void => {
    queryClient.setQueryData(['agent_data_settings'], (oldData: Agent) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        name: currentFormValues.current.name.trim(),
        data: {
          ...(oldData.data || {}),
          shortDescription: currentFormValues.current.shortDescription.trim(),
          behavior: currentFormValues.current.behavior.trim(),
        },
      };
    });
  }, [queryClient]);

  const updateAgentSettingsCache = useCallback(
    (model: string) => {
      queryClient.setQueryData(['agent_settings', agentId], (oldData: any) => {
        return {
          ...oldData,
          settings: {
            ...oldData.settings,
            chatGptModel: model,
          },
        };
      });
    },
    [queryClient, agentId],
  );

  const handleSave = useCallback(async (): Promise<void> => {
    setSavingStatus('saving');

    if (agentQuery.isLoading || !agentQuery.isSuccess || !agentQuery.data || !agentQuery.data.data)
      return;

    let lockId = null;
    const promises = [];
    const failedFields = [];

    const nameChanged: boolean =
      currentFormValues.current.name?.trim() !== initialFormValues.current.name;
    const descriptionChanged: boolean =
      currentFormValues.current.shortDescription?.trim() !==
      initialFormValues.current.shortDescription;

    const chatGptModelChanged: boolean =
      currentFormValues.current.chatGptModel !== initialFormValues.current.chatGptModel;
    const behaviorChanged: boolean =
      currentFormValues.current.behavior?.trim() !== initialFormValues.current.behavior;

    // store the initial form values in a temporary variable
    const tempInitialFormValues = { ...initialFormValues.current };
    initialFormValues.current = { ...currentFormValues.current };

    if (chatGptModelChanged) {
      promises.push(
        saveAgentSettingByKey(
          SETTINGS_KEYS.chatGptModel,
          currentFormValues.current.chatGptModel,
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
          workspace.agent.name = currentFormValues.current.name?.trim();
        }
        if (descriptionChanged) {
          workspace.agent.data.shortDescription =
            currentFormValues.current.shortDescription?.trim();
        }

        if (behaviorChanged) {
          workspace.agent.data.behavior = currentFormValues.current.behavior?.trim();
        }

        if (nameChanged || descriptionChanged || behaviorChanged) {
          const data = await workspace.export();
          const id = workspace.agent.id || agentId;

          promises.push(
            workspace.saveAgent(currentFormValues.current.name?.trim(), null, data, id),
          );
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
          updatedData.name = currentFormValues.current.name?.trim();
        }

        if (descriptionChanged) {
          updatedData.data = {
            ...agentQuery.data?.data,
            shortDescription: currentFormValues.current.shortDescription?.trim() || '',
          };
        }

        if (behaviorChanged) {
          updatedData.data = {
            ...agentQuery.data?.data,
            behavior: currentFormValues.current.behavior?.trim() || '',
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

      if (postHogEvent.app_LLM_selected && chatGptModelChanged) {
        await Observability.observeInteraction(EVENTS.AGENT_SETTINGS_EVENTS.app_LLM_selected, {
          model: currentFormValues.current.chatGptModel,
        });
        setPostHogEvent((prev) => ({ ...prev, app_LLM_selected: null }));
      }

      updateAgentSettingsCache(currentFormValues.current.chatGptModel);
      updateAgentDataSettingsCache();

      setSavingStatus('saved');
      const timeout = setTimeout(() => {
        setSavingStatus('idle');
        clearTimeout(timeout);
      }, 1000);
    } catch (error) {
      console.error('Error in save operation:', error);

      if (error?.errKey == errKeys.AGENT_LOCK_FAIL) {
        errorToast(
          'Failed to update agent behavior as the agent is being edited by another user. Please try again later.',
        );
      } else {
        errorToast('Failed to save settings');
      }

      initialFormValues.current = { ...tempInitialFormValues };
      currentFormValues.current = { ...tempInitialFormValues };
      setSavingStatus('idle');
    } finally {
      if (lockId) {
        await agentSettingsUtils.releaseLock(agentId, lockId).catch((e) => console.error(e));
      }
    }
  }, [
    agentQuery.data,
    agentQuery.isLoading,
    agentQuery.isSuccess,
    agentId,
    postHogEvent.app_LLM_selected,
    workspace,
    updateAgentDataSettingsCache,
    updateAgentSettingsCache,
  ]);

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

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

  const [callAPI, setCallAPI] = useState(false);

  // Auto-save with debouncing
  useEffect(() => {
    const currentTimeoutId = setTimeout(() => {
      // Skip auto-save on initial mount
      if (!agentQuery.data || !settingsQuery.data) {
        return;
      }

      // Check if fields have actually changed
      const hasChanges =
        currentFormValues.current.name?.trim() !== initialFormValues.current.name ||
        currentFormValues.current.shortDescription?.trim() !==
          initialFormValues.current.shortDescription ||
        currentFormValues.current.chatGptModel !== initialFormValues.current.chatGptModel ||
        currentFormValues.current.behavior?.trim() !== initialFormValues.current.behavior;

      if (!hasChanges || !isWriteAccess || savingStatus !== 'idle') {
        return;
      }

      setCallAPI(true);
    }, 500);

    return () => clearTimeout(currentTimeoutId);
  }, [formik, isWriteAccess, savingStatus, agentQuery.data, settingsQuery.data]);

  useEffect(() => {
    if (callAPI) {
      formik.submitForm();
      setCallAPI(false);
    }
  }, [callAPI, formik]);

  const updateCurrentFormValues = useCallback((values: FormValues) => {
    currentFormValues.current = { ...currentFormValues.current, ...values };
  }, []);

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
      updateCurrentFormValues,
    }),
    [
      formik,
      isWriteAccess,
      agentQuery.isLoading,
      settingsQuery.isLoading,
      agentEmbodiments.isLoading,
      isModalOpen,
      postHogEvent,
      isLLMModelsLoading,
      llmModels,
      updateCurrentFormValues,
    ],
  );

  return (
    <WidgetsContext.Provider value={contextValue}>
      <div className="grid grid-cols-1 gap-6">
        <AgentInfoWidget />
        <SettingsWidget />

        <FloatingButtonContainer savingState={savingStatus} />
      </div>
    </WidgetsContext.Provider>
  );
};

export default OverviewWidgetsContainer;

const FloatingButtonContainer = ({ savingState }: { savingState: 'idle' | 'saving' | 'saved' }) => {
  return (
    <div
      className={`sticky bottom-2 right-2 flex items-center justify-end ml-auto  w-fit bg-gray-50 p-3 rounded-full border border-solid border-gray-200 ${
        savingState !== 'idle' ? 'block' : 'hidden'
      }`}
    >
      {savingState === 'saving' && (
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
          <span className="text-sm text-gray-500">Saving...</span>
        </div>
      )}

      {savingState === 'saved' && (
        <div role="status" className="flex items-center">
          <FaCheck className="w-4 h-4 me-2 text-v2-blue" />
          <span className="text-sm text-gray-500">Saved</span>
        </div>
      )}
    </div>
  );
};
