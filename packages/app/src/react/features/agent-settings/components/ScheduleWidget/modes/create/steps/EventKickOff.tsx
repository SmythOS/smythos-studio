import SectionHeader from '@react/features/agent-settings/components/ScheduleWidget/meta/SectionTitle';
import timezoneDisplayMap from '@react/features/agent-settings/components/ScheduleWidget/meta/timezone.json';
import { StepChildMethods, StepProps } from '@react/features/agent-settings/components/ScheduleWidget/modes/create/CreateSchedule';
import { ChangeEvent, forwardRef, useEffect, useImperativeHandle, useState } from 'react';

const divStyle = {
  fontSize: '14px',
  borderRadius: '5px',
  maxHeight: '435px',
};

const EventKickOff = forwardRef<StepChildMethods, StepProps>(({ actions, formData }, ref) => {
  // add one hour to the current time as the default start time
  const [startDateString, setStartDateString] = useState(
    formData.startDate || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  );

  const isStartDateToday = new Date(startDateString).toDateString() === new Date().toDateString();

  const [timezone, setTimezone] = useState(
    timezoneDisplayMap[Intl.DateTimeFormat().resolvedOptions().timeZone],
  );
  const [startDateError, setStartDateError] = useState<string | null>(null);

  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStartDateError(null);
    const [hours, minutes] = e.target.value.split(':');
    const startDate = new Date(startDateString);
    startDate.setHours(parseInt(hours));
    startDate.setMinutes(parseInt(minutes));
    // actions.handleFormDataChange({
    //     startDate: startDate.toISOString(),
    // });

    setStartDateString(startDate.toISOString());
  };

  const getStartTimeInHHMM = (_startDate: string) => {
    // output sample: 12:00
    const startDate = new Date(_startDate);
    const hours = startDate.getHours().toString().padStart(2, '0');
    const minutes = startDate.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  const startTime = getStartTimeInHHMM(startDateString);

  useEffect(() => {
    actions.setCanSubmit(true);
  }, []);

  useImperativeHandle(ref, () => ({
    handleBeforeStepChange: () => {
      // save form data
      actions.handleFormDataChange({
        startDate: startDateString,
      });
    },

    handleNextClick: () => {
      // check if the selected time is in the past
      if (new Date(startDateString) < new Date()) {
        setStartDateError('The time must be in the future');
        return false;
      } else {
        setStartDateError(null);
      }

      return true;
    },
  }));

  return (
    <div style={divStyle}>
      <SectionHeader
        title="New Routine"
        subtitle="What day and time should your agent routine kick off?"
      />

      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-700">Run first on this day:</span>

          <div className="max-w-[135px]">
            <input
              type="date"
              name="date"
              value={new Date(startDateString).toISOString().split('T')[0]}
              onChange={(e) => {
                setStartDateError(null);
                console.log('e.target.value', e.target.value);

                const selectedDate = new Date(e.target.value);
                selectedDate.setHours(new Date(startDateString).getHours());
                selectedDate.setMinutes(new Date(startDateString).getMinutes());
                // actions.handleFormDataChange({
                //     startDate: selectedDate.toISOString(),
                // });
                setStartDateString(selectedDate.toISOString());
              }}
              min={new Date().toISOString().split('T')[0]}
              className="py-2 px-3 border text-gray-900 rounded block w-full outline-none
                focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none
                text-sm font-normal placeholder:text-sm placeholder:font-normal box-border mb-[1px] focus:mb-0
                border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
            />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-700">At this time:</span>
            <div className="flex items-center">
              <div className="relative">
                <div className="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-500 dark:text-gray-400"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  type="time"
                  id="time"
                  className="py-2 px-3 border text-gray-900 rounded block w-full outline-none
                    focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none
                    text-sm font-normal placeholder:text-sm placeholder:font-normal box-border mb-[1px] focus:mb-0
                    border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                  value={startTime}
                  onChange={handleTimeChange}
                  required
                />
              </div>
            </div>
          </div>

          {startDateError && (
            <p className="text-red-500 text-xs mb-4 text-center">{startDateError}</p>
          )}
        </div>
        <div className="flex justify-between items-center mb-4">
          <span style={{ marginLeft: 'auto' }}>{timezone}</span>
        </div>
      </div>
    </div>
  );
});

export default EventKickOff;
