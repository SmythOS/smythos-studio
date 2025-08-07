import {
  DaySelector,
  RadioButton,
  UnitNumberInput,
  UnitSelector,
} from '@react/features/agent-settings/components/ScheduleWidget/meta/Mini-Components';
import SectionHeader from '@react/features/agent-settings/components/ScheduleWidget/meta/SectionTitle';
import {
  SchedulerFormData,
  StepChildMethods,
  StepProps,
} from '@react/features/agent-settings/components/ScheduleWidget/modes/create/CreateSchedule';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BiSolidDownArrow, BiSolidUpArrow } from 'react-icons/bi';

const divStyle = {
  fontSize: '14px',
  borderRadius: '5px',
  maxHeight: '435px',
};

const unitOptions = [
  {
    labelSingular: 'minute',
    labelPlural: 'minutes',
    value: 'min',
    min: 5,
    max: Infinity,
  },
  {
    labelSingular: 'hour',
    labelPlural: 'hours',
    value: 'hour',
    min: 1,
    max: Infinity,
  },
  {
    labelSingular: 'week',
    labelPlural: 'weeks',
    value: 'week',
    min: 1,
    max: 1,
    default: 1,
  },
];

const defaultUnitGp = unitOptions.find((unit) => unit.default);

const EventOccurences = forwardRef<StepChildMethods, StepProps>(
  ({ actions, formData: formData }, ref) => {
    const currDayIndx = new Date().getDay();
    const repeatElementRef = useRef<HTMLDivElement>(null);

    type OptionsData = Pick<
      SchedulerFormData,
      | 'shouldRepeat'
      | 'repeatEvery'
      | 'repeatLimit'
      | 'endDate'
      | 'daysOfWeek'
      | 'repeatEveryUnit'
      | 'endOption'
    >;

    const [optionsData, setOptionsData] = useState<OptionsData>({
      shouldRepeat: formData.shouldRepeat || false,
      daysOfWeek: formData.daysOfWeek || [currDayIndx],
      endOption: formData.endOption || 'never',
      repeatLimit: formData.repeatLimit || 1,
      repeatEveryUnit: formData.repeatEveryUnit || (defaultUnitGp.value as any),
      repeatEvery: formData.repeatEvery || defaultUnitGp.min,
    });

    const defaultEndOnDate = new Date(+new Date() + 1 * 24 * 60 * 60 * 1000);

    const currRepeatUnitGp =
      unitOptions.find((unit) => unit.value === optionsData.repeatEveryUnit) || defaultUnitGp;

    useEffect(() => {
      actions.setCanSubmit(true);
    }, []);

    // It was causing a bug on the builder page and causing layout issues. Uncomment if it can be fixed.
    // useEffect(
    //   function scrollToStepView() {
    //     const repeatHolder = repeatElementRef.current;
    //     if (!repeatHolder) return;

    //     repeatHolder.scrollIntoView({ behavior: 'smooth', block: 'start' });
    //   },
    //   [optionsData.shouldRepeat],
    // );

    useImperativeHandle(ref, () => ({
      handleBeforeStepChange: () => {
        // save form data

        actions.handleFormDataChange({
          // repeatEvery: count,
          shouldRepeat: optionsData.shouldRepeat,
          endDate: optionsData.endOption === 'on-date' ? optionsData.endDate : null,
          daysOfWeek: optionsData.daysOfWeek,
          endOption: optionsData.endOption,
          repeatLimit:
            optionsData.endOption === 'on-after-occurrences' ? optionsData.repeatLimit : null,
          repeatEvery: optionsData.repeatEvery,
          repeatEveryUnit: optionsData.repeatEveryUnit,
        });
      },
    }));

    function RepeatOptionSelector() {
      return (
        <div className="mb-4">
          <select
            value={optionsData.shouldRepeat ? 'repeat' : 'no-repeat'}
            className={`py-2 px-3 border text-gray-900 rounded block w-full h-[36px] outline-none
              focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none
              text-sm font-normal placeholder:text-sm placeholder:font-normal box-border mb-[1px] focus:mb-0
              border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500`}
            onChange={(e) => {
              const newRepeatOption = e.target.value as 'no-repeat' | 'repeat';
              setOptionsData((prev) => {
                return {
                  ...prev,
                  shouldRepeat: newRepeatOption === 'repeat',
                };
              });
            }}
          >
            <option value="no-repeat">No Repeat</option>
            <option value="repeat">Repeat</option>
          </select>
        </div>
      );
    }

    return (
      <div style={divStyle}>
        <SectionHeader
          title="New Routine"
          subtitle="How often and when does your agent's routine kick off?"
        />
        <div className="mt-6">
          <RepeatOptionSelector />
          {optionsData.shouldRepeat && (
            <>
              <div className="flex flex-col mb-4" ref={repeatElementRef}>
                {/* <label className="relative inline-flex items-center cursor-pointer ">


                                <input
                                    type="checkbox"
                                    value=""
                                    checked={optionsData.useInterval}
                                    onChange={(e) => {
                                        setOptionsData((prev) => {
                                            return { ...prev, useInterval: e.target.checked };
                                        });
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-[#1a73e8]"></div>
                            </label> */}
                <span className="text-sm text-gray-700 dark:text-gray-300 mr-3">Repeat Every</span>
                <div className="flex items-center mb-4 mt-3">
                  <UnitNumberInput
                    count={optionsData.repeatEvery}
                    onChange={(newCount) => {
                      setOptionsData((prev) => {
                        return { ...prev, repeatEvery: newCount };
                      });
                    }}
                    unit={optionsData.repeatEveryUnit}
                    min={currRepeatUnitGp.min}
                    max={currRepeatUnitGp.max}
                  />
                  <div className="ml-1 mr-1 flex flex-col items-center">
                    <button
                      onClick={() => {
                        setOptionsData((prev) => {
                          return {
                            ...prev,
                            repeatEvery: Math.min(
                              currRepeatUnitGp.max || Infinity,
                              (prev.repeatEvery || 0) + 1,
                            ),
                          };
                        });
                      }}
                      className="p-1 disabled:opacity-50"
                      disabled={optionsData.repeatEvery === currRepeatUnitGp.max}
                    >
                      <BiSolidUpArrow fontSize={10} color="#696969" />
                    </button>
                    <button
                      onClick={() => {
                        setOptionsData((prev) => {
                          return {
                            ...prev,
                            repeatEvery: Math.max(
                              currRepeatUnitGp.min,
                              (prev.repeatEvery || 0) - 1,
                            ),
                          };
                        });
                      }}
                      className="p-1 disabled:opacity-50"
                      disabled={optionsData.repeatEvery === currRepeatUnitGp.min}
                    >
                      <BiSolidDownArrow fontSize={10} color="#696969" />
                    </button>
                  </div>
                  <UnitSelector
                    unit={optionsData.repeatEveryUnit}
                    unitOptions={unitOptions}
                    currentCount={optionsData.repeatEvery}
                    onChange={(newUnit) => {
                      setOptionsData((prev) => {
                        return {
                          ...prev,
                          repeatEveryUnit: newUnit,
                          repeatEvery: unitOptions.find((unit) => unit.value === newUnit)?.min || 1,
                        };
                      });
                    }}
                  />
                </div>
              </div>
              {/* REPEAT ON PART */}
              <h3 className="text-gray-700 mb-1">Repeat on</h3>
              <DaySelector
                selectedDaysIndices={optionsData.daysOfWeek}
                toggleDay={(weekDayIndx) => {
                  setOptionsData((prev) => {
                    let selectedCount = prev.daysOfWeek.length;
                    // Ensure at least one day is selected
                    if (prev.daysOfWeek.includes(weekDayIndx) && selectedCount === 1) {
                      return prev;
                    }

                    const newSelectedDays = new Set(prev.daysOfWeek);
                    newSelectedDays.has(weekDayIndx)
                      ? newSelectedDays.delete(weekDayIndx)
                      : newSelectedDays.add(weekDayIndx);
                    return {
                      ...prev,
                      daysOfWeek: Array.from(newSelectedDays).sort(),
                    };
                  });
                }}
              />
              {/* ENDS ON PART */}
              <div className="mb-4 mt-2">
                <h3 className="text-gray-700 mb-1">Ends</h3>

                <div className="flex flex-col mt-2">
                  <RadioButton
                    name="endOption"
                    value="never"
                    checked={optionsData.endOption === 'never'}
                    onChange={() => setOptionsData((prev) => ({ ...prev, endOption: 'never' }))} // actions.handleFormDataChange({ repeatLimit: null, endDate: null })}
                    label="Never"
                  />
                  <RadioButton
                    name="endOption"
                    value="on-date"
                    checked={optionsData.endOption === 'on-date'}
                    onChange={() => {
                      // actions.handleFormDataChange({
                      //     repeatLimit: null,
                      //     endDate: new Date().toISOString(),
                      // });
                      setOptionsData((prev) => ({
                        ...prev,
                        endDate: prev.endDate || defaultEndOnDate.toISOString(),
                        endOption: 'on-date',
                      }));
                    }}
                    label="On"
                    content={
                      <div className="max-w-[135px] ml-4">
                        <input
                          type="date"
                          name="date"
                          value={
                            optionsData.endDate
                              ? new Date(optionsData.endDate).toISOString().split('T')[0]
                              : defaultEndOnDate.toISOString().split('T')[0]
                          }
                          onChange={(e) => {
                            const selectedDate = new Date(e.target.value);
                            setOptionsData((prev) => ({
                              ...prev,
                              endDate: selectedDate.toISOString(),
                            }));
                          }}
                          min={defaultEndOnDate.toISOString().split('T')[0]}
                          disabled={optionsData.endOption !== 'on-date'}
                          className={`py-2 px-3 border text-gray-900 rounded block w-full outline-none
                            focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none
                            text-sm font-normal placeholder:text-sm placeholder:font-normal box-border mb-[1px] focus:mb-0
                            border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500
                            ${
                              optionsData.endOption !== 'on-date'
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                        />
                      </div>
                    }
                  />
                  <RadioButton
                    name="endOption"
                    value="on-after-occurrences"
                    checked={optionsData.endOption === 'on-after-occurrences'}
                    onChange={() => {
                      // setEndOption('on-after-occurrences');
                      // actions.handleFormDataChange({
                      //     endDate: null,
                      //     repeatLimit: 1,
                      // });
                      setOptionsData((prev) => ({
                        ...prev,
                        repeatLimit: prev.repeatLimit || 1,
                        endOption: 'on-after-occurrences',
                      }));
                    }}
                    label="After"
                    content={
                      <div className="flex items-center ml-4">
                        <input
                          type="text"
                          // value={occurrences === 1 ? `${occurrences} occurrence` : `${occurrences} occurrences`}
                          value={
                            optionsData.repeatLimit === 1
                              ? `${optionsData.repeatLimit} occurrence`
                              : `${optionsData.repeatLimit} occurrences`
                          }
                          readOnly
                          disabled={optionsData.endOption !== 'on-after-occurrences'} // Disable input if not 'After' option
                          className={`py-2 px-3 border text-gray-900 rounded block w-[150px] h-[36px] outline-none
                            focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none
                            text-sm font-normal placeholder:text-sm placeholder:font-normal box-border mb-[1px] focus:mb-0
                            border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500
                            text-center
                            ${
                              optionsData.endOption !== 'on-after-occurrences'
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                        />
                        <div className="ml-1 flex flex-col items-center">
                          <button
                            onClick={() => {
                              if (optionsData.endOption !== 'on-after-occurrences') return;
                              // setOccurrences(occurrences + 1);
                              setOptionsData((prev) => {
                                return { ...prev, repeatLimit: prev.repeatLimit + 1 };
                              });
                            }}
                            className="p-1 disabled:opacity-50"
                            disabled={optionsData.endOption !== 'on-after-occurrences'}
                          >
                            <BiSolidUpArrow fontSize={10} color="#696969" />
                          </button>
                          <button
                            onClick={() => {
                              if (optionsData.endOption !== 'on-after-occurrences') return;
                              // setOccurrences(occurrences > 1 ? occurrences - 1 : 1);
                              setOptionsData((prev) => {
                                return { ...prev, repeatLimit: Math.max(1, prev.repeatLimit - 1) };
                              });
                            }}
                            className="p-1 disabled:opacity-50"
                            disabled={
                              optionsData.endOption !== 'on-after-occurrences' ||
                              optionsData.repeatLimit === 1
                            }
                          >
                            <BiSolidDownArrow fontSize={10} color="#696969" />
                          </button>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  },
);

export default EventOccurences;
