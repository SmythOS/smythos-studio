import { generateComponentInputsSchema } from '@src/react/features/agent-settings/utils';
import AgentComponentInput from '@src/react/features/agent-settings/utils/AgentComponentInput';
import { useEndpointFormPreview } from '@src/react/features/builder/contexts/endpoint-form-preview-sidebar.context';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { Observability } from '@src/shared/observability';
import { Form, Formik } from 'formik';
import { useEffect, useRef } from 'react';
/**
 * Component for rendering and handling the form fill view
 */

const FormFill = ({ setIsFormVisible }: { setIsFormVisible: (value: boolean) => void }) => {
  const runButtonRef = useRef<HTMLButtonElement>(null);
  const { selectedSkill, callSkillMutation, setView, setLastFormValues, mode, agentSkillErrors } =
    useEndpointFormPreview();

  const dynamicValidationSchema = generateComponentInputsSchema(selectedSkill?.inputsTypes);
  const handleSubmit = async (values: any, { resetForm }: { resetForm: () => void }) => {
    setIsFormVisible(false);
    Observability.observeInteraction('app_form_preview_run_button_click', {});
    callSkillMutation.mutate(values, {
      onSuccess: () => {
        Observability.observeInteraction('app_workflow_test_completed', {
          status: 'success',
          source: 'form preview',
        });
        setLastFormValues(values);
        setView('home');
      },
      onError: () => {
        Observability.observeInteraction('app_workflow_test_completed', {
          status: 'failed',
          source: 'form preview',
        });
        setLastFormValues(values);
        setView('home');
      },
    });
  };

  useEffect(() => {
    if (!callSkillMutation.isLoading && agentSkillErrors.length > 0) {
      setIsFormVisible(true);
    }
  }, [callSkillMutation.isLoading, agentSkillErrors]);

  useEffect(() => {
    if (runButtonRef.current) {
      runButtonRef.current.focus();
    }
  }, [runButtonRef]);

  const initialValues = selectedSkill?.inputsTypes.reduce((acc, input) => {
    return {
      ...acc,
      [input.name]: selectedSkill?.autoFillDataJson?.[input.name] || '',
    };
  }, {});

  return (
    <div>
      <Formik
        initialValues={initialValues}
        validationSchema={dynamicValidationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
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
        }) => {
          return (
            <Form className="flex flex-col justify-between mt-2 gap-4">
              {selectedSkill?.inputsTypes.map((input) => {
                return (
                  <AgentComponentInput
                    placeholder="value"
                    // addTypeBadge
                    input={input}
                    key={input.name}
                    // @ts-ignore
                    error={
                      errors[input.name] &&
                      touched[input.name] &&
                      // @ts-ignore
                      (console.log(touched, errors) || true) &&
                      typeof errors[input.name] === 'string' &&
                      errors[input.name]
                    }
                    value={values[input.name] || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    // on focus, if the input value is using the autoFillDataJson, highlight the whole input
                    onFocus={(e) => {
                      const currentValue = values[input.name];
                      const autoFillValue = selectedSkill?.autoFillDataJson?.[input.name];
                      if (currentValue === autoFillValue) {
                        e.target.select();
                      }
                    }}
                    fileOps={{
                      inputVersion: 'v2',
                      onChange: (value) => {
                        setFieldValue(input.name, value);
                      },
                    }}
                    {...input}
                  />
                );
              })}

              <div className="flex gap-3 mt-4 ">
                <Button
                  type="submit"
                  className="justify-center flex-1"
                  disabled={
                    // isSubmitting ||
                    // !isValid ||
                    callSkillMutation.isLoading || agentSkillErrors.length > 0
                  }
                  btnRef={runButtonRef}
                  label="Run"
                  variant="primary"
                  fullWidth
                  dataAttributes={{ 'data-test': 'form-preview-run-button' }}
                />
              </div>
            </Form>
          );
        }}
      </Formik>

      <div className="flex flex-col gap-2 mt-4">
        {agentSkillErrors.map((error) => (
          <div className="text-gray-500" key={error.error_slug}>
            {error.error_message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormFill;
