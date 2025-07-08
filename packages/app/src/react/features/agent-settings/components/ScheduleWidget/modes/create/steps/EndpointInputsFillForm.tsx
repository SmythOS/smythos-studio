import SectionHeader from '@react/features/agent-settings/components/ScheduleWidget/meta/SectionTitle';
import { StepChildMethods, StepProps } from '@react/features/agent-settings/components/ScheduleWidget/modes/create/CreateSchedule';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { generateComponentInputsSchema } from '@react/features/agent-settings/utils';
import AgentComponentInput from '@react/features/agent-settings/utils/AgentComponentInput';
import { useFormik } from 'formik';
import { forwardRef, useEffect, useImperativeHandle } from 'react';

const EndpointInputsFillForm = forwardRef<StepChildMethods, StepProps>(
  ({ actions, formData: formData }, ref) => {
    const { agentQuery, latestAgentDeploymentQuery } = useAgentSettingsCtx();

    const selectedComponent = formData.componentId;

    // const component = agentQuery.data.data.components.find((component) => component.id === selectedComponent);
    const component = latestAgentDeploymentQuery.data.deployment.aiAgentData.components.find(
      (component) => component.id === selectedComponent,
    );
    const inputs = component?.inputs || [];
    const hasBinaryInput = inputs.some((input) => input.type === 'Binary');
    const _method = component?.data?.method ? component.data.method.toUpperCase() : 'POST';

    // useEffect(() => {
    //     if (inputs.length === 0) {
    //         actions.nextStep(); // Skip this step if no inputs
    //     }
    // }, [selectedComponent]);

    const dynamicValidationSchema = generateComponentInputsSchema(inputs);

    const formik = useFormik({
      initialValues: formData.body || {},
      validationSchema: dynamicValidationSchema,
      onSubmit: (values, { setSubmitting }) => {
        // Handle form submission

        setSubmitting(false);
      },
      validateOnMount: true,
    });

    useImperativeHandle(ref, () => ({
      handleNextClick: () => {
        const isValid = formik.isValid;
        actions.handleFormDataChange({ body: formik.values }); // Update parent form data
        formik.handleSubmit();
        return isValid;
      },
    }));

    useEffect(() => {
      actions.setCanSubmit(true);
    }, []);

    return (
      <div className="w-full">
        <SectionHeader title="New Routine" subtitle="Fill in the required inputs" />
        <form className="flex flex-col justify-between mt-6 gap-4">
          {inputs.length === 0 && (
            <div className="text-gray-500 text-sm text-center">No inputs required</div>
          )}
          {inputs.map((input) => {
            return (
              <AgentComponentInput
                input={input}
                key={input.name}
                error={
                  formik.errors[input.name] &&
                  formik.touched[input.name] &&
                  formik.errors[input.name]
                }
                value={formik.values[input.name] || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                onFileChange={(event) => {
                  if (!event.currentTarget.files) return;
                  // convert to base64
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    formik.setFieldValue(input.name, reader.result);
                  };
                  reader.readAsDataURL(event.currentTarget.files[0]);
                }}
                inputSize="sm"
                addTypeBadge
              />
            );
          })}
        </form>
      </div>
    );
  },
);

export default EndpointInputsFillForm;
