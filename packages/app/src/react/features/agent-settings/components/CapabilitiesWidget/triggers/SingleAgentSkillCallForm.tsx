import ResponseJsonViewer from '@react/features/agent-settings/components/CapabilitiesWidget/meta/ResponseJsonViewer';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import { generateComponentInputsSchema } from '@react/features/agent-settings/utils';
import AgentComponentInput from '@react/features/agent-settings/utils/AgentComponentInput';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { Component } from '@react/shared/types/agent-data.types';
import { useMutation } from '@tanstack/react-query';
import { Form, Formik } from 'formik';
import Prism from 'react-syntax-highlighter/dist/esm/prism';

type Props = {
  component: Component;
};

const SingleAgentSkillCallForm = ({ component }: Props) => {
  const { agentId } = useAgentSettingsCtx();
  const inputs = component.inputs;

  const callSkillMutation = useMutation({
    mutationFn: async (values: any) => {
      return await fetch(`/api/page/agent_settings/ai-agent/${agentId}/skill-call`, {
        method: 'POST',
        body: JSON.stringify({
          payload: values,
          componentId: component.id,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((res) => res.json());
    },
    mutationKey: ['call_skill', component.id],
  });

  const dynamicValidationSchema = generateComponentInputsSchema(inputs);

  const initialValues = inputs.reduce((acc, input) => {
    return {
      ...acc,
      [input.name]: '',
    };
  }, {});

  const handleSubmit = async (values: any) => {
    try {
      await callSkillMutation.mutateAsync(values);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={dynamicValidationSchema}
      onSubmit={handleSubmit}
    >
      {({
        resetForm,
        isSubmitting,
        dirty,
        setFieldValue,
        isValid,
        values,
        errors,
        handleChange,
        handleBlur,
        touched,
      }) => (
        <Form className="flex flex-col justify-between mt-6 gap-4">
          {inputs.map((input) => {
            return (
              <AgentComponentInput
                addTypeBadge
                input={input}
                key={input.name}
                // @ts-ignore
                error={
                  errors[input.name] &&
                  touched[input.name] &&
                  typeof errors[input.name] === 'string' &&
                  errors[input.name]
                }
                value={values[input.name] || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                onFileChange={(event: any) => {
                  if (!event.currentTarget.files) return;

                  // setFieldValue(input.name, event.currentTarget.files[0]);
                  // convert to base64
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    setFieldValue(input.name, e.target?.result);
                  };
                  reader.readAsDataURL(event.currentTarget.files[0]);
                }}
              />
            );
          })}

          {/* {response json} */}
          {callSkillMutation.isSuccess && (
            <div>
              <label className="mb-1">Response</label>
              <ResponseJsonViewer
                SyntaxHighlighter={Prism}
                response={callSkillMutation.data?.response}
              />
            </div>
          )}

          {/* {submission error span} */}
          {callSkillMutation.isError && (
            <span className="text-red-500 text-sm">
              {(callSkillMutation?.error as any)?.error?.message ?? 'Something went wrong'}
            </span>
          )}

          <div className="flex gap-3 mt-4 ">
            <Button
              type="submit"
              disabled={isSubmitting || callSkillMutation.isLoading || !isValid}
              label={'Call Endpoint'}
              loading={callSkillMutation.isLoading}
              variant="primary"
              fullWidth
            />
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default SingleAgentSkillCallForm;
