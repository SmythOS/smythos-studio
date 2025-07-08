// import classNames from 'classnames';
import Avatar from '@react/features/agent-settings/components/AgentInfoWidget/Avatar';
import { useWidgetsContext } from '@react/features/agent-settings/components/OverviewWidgetsContainer';
import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { Input } from '@react/shared/components/ui/input';
import { TextArea } from '@react/shared/components/ui/newDesign/textarea';

const AgentInfoWidget = () => {
  const { formik, isWriteAccess, isLoading } = useWidgetsContext();

  if (isLoading.agent || isLoading.settings) return <ComponentSkeleton />;

  return (
    <WidgetCard isWriteAccess={isWriteAccess}>
      <div className="h-[78px] relative bg-v2-blue">
        <Avatar />
      </div>

      <div className="px-4 pt-10 pb-6 flex flex-col bg-gray-50" data-qa="agent-name-container">
        <div className="mb-4 mt-4">
          <Input
            label="Agent Name"
            type="text"
            name="name"
            value={formik.values.name || ''}
            onChange={(e) => formik.handleChange(e)}
            placeholder="Enter agent name"
            error={!!formik.errors.name}
            errorMessage={formik.errors.name as string}
            fullWidth
          />
        </div>

        <div className="mb-2">
          <TextArea
            label="Description"
            name="shortDescription"
            value={formik.values.shortDescription || ''}
            onChange={(e) => formik.handleChange(e)}
            placeholder="Describe your project"
            error={!!formik.errors.shortDescription}
            errorMessage={formik.errors.shortDescription as string}
            fullWidth
          />
        </div>
      </div>
    </WidgetCard>
  );
};

function ComponentSkeleton() {
  return (
    <WidgetCard>
      <div className="animate-pulse">
        <div className="h-[78px] relative bg-v2-blue">
          <div className="h-[72px] w-[72px] bg-gray-200 rounded-full dark:bg-gray-700 mr-2 border-4 border-white absolute bottom-[-36px] left-4"></div>
        </div>

        <div className="px-4 pt-10 pb-6 flex flex-col bg-gray-50">
          <div className="mb-4">
            <div className="flex items-center mb-2 mt-4">
              <div className="h-4 bg-gray-200 rounded-sm dark:bg-gray-700 w-24"></div>
            </div>
            <div className="relative">
              <div className="w-full h-10 bg-gray-200 rounded-md dark:bg-gray-700"></div>
            </div>
          </div>

          <div className="">
            <div className="flex items-center mb-2">
              <div className="h-4 bg-gray-200 rounded-sm dark:bg-gray-700 w-24"></div>
            </div>
            <div className="relative">
              <div className="w-full h-[100px] bg-gray-200 rounded-md dark:bg-gray-700"></div>
            </div>
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}

export default AgentInfoWidget;
