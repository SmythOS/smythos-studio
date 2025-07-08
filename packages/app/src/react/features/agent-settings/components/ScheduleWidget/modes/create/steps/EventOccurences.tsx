import {
  DaySelector,
  RadioButton,
  UnitNumberInput,
  UnitSelector,
  baseStyle,
} from '@react/features/agent-settings/components/ScheduleWidget/meta/Mini-Components';
import SectionHeader from '@react/features/agent-settings/components/ScheduleWidget/meta/SectionTitle';
import {
  SchedulerFormData,
  StepChildMethods,
  StepProps,
} from '@react/features/agent-settings/components/ScheduleWidget/modes/create/CreateSchedule';
import { Datepicker } from 'flowbite-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BiSolidDownArrow, BiSolidUpArrow } from 'react-icons/bi';

const divStyle = {
  fontSize: '14px',
  borderRadius: '5px',
  maxHeight: '435px',
  background: 'white',
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
            onChange={(e) => {
              const newRepeatOption = e.target.value as 'no-repeat' | 'repeat';
              setOptionsData((prev) => {
                return {
                  ...prev,
                  shouldRepeat: newRepeatOption === 'repeat',
                };
              });
            }}
            style={{ ...baseStyle, width: '150px', height: '36px' }}
            className="w-full appearance-none block border-none rounded pr-8 leading-tight focus:outline-none focus:bg-gray focus:border-gray-500"
          >
            <option value="no-repeat">No Repeat</option>
            <option value="repeat">Repeat</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg
              width="12"
              height="12"
              viewBox="0 0 7 4"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.48846 3.99268L0.467366 0.468627L6.50956 0.468628L3.48846 3.99268Z"
                fill="#696969"
              />
            </svg>
          </div>
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
                        <Datepicker
                          name="date"
                          value={Intl.DateTimeFormat().format(
                            new Date(optionsData.endDate || defaultEndOnDate),
                          )}
                          onSelectedDateChanged={(date) => {
                            // actions.handleFormDataChange({ endDate: date.toISOString() });
                            setOptionsData((prev) => ({ ...prev, endDate: date.toISOString() }));
                          }}
                          showTodayButton
                          minDate={defaultEndOnDate}
                          placeholder="Select a date"
                          className="w-full"
                          disabled={optionsData.endOption !== 'on-date'} // Disable datepicker if not 'On' option
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
                          style={{
                            ...baseStyle,
                            textAlign: 'center',
                            width: '150px',
                            height: '36px',
                          }}
                          className="rounded leading-tight border-none focus:outline-none focus:border-gray-500"
                          disabled={optionsData.endOption !== 'on-after-occurrences'} // Disable input if not 'After' option
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
