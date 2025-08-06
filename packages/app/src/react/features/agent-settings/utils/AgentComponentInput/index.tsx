import { Input } from '@react/shared/types/agent-data.types';
import FileOrUrlInput from '@src/react/features/agent-settings/utils/AgentComponentInput/FileOrUrlInput';
import { Badge, FileInput as FlowbiteFileInput } from 'flowbite-react';
import React from 'react';

type Props = {
  input: Input;
  error?: string;
  onFileChange?: (event: React.ChangeEvent<HTMLInputElement> | string) => void;
  inputSize?: 'sm' | 'md' | 'lg';
  addTypeBadge?: boolean;
  fileOps?:
    | {
        inputVersion?: 'v1';
        onChange?: (event: React.ChangeEvent<HTMLInputElement> | string) => void;
      }
    | {
        inputVersion: 'v2';
        onChange: (value: string) => void;
        onDelete?: () => void;
        fileName?: string | null;
        uploadLoading?: boolean;
        disableUpload?: boolean;
        deleteLoading?: boolean;
      };
} & React.InputHTMLAttributes<HTMLInputElement>;

const AgentComponentInput = ({
  input,
  error,
  onFileChange, // deprecated
  fileOps = { inputVersion: 'v1' },
  inputSize,
  addTypeBadge: addTypeBanner,
  ...props
}: Props) => {
  let inputContent = null;
  const onFileChangeHandler = fileOps.onChange || onFileChange;

  const buildAccept = (type: Input['type']) => {
    switch (type) {
      case 'Image':
        return 'image/*';
      case 'Audio':
        return 'audio/*';
      case 'Video':
        return 'video/*';
      case 'Binary':
        // accept all
        return '/*';
      default:
        return undefined;
    }
  };

  switch (input.type) {
    case 'String':
    case 'Text':
      const { type, accept, alt, capture, onChange, ...restProps } = props;
      const textareaProps: React.TextareaHTMLAttributes<HTMLTextAreaElement> = {
        value: restProps.value,
        disabled: restProps.disabled,
        placeholder: restProps.placeholder,
        className:
          restProps.className +
          ' max-h-[150px] w-full bg-white border-b text-gray-900 rounded block outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none text-sm font-normal placeholder:text-sm placeholder:font-normal px-[10px] border-gray-300 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500 resize-none',
        style: restProps.style,
        onChange: (e) => {
          if (onChange) {
            onChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
          }
        },
      };
      inputContent = (
        <textarea
          name={input.name}
          rows={1}
          ref={(textarea) => {
            if (textarea) {
              textarea.style.height = 'auto';
              textarea.style.height = `${textarea.scrollHeight + 3}px`;
            }
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight + 3}px`;
          }}
          {...textareaProps}
        />
      );
      break;
    case 'Number':
      inputContent = (
        <input
          name={input.name}
          type="number"
          className="h-9 w-full bg-white border text-gray-900 rounded block outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none text-sm font-normal placeholder:text-sm placeholder:font-normal px-[10px] border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
          {...props}
        />
      );
      break;
    case 'Binary':
    case 'Image':
    case 'Audio':
    case 'Video':
      inputContent =
        fileOps.inputVersion === 'v1' ? (
          <FlowbiteFileInput
            accept={buildAccept(input.type)}
            onChange={(event) => {
              // formik.setFieldValue(input.name, event.currentTarget.files[0]);
              onFileChangeHandler && onFileChangeHandler(event);
            }}
          />
        ) : (
          <FileOrUrlInput
            accept={buildAccept(input.type)}
            onValueChange={(value) => {
              onFileChangeHandler && onFileChangeHandler(value);
            }}
            {...props}
          />
        );
      break;
    default:
      inputContent = (
        <input
          name={input.name}
          type="text"
          className="h-9 w-full bg-white border text-gray-900 rounded block outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none text-sm font-normal placeholder:text-sm placeholder:font-normal px-[10px] border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
          {...props}
        />
      );
      break;
  }

  return (
    <div key={input.name}>
      <label className="text-gray-700 mb-1 text-sm flex items-center" htmlFor={input.name}>
        <span className="text-[#1E1E1E] text-base font-medium">
          {input.name} {input.optional ? '' : <span className="text-red-500">*</span>}
        </span>

        {addTypeBanner && (
          <Badge color="gray" className="ml-2 w-fit">
            {input.type}
          </Badge>
        )}
      </label>
      {inputContent}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default AgentComponentInput;
