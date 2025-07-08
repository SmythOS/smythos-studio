import classNames from 'classnames';
import React, { useEffect, useMemo } from 'react';
import { FaCircleNotch, FaUpload } from 'react-icons/fa6';
import { IoMdAdd } from 'react-icons/io';
import { toast } from 'react-toastify';

import AvatarModal from '@react/features/agent-settings/components/AgentInfoWidget/AvatarModal';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import AgentAvatar from '@react/features/agents/components/agentCard/AgentAvatar';
import { EAgentSettings } from '@react/features/agents/types/agents.types';
import { processAvatar } from '@react/features/agents/utils';
import ToolTip from '@react/shared/components/_legacy/ui/tooltip/tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AgentInfoWidgetAvatarProps {
  data?: {
    hasAgentDeployed: boolean;
    outOfResources: boolean;
    hasAPIEndpoint: boolean;
    isAgentAvaliable: boolean;
  };
  tooltipText?: string;
}
const AgentInfoWidgetAvatar: React.FC<AgentInfoWidgetAvatarProps> = ({ data, tooltipText }) => {
  const { agentId, settingsQuery }: any = useAgentSettingsCtx();
  const queryClient = useQueryClient();
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentAvatar, setCurrentAvatar] = React.useState<string | null>(
    settingsQuery?.data?.settings?.[EAgentSettings.AVATAR] ?? null,
  );
  const [isImgDownloaded, setIsImgDownloaded] = React.useState(false);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = React.useState(false);

  const handleAvatarClick = () => {
    setIsAvatarModalOpen(true);
  };

  useEffect(
    function syncAvatar() {
      setCurrentAvatar(
        settingsQuery?.data?.settings?.[EAgentSettings.AVATAR] ?? null,
      );
    },
    [settingsQuery?.data],
  );

  // TODO: move these mutations to a separate file
  const uploadAvatar = useMutation({
    mutationKey: ['uploadAvatar', agentId],
    mutationFn: (formData: FormData) => {
      return fetch(`/api/page/agent_settings/ai-agent/${agentId}/avatar/upload`, {
        method: 'POST',
        body: formData,
      });
    },
  });

  const autoGenerateAvatar = useMutation({
    mutationKey: ['autoGenerateAvatar', agentId],
    mutationFn: async () => {
      const genResponse = await fetch(
        `/api/page/agent_settings/ai-agent/${agentId}/avatar/auto-generate`,
        {
          method: 'POST',
        },
      );
      return genResponse.json();
    },
    onSuccess(data) {
      if (data.url) {
        setCurrentAvatar(data.url);
        updateSettingsCache(data.url);
      }

      if (window.workspace?.agent) {
        window.workspace.agent.emit('AvatarUpdated', data.url);
      }
    },
    onError() {
      toast.error('We could not generate an avatar. Please try again.');
    },
  });

  const isImageBeingLoaded = !isImgDownloaded && Boolean(currentAvatar);
  const isUploading = useMemo(
    () => uploadAvatar.isLoading || autoGenerateAvatar.isLoading,
    [uploadAvatar.isLoading, autoGenerateAvatar.isLoading],
  );

  const updateSettingsCache = (newAvatarUrl: string) => {
    queryClient.setQueryData(['agent_settings', agentId], (oldData: any) => {
      return {
        ...oldData,
        settings: {
          ...oldData.settings,
          avatar: newAvatarUrl,
        },
      };
    });
  };

  return (
    <div className="w-[76px] h-[76px] rounded-full absolute bottom-[-36px] left-4 z-[1]">
      <div className="w-full h-full rounded-full relative group">
        <div
          className={classNames(
            'w-full h-full flex items-center justify-center z-20',
            isUploading ? 'pointer-events-none' : 'cursor-pointer',
          )}
          onClick={handleAvatarClick}
        >
          <AgentAvatar
            src={currentAvatar}
            alt="agent-avatar"
            size="xl"
            // showStatus
            // status={
            //     data?.outOfResources || !data?.hasAPIEndpoint
            //         ? 'error'
            //         : data?.isAgentAvaliable && data?.hasAgentDeployed
            //         ? 'online'
            //         : 'offline'
            // }
            border={classNames('border-4', currentAvatar && 'border-solid border-v2-blue')}
            children={
              <>
                <ToolTip
                  text={tooltipText}
                  classes="opacity-100 visible w-48"
                  placement="right"
                  tooltipWrapperClasses={
                    'absolute inset-0 w-3 h-3 left-[calc(14.6447%_-_6.5px)] top-[calc(14.6447%_-_6.5px)] z-30 opacity-100'
                  }
                  showTooltip={!!tooltipText}
                >
                  <div></div>
                </ToolTip>

                {!currentAvatar ? (
                  <div className="absolute inset-0 w-full h-full rounded-full bg-gray-200 flex items-center justify-center group hover:shadow-md z-10">
                    <IoMdAdd className="w-6 h-6 text-gray-400" />
                  </div>
                ) : isImageBeingLoaded ? (
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center z-20 animate-pulse"></div>
                ) : (
                  isUploading && (
                    <FaCircleNotch className="absolute left-[calc(50%_-_12px)] top-[calc(50%_-_12px)] w-6 h-6 text-white animate-spin" />
                  )
                )}
              </>
            }
            hoverChildren={
              <div
                className={classNames(
                  'w-full h-full rounded-full absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-11 transition-opacity duration-300 ',
                  !isUploading && 'opacity-0 group-hover:opacity-100', // show overlay only on hover OR when loading
                )}
                onClick={() => {
                  setIsAvatarModalOpen(true);
                }}
              >
                {isUploading ? (
                  <FaCircleNotch className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <FaUpload className="w-6 h-6 text-white" />
                )}
              </div>
            }
          />
        </div>
      </div>

      <input
        type="file"
        ref={uploadInputRef}
        className="hidden"
        accept="image/png,.png,image/jpeg,.jpg,.jpeg,image/gif,.gif,image/webp,.webp"
        onChange={async (e) => {
          if (e.target.files) {
            // setFile(e.target.files[0]);
            const formData = new FormData();
            const processedAvatar = await processAvatar(e.target.files[0]);
            formData.append('avatar', processedAvatar);

            setIsLoading(true);
            try {
              const res = await uploadAvatar.mutateAsync(formData);
              const json = await res.json();

              if (json.url) {
                setCurrentAvatar(json.url);
                updateSettingsCache(json.url);

              if (window.workspace?.agent) {
                  window.workspace.agent.emit('AvatarUpdated', json.url);
                }
              }
            } catch (error) {
              toast.error('Failed to upload avatar');
            } finally {
              setIsLoading(false);
            }
          }
        }}
      />

      <AvatarModal
        show={isAvatarModalOpen}
        isUploading={isUploading}
        currentAvatar={currentAvatar}
        onLoad={() => setIsImgDownloaded(true)}
        close={() => setIsAvatarModalOpen(false)}
        handleUpload={() => uploadInputRef.current?.click()}
        handleGenerate={() => autoGenerateAvatar.mutateAsync()}
      />
    </div>
  );
};

export default AgentInfoWidgetAvatar;
