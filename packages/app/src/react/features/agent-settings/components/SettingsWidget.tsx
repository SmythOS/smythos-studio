import { useWidgetsContext } from '@react/features/agent-settings/components/OverviewWidgetsContainer';
import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { TextArea as CustomTextarea } from '@react/shared/components/ui/newDesign/textarea';
import { SkeletonLoader } from '@src/react/shared/components/ui/skeleton-loader';
import { Modal, Tooltip } from 'flowbite-react';
import { Info } from 'lucide-react';

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
    updateCurrentFormValues,
  } = useWidgetsContext();

  if (isLoading.embodiments || isLoading.llmModels) return <SkeletonLoader title="LLM" />;

  return (
    <WidgetCard title="" isWriteAccess={isWriteAccess} showOverflow={true}>
      <div className="bg-gray-50 p-4" data-qa="default-llm-container">
        <div className="flex justify-between items-center flex-col ">
          <div className="w-full">
            <label
              htmlFor="models"
              className="flex items-center gap-2 text-gray-700 text-sm font-semibold mt-4"
            >
              Default LLM
              <Tooltip
                className="w-52 text-center"
                content={
                  <div>
                    Primary language model
                    <br />
                    Used for chat and chatbot interactions
                    <br />
                    Affects response quality and capabilities
                  </div>
                }
              >
                <Info className="w-4 h-4 mt-[-2px]" />
              </Tooltip>
            </label>
            <p className="text-sm text-gray-500 mb-2 mt-0.5">Select your preferred default LLM.</p>
            <select
              id="models"
              name="models"
              value={formik.values.chatGptModel}
              onChange={(e) => {
                setPostHogEvent((prev) => ({ ...prev, app_LLM_selected: e.target.value }));
                formik.setFieldValue('chatGptModel', e.target.value);
                updateCurrentFormValues({ chatGptModel: e.target.value });
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
              labelClassName="text-sm font-semibold"
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
              infoTooltip={
                <div>
                  Define how the agent should respond and behave during interactions.
                  <br />
                  Include personality traits, communication style, and any specific instructions for
                  handling user requests.
                </div>
              }
            />
          </div>

          <Modal
            show={isModalOpen}
            onClose={handleModalClose}
            size="xl"
            theme={{
              header: {
                close: {
                  base: 'text-[#1E1E1E] hover:text-gray-700 h-8 w-8 p-1.5 hover:bg-gray-200 rounded-lg',
                },
              },
            }}
          >
            <Modal.Header>
              <span className="text-[#1E1E1E] text-xl font-semibold">
                Describe your agent's behavior
              </span>
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
                  type="button"
                  className="px-8 rounded-lg ml-auto"
                >
                  Done
                </Button>
              </div>
            </Modal.Footer>
          </Modal>
        </div>
      </div>
    </WidgetCard>
  );
};

export default SettingsWidget;
