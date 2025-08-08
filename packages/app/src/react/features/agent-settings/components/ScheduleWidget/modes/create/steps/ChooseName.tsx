import SectionHeader from '@react/features/agent-settings/components/ScheduleWidget/meta/SectionTitle';
import { StepChildMethods, StepProps } from '@react/features/agent-settings/components/ScheduleWidget/modes/create/CreateSchedule';
import { Input } from '@react/shared/components/ui/input';
import { forwardRef, useEffect } from 'react';

type Props = {};

const ChooseName = forwardRef<StepChildMethods, StepProps>(({ actions, formData }, ref) => {
  useEffect(() => {
    actions.setCanSubmit(true);
  }, []);

  return (
    <div className="w-full">
      <SectionHeader
        title="New Routine"
        subtitle="What should your routine be called? (optional)"
      />

      {/* Name input */}
      <div className="mb-3 mt-5">
        <Input
          label="Routine Name"
          labelClassName="text-gray-700 mb-1 text-sm"
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={(e) => actions.handleFormDataChange({ name: e.target.value })}
          placeholder="Name your routine"
          fullWidth
        />
      </div>
    </div>
  );
});

export default ChooseName;
