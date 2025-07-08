import { useWidgetsContext } from '@react/features/agent-settings/components/OverviewWidgetsContainer/index';
import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import IconToolTip from '@react/shared/components/_legacy/ui/tooltip/IconToolTip';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { TextArea as CustomTextarea } from '@react/shared/components/ui/newDesign/textarea';
import { Modal } from 'flowbite-react';

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

const SettingsWidget = () => {
  const {
    formik,
    isWriteAccess,
    isLoading,
    models: MODELS_V2,
    modal: { isOpen: isModalOpen, setIsOpen: setIsModalOpen, handleClose: handleModalClose },
    postHogEvent: { setPostHogEvent },
  } = useWidgetsContext();

  if (isLoading.embodiments || isLoading.llmModels) return <ComponentSkeleton />;

  return (
    <WidgetCard title="" isWriteAccess={isWriteAccess} showOverflow={true}>
      <div className="bg-gray-50 p-4" data-qa="default-llm-container">
        <div className="flex justify-between items-center flex-col ">
          <div className="w-full">
            <label htmlFor="models" className="text-sm font-semibold mt-4">
              Default LLM{' '}
              <IconToolTip
                classes="w-72 ml-10"
                arrowClasses={'-ml-10'}
                html="Primary language model<br />Used for chat and chatbot interactions<br />Affects response quality and capabilities"
              />
            </label>
            <p className="text-sm text-gray-500 mb-2 mt-0.5">Select your preferred default LLM.</p>
            <select
              id="models"
              name="models"
              value={formik.values.chatGptModel}
              onChange={(e) => {
                setPostHogEvent((prev) => ({ ...prev, app_LLM_selected: e.target.value }));
                formik.setFieldValue('chatGptModel', e.target.value);
              }}
              className="mt-1 w-full p-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-v2-blue focus:border-v2-blue"
            >
              {Object.values(MODELS_V2).map((model) => {
                let badge = getTempBadge(model.tags);
                badge = badge ? ' (' + badge + ')' : '';

                return (
                  <option key={model.value} value={model.value}>
                    {model.label + badge}
                  </option>
                );
              })}
            </select>
            {formik.errors.chatGptModel && formik.touched.chatGptModel && (
              // @ts-ignore
              <p className="text-red-500 text-sm">{formik.errors.chatGptModel}</p>
            )}
          </div>

          {/* <div className="mt-6 w-full">
            <CustomTextarea
              label="Intro Message"
              subLabel="The message your agent will greet you with."
              name="introMessage"
              placeholder="Hello!"
              value={formik.values.introMessage}
              onChange={(e) => {
                formik.handleChange(e);
                formik.setFieldTouched('introMessage', true, false);
              }}
              onBlur={(e) => {
                formik.handleBlur(e);
              }}
              error={!!formik.errors.introMessage}
              errorMessage={formik.errors.introMessage}
              fullWidth
            />
          </div> */}

          <div className="mt-6 w-full">
            <CustomTextarea
              label="Behavior"
              subLabel="Describe your agent's behavior."
              name="behavior"
              placeholder="Friendly, professional, etc."
              value={formik.values.behavior}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={!!formik.errors.behavior}
              errorMessage={formik.errors.behavior as string}
              onExpand={() => setIsModalOpen(true)}
              fullWidth
            />
          </div>

          <Modal show={isModalOpen} onClose={handleModalClose} size="xl">
            <Modal.Header>
              <span className="text-xl font-semibold">Describe your agent's behavior</span>
            </Modal.Header>
            <Modal.Body>
              <CustomTextarea
                name="behavior"
                placeholder="Friendly, professional, etc."
                value={formik.values.behavior}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                fullWidth
                className="min-h-[300px]"
              />
            </Modal.Body>
            <Modal.Footer className="pt-0">
              <div className="w-full flex justify-end">
                <Button
                  handleClick={handleModalClose}
                  variant="secondary"
                  type="button"
                  label="Close"
                />
              </div>
            </Modal.Footer>
          </Modal>
        </div>
      </div>
    </WidgetCard>
  );
};

function ComponentSkeleton() {
  return (
    <WidgetCard title="LLM">
      <div className="bg-white p-4 ">
        <div className="flex-col animate-pulse gap-3">
          <div className="h-11 bg-gray-200 rounded-sm dark:bg-gray-700  w-sm"></div>
          <div className="mt-3 flex flex-col gap-1">
            <div className="h-3 bg-gray-200 rounded-full dark:bg-gray-700 w-1/3"></div>
            <div className="h-1.5 bg-gray-200 rounded-full dark:bg-gray-700 w-1/2"></div>
            <div className="h-28 bg-gray-200 rounded-sm dark:bg-gray-700  w-full"></div>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <div className="h-3 bg-gray-200 rounded-full dark:bg-gray-700 w-1/3"></div>
            <div className="h-1.5 bg-gray-200 rounded-full dark:bg-gray-700 w-1/2"></div>
            <div className="h-28 bg-gray-200 rounded-sm dark:bg-gray-700  w-full"></div>
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}

export default SettingsWidget;
