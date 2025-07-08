import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import {
  V4_ENTERPRISE_PLANS
} from '@react/features/agent-settings/constants';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import ExportChatLogsModal from '@react/features/agent-settings/modals/ExportChatLogsModal';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { EVENTS } from '@src/shared/posthog/constants/events';
import { PostHog } from '@src/shared/posthog/index';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FaRegListAlt } from 'react-icons/fa';
import { FaArrowRight, FaDownload } from 'react-icons/fa6';

type Props = {
  isWriteAccess?: boolean;
  isSubscribedToPlan?: boolean;
  userInfo?: {
    subs?: {
      plan?: {
        paid: boolean;
        name?: string;
      };
    };
    isCustomUser?: boolean;
  };
};

const LogsWidget = ({ isSubscribedToPlan, isWriteAccess, userInfo }: Props) => {
  const { agentId } = useAgentSettingsCtx();
  const { userInfo: authUserInfo } = useAuthCtx();
  const [showExportLogs, setShowExportLogs] = useState(false);

  const getLogRetentionDays = (): number => {
    if (userInfo?.isCustomUser) return 90;

    switch (userInfo?.subs?.plan?.name) {
      case 'Scaleup':
        return 90;
      case 'Startup':
      case 'Builder':
        return 30;
      default:
        return 7;
    }
  };

  const logRetentionDays = getLogRetentionDays();
  const hasMaxRetention = logRetentionDays === 90;

  // Check if user has access to export logs (enterprise plans only)
  const canExportLogs = V4_ENTERPRISE_PLANS.includes(authUserInfo?.subs?.plan?.name);

  return (
    <WidgetCard title="" isWriteAccess={isWriteAccess}>
      <div className={`bg-gray-50 p-4 space-y-6`} data-qa="agent-history-container">
        {/* Agent History Section */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Agent History</h3>

          <p className="text-sm text-gray-500 mb-4">
            {hasMaxRetention
              ? 'Agent logs for up to 90 days are available.'
              : `Logs are currently available for up to ${logRetentionDays} days. Upgrade to access up to 90 days of log storage.`}
          </p>

          <div className="flex justify-end">
            <a
              href={`/logs/${agentId}`}
              target="_blank"
              className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-2"
              onClick={() => {
                PostHog.track(EVENTS.AGENT_SETTINGS_EVENTS.app_view_logs_click, {});
              }}
            >
              <FaRegListAlt className="w-4 h-4" />
              <span>View logs</span>
              <FaArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Export Logs Section */}
        {canExportLogs && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold mb-2">Export Chat Conversations</h3>
            <p className="text-sm text-gray-500 mb-4">
              Download your chat conversation history as a JSON file for analysis or backup
              purposes.
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => setShowExportLogs(true)}
                className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-2"
              >
                <FaDownload className="w-4 h-4" />
                <span>Export Conversations</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Logs Modal */}
      {showExportLogs &&
        createPortal(
          <ExportChatLogsModal onClose={() => setShowExportLogs(false)} agentId={agentId} />,
          document.body,
        )}
    </WidgetCard>
  );
};

export default LogsWidget;
