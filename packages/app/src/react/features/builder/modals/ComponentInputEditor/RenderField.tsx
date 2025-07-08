import classNames from 'classnames';
import { Checkbox, Label, Select, TextInput, Textarea } from 'flowbite-react';
import { ErrorMessage, FormikProps } from 'formik';
import { FC, ReactNode, useEffect, useRef } from 'react';

/**
 * Type definitions for field configuration and props
 */
type FieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'color' | 'input';

interface FieldConfig {
  type: FieldType;
  label?: string;
  value: string | number | boolean;
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
  events?: Record<string, (e: any) => void>;
}

interface RenderFieldProps {
  fieldId: string;
  fieldConfig: FieldConfig;
  formikProps: FormikProps<Record<string, unknown>>;
}

/**
 * Processes field attributes to separate style from other props
 */
const processAttributes = (attributes?: Record<string, string>) => {
  if (!attributes) return { props: {}, style: {} };

  const style = attributes.style
    ? attributes.style.split(';').reduce(
        (acc, style) => {
          const [property, value] = style.split(':').map((str) => str.trim());
          if (property && value) {
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

/**
 * RenderField component handles rendering of individual form fields
 */
export const RenderField: FC<RenderFieldProps> = ({ fieldId, fieldConfig, formikProps }) => {
  const inputRef = useRef<any>(null);
  const { handleChange, handleBlur, setFieldValue, values, errors, touched } = formikProps;
  const { props: attributes, style } = processAttributes(fieldConfig.attributes);

  const { events } = fieldConfig;

  useEffect(() => {
    if (events && inputRef.current) {
      Object.entries(events).forEach(([event, handler]) => {
        console.log('Adding event listener', event, handler);
        inputRef.current.addEventListener(event, handler);
      });
    }
  }, [events]);

  /**
   * Common props shared across input components
   */
  const commonProps = {
    id: fieldId,
    name: fieldId,
    onChange: handleChange,
    onBlur: handleBlur,
    color: touched[fieldId] && errors[fieldId] ? 'failure' : undefined,
    style,
    ...attributes,
  };

  /**
   * Renders the field label with optional help text
   */
  const renderLabel = () => (
    <div className={classNames('mb-2 block')}>
      <Label htmlFor={fieldId} value={fieldConfig.label || fieldId}>
        {fieldConfig.help && (
          <span className="ml-1 text-sm text-gray-500" title={fieldConfig.help}>
            ⓘ
          </span>
        )}
      </Label>
    </div>
  );

  /**
   * Renders error message for the field
   */
  const renderError = () => (
    <ErrorMessage name={fieldId} component="div" className="mt-1 text-sm text-red-500" />
  );

  /**
   * Wraps the input component with consistent styling and structure
   */
  const renderInputWrapper = (input: ReactNode) => (
    <div
      key={fieldId}
      className={classNames('mb-4', fieldConfig.class, 'form-box')}
      data-field-name={fieldId}
    >
      {renderLabel()}
      {input}
      {renderError()}
    </div>
  );

  /**
   * Renders the appropriate input component based on field type
   */
  switch (fieldConfig.type) {
    case 'textarea':
      return renderInputWrapper(
        <Textarea
          {...commonProps}
          value={values[fieldId]?.toString() ?? ''}
          rows={4}
          className={classNames('resize-y')}
          ref={inputRef}
        />,
      );

    case 'select':
      return renderInputWrapper(
        <Select {...commonProps} value={values[fieldId]?.toString() ?? ''} ref={inputRef}>
          {fieldConfig.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.text}
            </option>
          ))}
        </Select>,
      );

    case 'checkbox':
      return renderInputWrapper(
        <Checkbox
          {...commonProps}
          checked={Boolean(values[fieldId])}
          onChange={(e) => setFieldValue(fieldId, e.target.checked)}
          ref={inputRef}
        />,
      );

    case 'color':
      return renderInputWrapper(
        <input
          type="color"
          {...commonProps}
          value={values[fieldId]?.toString() ?? '#000000'}
          className={classNames('h-[38px] w-full rounded-lg')}
          ref={inputRef}
        />,
      );

    default:
      return renderInputWrapper(
        <TextInput
          {...commonProps}
          value={values[fieldId]?.toString() ?? ''}
          type={fieldConfig.type}
          ref={inputRef}
        />,
      );
  }
};

export default RenderField;
