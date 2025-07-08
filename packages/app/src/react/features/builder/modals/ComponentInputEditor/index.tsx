import RenderField from '@src/react/features/builder/modals/ComponentInputEditor/RenderField';
import Modal from '@src/react/shared/components/ui/modals/Modal';
import { errorToast } from '@src/shared/components/toast';
import { Button } from 'flowbite-react';
import { Form, Formik, FormikProps } from 'formik';
import * as Yup from 'yup';

type FieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'color' | 'input';

interface FieldConfig {
  type: FieldType;
  label?: string;
  value: any;
  class?: string;
  validate?: string;
  validateMessage?: string;
  options?: Array<{ value: string; text: string }>;
  attributes?: Record<string, string>;
  fieldCls?: string;
  section?: string;
  help?: string;
  cls?: string;
  required?: boolean;
}

interface ComponentInputEditorProps {
  config: {
    title?: string;
    content?: string;
    fields?: Record<string, FieldConfig>;
    btnSaveLabel?: string;
    contentClasses?: string;
  };
  onSubmit?: (values: any) => void;
}

export function ComponentInputEditor({ config, onSubmit }: ComponentInputEditorProps) {
  // Process attributes to separate style from other attributes
  const processAttributes = (attributes?: Record<string, string>) => {
    if (!attributes) return { props: {}, style: {} };

    const style = attributes.style
      ? attributes.style.split(';').reduce(
          (acc, style) => {
            const [property, value] = style.split(':').map((str) => str.trim());
            if (property && value) {
              // Convert kebab-case to camelCase
              const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
              acc[camelProperty] = value;
            }
            return acc;
          },
          {} as Record<string, string>,
        )
      : {};

    const props = { ...attributes };
    delete props.style;

    return { props, style };
  };

  const generateValidationSchema = (fields: Record<string, FieldConfig>) => {
    const schema: Record<string, any> = {};

    Object.entries(fields).forEach(([fieldId, fieldConfig]) => {
      let fieldSchema: any = Yup.mixed();

      if (fieldConfig.validate === 'required' || fieldConfig.required) {
        fieldSchema = fieldSchema.required(
          fieldConfig.validateMessage || `${fieldConfig.label || fieldId} is required`,
        );
      }

      switch (fieldConfig.type) {
        case 'checkbox':
          fieldSchema = Yup.boolean();
          break;
        case 'color':
          fieldSchema = Yup.string().matches(
            /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
            'Invalid color format',
          );
          break;
        default:
          fieldSchema = Yup.string();
      }

      schema[fieldId] = fieldSchema;
    });

    return Yup.object().shape(schema);
  };

  const generateInitialValues = (fields: Record<string, FieldConfig>) => {
    return Object.entries(fields).reduce(
      (acc, [fieldId, fieldConfig]) => ({
        ...acc,
        [fieldId]: fieldConfig.value ?? '',
      }),
      {},
    );
  };

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      onSubmit?.(values);
    } catch (error) {
      console.error('Form submission error:', error);
      errorToast('An error occurred while submitting the form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (
    fieldId: string,
    fieldConfig: FieldConfig,
    formikProps: FormikProps<Record<string, unknown>>,
  ) => {
    return <RenderField fieldId={fieldId} fieldConfig={fieldConfig} formikProps={formikProps} />;
  };

  if (!config.fields) {
    return null;
  }

  const validationSchema = generateValidationSchema(config.fields);
  const initialValues = generateInitialValues(config.fields);

  // Group fields by section
  const fieldsBySection = Object.entries(config.fields).reduce(
    (acc, [fieldId, fieldConfig]) => {
      const section = fieldConfig.section || 'Default';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push({ id: fieldId, config: fieldConfig });
      return acc;
    },
    {} as Record<string, Array<{ id: string; config: FieldConfig }>>,
  );

  return (
    <Modal
      onClose={() => onSubmit?.(null)}
      title={config.title}
      panelWrapperClasses="lg:w-[35vw] md:w-[40vw]"
      applyMaxWidth={false}
    >
      <div className="p-4">
        {config.content && <div className="mb-4">{config.content}</div>}

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formikProps) => (
            <Form className="space-y-4">
              {Object.entries(fieldsBySection).map(([section, fields]) => (
                <div key={section} className="space-y-4">
                  {section !== 'Default' && (
                    <h3 className="text-lg font-medium text-gray-900">{section}</h3>
                  )}
                  {fields.map(({ id, config }) => {
                    return (
                      <RenderField
                        fieldId={id}
                        fieldConfig={config}
                        formikProps={formikProps}
                        key={id}
                      />
                    );
                  })}
                </div>
              ))}

              <div className="flex justify-end gap-4 mt-6">
                <Button color="gray" onClick={() => onSubmit?.(null)} type="button">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary-100"
                  disabled={formikProps.isSubmitting || !formikProps.isValid}
                >
                  {config.btnSaveLabel || 'Save'}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </Modal>
  );
}

export default ComponentInputEditor;
