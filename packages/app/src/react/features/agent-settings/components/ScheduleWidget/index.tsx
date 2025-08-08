import CreateSchedule from '@react/features/agent-settings/components/ScheduleWidget/modes/create/CreateSchedule';
import ScheduleInfoView from '@react/features/agent-settings/components/ScheduleWidget/modes/job_info/ScheduleInfoView';
import ListSchedules from '@react/features/agent-settings/components/ScheduleWidget/modes/list/ListSchedules';
import WidgetSubscribeInfo from '@react/features/agent-settings/components/widget-subscribe-info';
import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { WIDGETS_PRICING_ALERT_TEXT } from '@react/features/agent-settings/constants';
import { AgentScheduledJob } from '@react/shared/types/api-results.types';
import { useState } from 'react';

type Props = {
  isSubscribedToPlan?: boolean;
  isWriteAccess: boolean;
};
type Mode = {
  id: 'LIST' | 'EDIT' | 'CREATE' | 'INFO';
  data: { job?: AgentScheduledJob };
};

const ScheduleWidget = ({ isSubscribedToPlan, isWriteAccess }: Props) => {
  const [currMode, setCurrMode] = useState<Mode>({ id: 'LIST', data: {} });

  const modeToComponent: {
    [key in Mode['id']]: JSX.Element;
  } = {
    LIST: <ListSchedules changeView={changeView} />,
    EDIT: <div></div>,
    CREATE: <CreateSchedule changeView={changeView} />,
    INFO: <ScheduleInfoView changeView={changeView} contextData={currMode.data} />,
  };

  const viewComponent = modeToComponent[currMode.id];

  function changeView(id: Mode['id'], data: Mode['data']) {
    setCurrMode({ id, data });
  }

  if (!isSubscribedToPlan) {
    return (
      <WidgetCard title="" showOverflow>
        <div className="bg-gray-50 p-4" data-qa="schedule-container">
          <h3 className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2">
            Schedule
          </h3>
          <p className="text-sm text-gray-500">
            Plan and automate task execution with agent work scheduler.
          </p>
          <WidgetSubscribeInfo
            infoText={WIDGETS_PRICING_ALERT_TEXT.SCHEDULE}
            analytics={{ page_url: '/agent-settings', source: 'schedule' }}
          />
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="" isWriteAccess={isWriteAccess} showOverflow>
      <div className="bg-gray-50 p-4" data-qa="schedule-container">
        {viewComponent}
      </div>
    </WidgetCard>
  );
};

export default ScheduleWidget;
