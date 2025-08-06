import { Workspace } from '@src/frontend/workspace/Workspace.class';
import { getAgent } from '@src/react/features/agent-settings/clients';
import WidgetCard from '@src/react/features/agent-settings/components/WidgetCard';
import * as agentSettingsUtils from '@src/react/features/agents/utils';
import { GlobalVariableIcon } from '@src/react/shared/components/svgs';
import { Input } from '@src/react/shared/components/ui/input';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { errKeys } from '@src/react/shared/constants';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { errorToast, successToast } from '@src/shared/components/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tooltip } from 'flowbite-react';
import { Component, useEffect, useRef, useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { IoClose, IoKeyOutline } from 'react-icons/io5';
import { LuInfo } from 'react-icons/lu';

type KeyValuePair = {
  key: string;
  value: string;
  error?: boolean;
};

type VaultKey = {
  name: string;
  scope: string[];
};

type VaultKeysResponse = {
  success: boolean;
  data: Record<string, VaultKey>;
};

type NewVaultKey = {
  name: string;
  key: string;
};

type AgentData = {
  version: string;
  components: Component[];
  connections: any[];
  description: string;
  behavior?: string;
  debugSessionEnabled: boolean;
  shortDescription: string;
  ui: { panzoom: { currentPan: any; currentZoom: number } };
  variables?: Record<string, string>;
};

const VariablesWidget = ({ agentId, workspace }: { agentId: string; workspace: Workspace }) => {
  const { getPageAccess, loading } = useAuthCtx();
  const pageAccess = getPageAccess('/builder', false);

  const [writeAccess, setWriteAccess] = useState(false);
  const queryClient = useQueryClient();

  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const addKeyModalRef = useRef<HTMLDivElement>(null);

  const [pairs, setPairs] = useState<KeyValuePair[]>([{ key: '', value: '' }]);
  const [showVaultKeys, setShowVaultKeys] = useState<number | null>(null);
  const [vaultKeyParentIndex, setVaultKeyParentIndex] = useState<number | null>(null);
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKey, setNewKey] = useState<NewVaultKey>({ name: '', key: '' });
  const [keyErrors, setKeyErrors] = useState<{ name?: string; key?: string }>({});
  const [savingAgentVars, setSavingAgentVars] = useState<boolean>(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  const [initialPairs, setInitialPairs] = useState<KeyValuePair[]>([]);
  const [varChanged, setVarChanged] = useState(false);

  const {
    data: agentData,
    isSuccess: agentSuccess,
    isLoading: agentLoading,
  } = useQuery({
    queryKey: ['agent_data_settings'],
    queryFn: () => getAgent(agentId),
    cacheTime: 0,
    staleTime: 0,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: false,
  });

  const { data: vaultKeysResponse } = useQuery<VaultKeysResponse>({
    queryKey: ['vaultKeys'],
    queryFn: async () => {
      const response = await fetch(
        '/api/page/builder/keys?fields=name,scope&excludeScope=global,AgentLLM',
      );
      return response.json();
    },
    // Keep the data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Cache the data for 10 minutes
    cacheTime: 10 * 60 * 1000,
    // Don't refetch on window focus
    refetchOnWindowFocus: false,
    // Don't refetch on component mount if data exists
    refetchOnMount: false,
    onError: () => {
      errorToast('Failed to load vault keys');
    },
  });

  const vaultKeys = vaultKeysResponse?.data || {};

  const saveKeyMutation = useMutation({
    mutationFn: async (newKeyData: { keyName: string; key: string; scope: string[] }) => {
      const response = await fetch('/api/page/builder/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newKeyData),
      });
      if (!response.ok) {
        throw new Error('Failed to save key');
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vaultKeys'] });

      const keyName = newKey.name;
      const currentIndex = vaultKeyParentIndex;

      setShowAddKeyModal(false);
      setNewKey({ name: '', key: '' });

      if (currentIndex !== null) {
        const newPairs = [...pairs];
        newPairs[currentIndex] = {
          ...newPairs[currentIndex],
          value: `{{KEY(${keyName})}}`,
          error: false,
        };
        setPairs(newPairs);
      }

      setShowVaultKeys(null);
    },
    onError: () => {
      errorToast('Failed to save key. Please try again.');
    },
    onSettled: () => {
      setIsSavingKey(false);
    },
  });

  const saveVariablesMutation = useMutation({
    mutationFn: async ({
      variables,
      lockId,
    }: {
      variables: Record<string, string>;
      lockId: string;
    }) => {
      const response = await fetch('/api/agent', {
        method: 'POST',
        body: JSON.stringify({
          ...agentData,
          data: { ...agentData?.data, variables },
          id: agentId,
          lockId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to save variables');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
    },
    onError: () => {
      errorToast('Failed to update agent variables. Please try again.');
    },
    onSettled: async (_, __, variables) => {
      await agentSettingsUtils
        .releaseLock(agentId, variables.lockId)
        .catch((e) => console.error(e));
    },
  });

  const handleInputChange = (index: number, field: 'key' | 'value', value: string) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], [field]: value, error: false };

    // Add new empty pair if typing in the last pair
    if (index === pairs.length - 1 && value !== '') {
      newPairs.push({ key: '', value: '' });
      // Ensure the refs array has space for the new textarea
      textareaRefs.current = [...textareaRefs.current, null];
    }

    setPairs(newPairs);
    setVarChanged(JSON.stringify(newPairs) !== JSON.stringify(initialPairs));

    // Adjust height if it's a value change
    if (field === 'value') {
      adjustTextareaHeight(
        textareaRefs.current[index],
        document.activeElement === textareaRefs.current[index],
      );
    }
  };

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e?.stopPropagation();
    const newPairs = pairs.filter((_, i) => i !== index);
    // Ensure there's always at least one empty pair
    if (newPairs.length === 0) {
      newPairs.push({ key: '', value: '' });
    }
    setPairs(newPairs);
    setVarChanged(JSON.stringify(newPairs) !== JSON.stringify(initialPairs));
  };

  const handleVaultKeySelect = (index: number, keyName: string) => {
    handleInputChange(index, 'value', `{{KEY(${keyName})}}`);
    setShowVaultKeys(null);
  };

  const handleAddKeyClick = () => {
    setShowAddKeyModal(true);
    setNewKey({ name: '', key: '' });
    setKeyErrors({});
    setShowVaultKeys(null);

    const timeout = setTimeout(() => {
      if (addKeyModalRef.current)
        addKeyModalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      clearTimeout(timeout);
    }, 0);
  };

  const validateNewKey = (): boolean => {
    const errors: { name?: string; key?: string } = {};

    if (!newKey.name.trim()) {
      errors.name = 'Name is required';
    } else if (Object.values(vaultKeys).some((key) => key.name === newKey.name.trim())) {
      errors.name = 'Key name already exists';
    }

    if (!newKey.key.trim()) {
      errors.key = 'Key is required';
    } else if (newKey.key.length > 10000) {
      errors.key = 'Key length cannot exceed 10,000 characters';
    }

    setKeyErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveKey = async () => {
    if (validateNewKey()) {
      setIsSavingKey(true);
      saveKeyMutation.mutate({
        keyName: newKey.name,
        key: newKey.key,
        scope: ['ALL_NON_GLOBAL_KEYS'],
      });
    }
  };
  const handleSave = async (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    let hasError = false;
    const validatedPairs = pairs.map((currentPair, currentIndex) => {
      // Skip empty pairs
      if (currentPair.key === '' && currentPair.value === '') {
        return currentPair;
      }

      // Check for missing key/value
      const missingFieldError =
        (currentPair.key === '' && currentPair.value !== '') ||
        (currentPair.key !== '' && currentPair.value === '');

      // Check for duplicate keys
      const duplicateKeyError =
        currentPair.key !== '' &&
        pairs.some((pair, index) => index !== currentIndex && pair.key === currentPair.key);

      const error = missingFieldError || duplicateKeyError;
      hasError = hasError || error;
      console.log('error', error);
      return { ...currentPair, error };
    });

    setPairs(validatedPairs);

    if (!hasError) {
      setSavingAgentVars(true);
      try {
        const pairsToSave = pairs.filter((pair) => pair.key !== '' && pair.value !== '');
        let variables = {};
        pairsToSave.forEach((pair) => {
          variables[pair.key] = pair.value;
        });
        await handleVariablesSave(variables);
        // Update initialPairs and reset isDirty after successful save
        setInitialPairs(pairs);
        setVarChanged(false);
      } catch (error) {
        // If save fails, keep the dirty state
        console.error(error);
      } finally {
        setSavingAgentVars(false);
      }
    }
  };

  async function handleVariablesSave(variables: Record<string, string>) {
    if (agentLoading || !agentSuccess || !agentData || !agentData.data) return;

    try {
      if (workspace) {
        try {
          workspace.agent.data.variables = variables;
          await workspace.saveAgent(undefined, undefined, workspace.agent.data);
          // Reset dirty state after successful workspace save
          setVarChanged(false);
        } catch (e) {
          console.error(e);
        } finally {
        }
      } else {
        const lockResponse = await agentSettingsUtils.accquireLock(agentId);
        await saveVariablesMutation.mutateAsync({ variables, lockId: lockResponse.lockId });
        // Reset dirty state after successful mutation
        setVarChanged(false);
      }

      successToast('Variables saved successfully');
    } catch (e) {
      if (e.errKey === errKeys.AGENT_LOCK_FAIL) {
        errorToast(
          'Failed to update agent variables as the agent is being edited by another user. Please try again later.',
        );
      } else {
        errorToast('Failed to update agent variables. Please try again.');
      }
    }
  }

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null, isExpanded: boolean) => {
    if (!textarea) return;

    // If the value is empty or not focused, set to default height
    if (!isExpanded) {
      textarea.style.height = '40px';
      return;
    }

    textarea.style.height = '40px'; // Reset tominimum height first
    textarea.style.height = `${Math.max(40, textarea.scrollHeight)}px`; // Ensure minimum height of 40px
  };

  const handleClose = () => {
    const agentSettingsButton = workspace.domElement.querySelector('.agent-settings-button');
    if (agentSettingsButton) {
      (agentSettingsButton as HTMLElement)?.click();
    }
  };

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (target.closest('#vault-key-button')) return;

      if (showVaultKeys !== null && !target.closest('.vault-keys-dropdown')) setShowVaultKeys(null);
    };

    if (showVaultKeys !== null) {
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showVaultKeys]);

  useEffect(() => {
    if (agentSuccess && agentData?.data) {
      const data = agentData?.data as unknown as AgentData;
      const newPairs = Object.entries(data.variables || {})
        .map(([key, value]) => ({
          key,
          value: String(value),
        }))
        .concat([{ key: '', value: '' }]);

      setPairs(newPairs);
      setInitialPairs(newPairs);
    }
  }, [agentSuccess, agentData?.data]);

  useEffect(() => {
    function handleWidgetAccess(event: CustomEvent) {
      setWriteAccess(event.detail.writeAccess);
    }

    window.addEventListener('update-widget-access', handleWidgetAccess);

    setWriteAccess(pageAccess?.write);

    // added this condition for initial load, if the event is missed because of not being in the DOM yet
    // if the workspace is locked, set write access to false
    const isLocked = document.querySelector('#workspace-container')?.classList.contains('locked');
    if (isLocked) {
      setWriteAccess(false);
    }

    return () => {
      window.removeEventListener('update-widget-access', handleWidgetAccess);
    };
  }, [pageAccess?.write]);

  if (loading)
    return (
      <div className="bg-[#F3F4F6] mt-3 p-4 rounded-xl border border-solid border-gray-200 flex items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <WidgetCard title="" isWriteAccess={writeAccess} hasBorder={false} showOverflow={true}>
      <div className="bg-[#FFFF] text-[#5A5A5A] p-4 rounded-xl border border-solid border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold flex items-center">
            <GlobalVariableIcon className="mr-2" /> Global Variables
          </h2>

          <div
            id="variables-widget-actions"
            className={`flex gap-3  ${writeAccess ? 'opacity-100' : 'opacity-0'}`}
          >
            <Tooltip
              content={
                <div style={{ minWidth: '300px' }}>
                  The Agent Variables you declare here can be accessed and used across all
                  components. These variables act like global variables throughout your AI agent.
                </div>
              }
              placement="top"
            >
              <LuInfo size={20} />
            </Tooltip>
            <Tooltip content="Close" placement="top">
              <IoClose
                className="cursor-pointer"
                size={22}
                onClick={(e) => {
                  e?.stopPropagation();
                  handleClose();
                }}
              />
            </Tooltip>
          </div>
        </div>
        <p className="text-sm mb-4">Define reusable values to use across your workflow.</p>
        <div className="space-y-2">
          {pairs.map((pair, index) => (
            <div key={index} className="flex gap-2 group relative">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Key"
                  value={pair.key}
                  onChange={(e) => handleInputChange(index, 'key', e.target.value)}
                  className={`w-full bg-white border text-gray-900 rounded block outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none text-sm font-normal placeholder:text-sm placeholder:font-normal ${
                    pair.error
                      ? '!border-smyth-red focus:border-smyth-red'
                      : 'border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500'
                  }`}
                />
                {index < pairs.length - 1 && (
                  <button
                    onClick={(e) => handleDelete(e, index)}
                    className="absolute right-2 top-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-500 hover:text-red-500"
                    type="button"
                    aria-label="Delete variable"
                  >
                    <Tooltip
                      content={<div style={{ width: '120px' }}>Delete Variable</div>}
                      placement="top"
                    >
                      <FiTrash2 className="text-red-500" />
                    </Tooltip>
                  </button>
                )}
              </div>
              <div className="relative w-1/2">
                <div className="relative">
                  <textarea
                    ref={(el) => (textareaRefs.current[index] = el)}
                    placeholder="Value"
                    value={pair.value}
                    onChange={(e) => handleInputChange(index, 'value', e.target.value)}
                    onFocus={(e) => adjustTextareaHeight(e.target, true)}
                    onBlur={(e) => adjustTextareaHeight(e.target, false)}
                    className={`w-full bg-white border text-gray-900 rounded block outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none text-sm font-normal placeholder:text-sm placeholder:font-normal ${
                      pair.error
                        ? '!border-smyth-red focus:border-smyth-red'
                        : 'border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500'
                    } pr-10`}
                    style={{
                      height: '40px',
                      minHeight: '40px',
                      lineHeight: '1.25rem',
                    }}
                  />
                  <button
                    onClick={() => {
                      setShowVaultKeys(index);
                      setVaultKeyParentIndex(index);
                    }}
                    className="absolute right-2 top-0 bottom-0 my-auto h-7 w-7 hover:bg-gray-100 rounded flex items-center justify-center"
                    type="button"
                    id="vault-key-button"
                  >
                    <IoKeyOutline className="text-[#424242]  scale-x-[-1]" />
                  </button>
                  <div className="absolute bottom-[7px] left-2 w-[calc(100%-16px)] h-1 bg-white"></div>
                </div>
                {showVaultKeys === index && (
                  <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg vault-keys-dropdown">
                    <ul
                      className="max-h-[200px] overflow-y-auto"
                      onWheel={(e) => {
                        // Prevent scroll propagation when within dropdown
                        e.stopPropagation();
                      }}
                    >
                      {Object.entries(vaultKeys).length > 0 ? (
                        <>
                          {Object.entries(vaultKeys).map(([id, key]) => (
                            <li
                              key={id}
                              className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleVaultKeySelect(index, key.name)}
                            >
                              {key.name}
                            </li>
                          ))}
                          <li className="border-t">
                            <button
                              className="w-full text-left text-sm px-4 py-2 text-blue-500 hover:bg-gray-100"
                              onClick={handleAddKeyClick}
                            >
                              Add Key
                            </button>
                          </li>
                        </>
                      ) : (
                        <li>
                          <button
                            className="w-full text-left px-4 py-2 text-blue-500 hover:bg-gray-100"
                            onClick={handleAddKeyClick}
                          >
                            Add Key
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {varChanged && (
          <div className="flex justify-end mt-4">
            <Button
              label={'Save'}
              variant="primary"
              onMouseDown={handleSave}
              disabled={savingAgentVars}
              addIcon={savingAgentVars}
              Icon={<Spinner classes="w-4 h-4 mr-2" />}
            />
          </div>
        )}
      </div>

      {/* Add Key Modal */}
      {showAddKeyModal && (
        <div
          ref={addKeyModalRef}
          className="mt-4 flex items-center justify-center rounded-lg border border-solid border-gray-200"
        >
          <div className="bg-[#FFFF] text-[#5A5A5A] rounded-xl p-6 w-full max-w-md modal-content">
            <h2 className="text-base font-semibold mb-4">Save Key to the Vault</h2>

            <div className="mb-4">
              <Input
                label="Name"
                required
                value={newKey.name}
                onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                error={!!keyErrors.name}
                errorMessage={keyErrors.name}
                fullWidth
              />
            </div>

            <div className="mb-4">
              <Input
                label="Key"
                required
                value={newKey.key}
                onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                error={!!keyErrors.key}
                errorMessage={keyErrors.key}
                fullWidth
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                label="Cancel"
                variant="secondary"
                handleClick={(e) => {
                  e?.stopPropagation();
                  setShowAddKeyModal(false);
                }}
              />
              <Button
                label={'Save'}
                variant="primary"
                handleClick={handleSaveKey}
                disabled={isSavingKey}
                addIcon={isSavingKey}
                Icon={<Spinner classes="w-4 h-4 mr-2" />}
              />
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
};

export default VariablesWidget;
