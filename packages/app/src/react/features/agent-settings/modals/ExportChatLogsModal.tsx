import { Dialog, Transition } from '@headlessui/react';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { Spinner } from '@react/shared/components/ui/spinner';
import { successToast } from '@src/shared/components/toast';
import { useMutation } from '@tanstack/react-query';
import React, { Fragment, useState } from 'react';
import { FaCalendarAlt, FaDownload, FaFilter } from 'react-icons/fa';
import { IoIosInformationCircle } from 'react-icons/io';
import { IoClose } from 'react-icons/io5';

interface IFormValues {
  startDate: string;
  endDate: string;
  environment: 'prod' | 'test';
  useDateFilter: boolean;
}

interface IExportLogsModalProps {
  onClose: () => void;
  agentId: string;
}

/**
 * Gets the date from 30 days ago in YYYY-MM-DD format
 */
const getDefaultStartDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
};

const ExportChatLogsModal = ({ onClose, agentId }: IExportLogsModalProps) => {
  const [formValues, setFormValues] = useState<IFormValues>({
    startDate: getDefaultStartDate(), // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // Today
    environment: 'prod',
    useDateFilter: true,
  });
  const [errors, setErrors] = useState<Partial<IFormValues>>({});

  const exportLogsMutation = useMutation({
    mutationFn: async (data: IFormValues) => {
      const queryParams = new URLSearchParams({
        env: data.environment,
      });

      // Only add date range if user enabled date filtering
      if (data.useDateFilter && data.startDate && data.endDate) {
        const startTimestamp = new Date(data.startDate).getTime();
        // Set end timestamp to end of the selected day (23:59:59.999)
        const endDate = new Date(data.endDate);
        endDate.setHours(23, 59, 59, 999);
        const endTimestamp = endDate.getTime();
        const dateRange = `${startTimestamp},${endTimestamp}`;
        queryParams.append('dateRange', dateRange);
      }

      const response = await fetch(
        `/api/page/agent_settings/ai-agent/${agentId}/export-logs?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'X-AGENT-ID': agentId,
          },
        },
      );

      if (!response.ok) {
        let errorMessage = 'Failed to export logs';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Get the JSON data from the response
      const jsonData = await response.json();
      console.log('jsonData', jsonData);

      // Convert JSON data to a formatted string
      const jsonString = JSON.stringify(jsonData, null, 2);

      // Create blob from the JSON string
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Create filename based on whether date filter is used
      const dateString =
        data.useDateFilter && data.startDate && data.endDate
          ? `${data.startDate}-to-${data.endDate}`
          : 'all-time';
      link.download = `chat-export-${data.environment}-${dateString}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return response;
    },
    onSuccess: () => {
      successToast('Chat logs exported successfully');
      onClose();
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<IFormValues> = {};

    // Only validate dates if date filter is enabled
    if (formValues.useDateFilter) {
      if (!formValues.startDate) {
        newErrors.startDate = 'Start date is required when using date filter';
      }

      if (!formValues.endDate) {
        newErrors.endDate = 'End date is required when using date filter';
      }

      if (formValues.startDate && formValues.endDate) {
        const startDate = new Date(formValues.startDate);
        const endDate = new Date(formValues.endDate);

        if (startDate > endDate) {
          newErrors.endDate = 'End date must be after start date';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      exportLogsMutation.mutate(formValues);
    }
  };

  const handleInputChange = (field: keyof IFormValues, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const inputClassName = `bg-white 
    border
    text-gray-900
    rounded-lg
    block 
    w-full
    outline-none
    focus:outline-none
    focus:ring-2
    focus:ring-blue-500
    focus:border-blue-500
    text-sm 
    font-normal
    placeholder:text-sm
    placeholder:font-normal
    px-3 py-2.5
    border-gray-300 
    transition-colors
    disabled:bg-gray-50 
    disabled:text-gray-500 
    disabled:cursor-not-allowed`;

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="w-full max-w-md">
                <Dialog.Panel className="w-full relative transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-semibold text-center leading-6 text-[#1E1E1E] mb-6 flex justify-between items-center"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <FaDownload className="text-blue-600 w-5 h-5" />
                      </div>
                      <span>Export Chat Logs</span>
                    </div>

                    <IoClose className="cursor-pointer" size={24} onClick={onClose} />
                  </Dialog.Title>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Environment Selection */}
                    <div>
                      <label
                        htmlFor="environment"
                        className="block text-[#1E1E1E] mb-1 text-base font-normal"
                      >
                        Environment
                      </label>
                      <select
                        id="environment"
                        className={inputClassName}
                        value={formValues.environment}
                        onChange={(e) =>
                          handleInputChange('environment', e.target.value as 'prod' | 'test')
                        }
                      >
                        <option value="prod">Production</option>
                        <option value="test">Test</option>
                      </select>
                    </div>

                    {/* Date Filter Toggle */}
                    <div className="border border-gray-200 rounded-lg py-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FaFilter className="text-[#1E1E1E] w-4 h-4" />
                          <span className="text-[#1E1E1E] text-base font-normal">
                            Date Range Filter
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formValues.useDateFilter}
                            onChange={(e) => handleInputChange('useDateFilter', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {formValues.useDateFilter ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm text-[#616161] mb-3">
                            <FaCalendarAlt className="text-[#616161] w-4 h-4" />
                            <span>Select the date range for your export</span>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label
                                htmlFor="startDate"
                                className="block text-[#1E1E1E] mb-1 text-base font-normal"
                              >
                                Start Date
                              </label>
                              <input
                                type="date"
                                id="startDate"
                                className={inputClassName}
                                value={formValues.startDate}
                                onChange={(e) => handleInputChange('startDate', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                min={new Date('2020-01-01').toISOString().split('T')[0]}
                              />
                              {errors.startDate && (
                                <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor="endDate"
                                className="block text-[#1E1E1E] mb-1 text-base font-normal"
                              >
                                End Date
                              </label>
                              <input
                                type="date"
                                id="endDate"
                                className={inputClassName}
                                value={formValues.endDate}
                                onChange={(e) => handleInputChange('endDate', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                min={formValues.startDate}
                              />
                              {errors.endDate && (
                                <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-[#616161]">
                            All conversations will be exported
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Info Message */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <IoIosInformationCircle className="text-blue-500 w-6 h-6" />

                        <div className="text-sm text-blue-700 flex-1">
                          <p className="font-medium mb-1">Export Details</p>
                          <p>
                            {formValues.useDateFilter
                              ? 'Chat conversations within the selected date range will be exported.'
                              : 'All chat conversations will be exported.'}{' '}
                            The file will be downloaded as a JSON file.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end w-full">
                      <Button
                        className="px-8 h-[48px] rounded-lg"
                        type="submit"
                        label={exportLogsMutation.isLoading ? 'Exporting...' : 'Export'}
                        addIcon={exportLogsMutation.isLoading}
                        Icon={
                          exportLogsMutation.isLoading ? (
                            <Spinner classes="w-4 h-4" />
                          ) : (
                            <FaDownload className="w-4 h-4" />
                          )
                        }
                        disabled={exportLogsMutation.isLoading}
                      />
                    </div>
                    {exportLogsMutation.isError && (
                      <div className="text-red-500 text-sm mt-1">
                        {(exportLogsMutation.error as any).message}
                      </div>
                    )}
                  </form>
                </Dialog.Panel>
              </div>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ExportChatLogsModal;
