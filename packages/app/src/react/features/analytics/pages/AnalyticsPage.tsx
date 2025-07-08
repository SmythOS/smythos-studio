import { useState, useEffect, useMemo } from 'react';
import UsageAnalytics from '@react/features/analytics/components/usage-analytics';
import { fetchLLMAndApiUsage } from '@react/features/analytics/client/usageAnalytics';
import { useAuthCtx } from '../../../shared/contexts/auth.context';

export interface ApiData {
  usage: {
    analytics: Array<{
      teamId: string; // Unique identifier for the team
      teamName: string; // Name of the team
      data: {
        days: {
          [date: string]: {
            agents: {
              [agentId: string]: {
                sources: {
                  [source: string]: {
                    [metric: string]: {
                      units: number;
                      cost: number;
                    };
                  };
                };
              };
            };
          };
        };
        costs: {
          [metric: string]: number; // Total costs for the team by metric
        };
      };
    }>;
    agents: Array<{
      agents: Array<{
        id: string; // Unique identifier for the agent
        name: string; // Name of the agent
        description: string; // Description of the agent
        createdAt: string; // Creation timestamp
        updatedAt: string; // Last updated timestamp
        domain: string[]; // Associated domains
        deployed: boolean; // Deployment status
      }>;
      total: number; // Total number of agents
    }>;
  };
}

const colorsArray = ['#5C19AF', '#E65D89', '#7AA5E5', '#46CEAE', '#97DF85', '#FFEF92'];

function AnalyticsPage() {
  const userContext = useAuthCtx();
  const [isLoading, setIsLoading] = useState(false);
  const [llmAndApiUsage, setLlmAndApiUsage] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<{ id: string; name: string }>({
    id: 'all-agents',
    name: 'All Agents',
  });
  const [selectedSpace, setSelectedSpace] = useState<{ id: string; name: string }>({
    id: 'all-spaces',
    name: 'All Spaces',
  });
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [dataType, setDataType] = useState<'usage' | 'tasks' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await fetchLLMAndApiUsage(userContext?.currentUserTeam?.id, selectedMonth);

      let detectedType: 'usage' | 'tasks' | null = null;

      // Loop through data to determine if it contains sources or tasks
      if (data?.usage?.analytics) {
        for (const team of data.usage.analytics) {
          if (team.data?.days) {
            for (const day of Object.values(team.data.days) as any) {
              for (const agent of Object.values(day.agents || {}) as any) {
                if ('sources' in agent) {
                  detectedType = 'usage';
                  break;
                }
                if ('tasks' in agent) {
                  detectedType = 'tasks';
                  break;
                }
              }
            }
          }
          if (detectedType) break;
        }
      }

      setLlmAndApiUsage(data);
      setDataType(detectedType);
      setIsLoading(false);
    };

    fetchData();
  }, [selectedMonth]);

  const chartData = useMemo(() => {
    if (!llmAndApiUsage) return null;

    function transformData(
      apiData: ApiData,
      selectedSpace: { id: string; name: string },
      selectedAgent: { id: string; name: string },
    ) {
      if (dataType === 'usage') {
        return transformUsageDataToStackedBar(
          apiData.usage.analytics,
          selectedSpace,
          selectedAgent,
        );
      } else if (dataType === 'tasks') {
        return transformTasksDataToStackedBar(apiData, selectedSpace, selectedAgent);
      }
    }

    return transformData(llmAndApiUsage, selectedSpace, selectedAgent);
  }, [llmAndApiUsage, selectedSpace, selectedAgent, dataType]);

  const getAllAgents = useMemo(() => {
    if (!llmAndApiUsage) return [];

    const allAgents = (apiData: ApiData, selectedSpace: { id: string; name: string }) => {
      const agentsSet = new Set<string>();

      if (selectedSpace.name === 'All Spaces') {
        apiData.usage.analytics.forEach((team) => {
          // Add null check for team.data.days
          if (team.data?.days) {
            Object.values(team.data.days).forEach((day) => {
              Object.keys(day.agents || {}).forEach((agentId) => {
                agentsSet.add(agentId);
              });
            });
          }
        });
      } else {
        const team = apiData.usage.analytics.find((team) => team.teamId === selectedSpace.id);
        if (team?.data?.days) {
          Object.values(team.data.days).forEach((day) => {
            Object.keys(day.agents || {}).forEach((agentId) => {
              agentsSet.add(agentId);
            });
          });
        }
      }

      // Create a map of agent IDs to their names
      const agentNameMap = new Map<string, string>();
      apiData.usage.agents.forEach((agentGroup) => {
        agentGroup.agents.forEach((agent) => {
          agentNameMap.set(agent.id, agent.name);
        });
      });

      return [
        { id: 'all-agents', name: 'All Agents' },
        ...Array.from(agentsSet).map((agentId) => ({
          id: agentId,
          name: agentNameMap.get(agentId) || agentId, // Fallback to ID if name not found
        })),
      ];
    };

    return allAgents(llmAndApiUsage, selectedSpace);
  }, [llmAndApiUsage, selectedSpace]);

  const handleAgentChange = (agentId: string) => {
    const agent = getAllAgents.find((agent) => agent.id === agentId);
    setSelectedAgent(agent);
  };

  const getTotalUsage = useMemo(() => {
    if (!llmAndApiUsage) return 0;

    if (dataType === 'tasks') return null;

    const totalUsage = (
      apiData: ApiData,
      selectedSpace: { id: string | null; name: string },
      selectedAgent: { id: string | null; name: string },
    ) => {
      let totalCost = 0;

      if (selectedSpace.name === 'All Spaces') {
        apiData.usage.analytics.forEach((team) => {
          // Add null check for team.data.days
          if (team.data?.days) {
            Object.values(team.data.days).forEach((day) => {
              Object.entries(day.agents || {}).forEach(([agentId, agentData]) => {
                if (selectedAgent.name === 'All Agents' || agentId === selectedAgent.id) {
                  Object.values(agentData.sources || {}).forEach((source) => {
                    Object.values(source).forEach((metric) => {
                      totalCost += metric.cost || 0;
                    });
                  });
                }
              });
            });
          }
        });
      } else {
        const team = apiData.usage.analytics.find((team) => team.teamId === selectedSpace.id);
        if (team?.data?.days) {
          Object.values(team.data.days).forEach((day) => {
            Object.entries(day.agents || {}).forEach(([agentId, agentData]) => {
              if (selectedAgent.name === 'All Agents' || agentId === selectedAgent.id) {
                Object.values(agentData.sources || {}).forEach((source) => {
                  Object.values(source).forEach((metric) => {
                    totalCost += metric.cost || 0;
                  });
                });
              }
            });
          });
        }
      }

      return totalCost;
    };

    return totalUsage(llmAndApiUsage, selectedSpace, selectedAgent);
  }, [llmAndApiUsage, selectedSpace, selectedAgent]);

  const getAllSpaces = useMemo(() => {
    if (!llmAndApiUsage) return [];

    const allSpaces = (apiData: ApiData) => {
      return [
        { id: 'all-spaces', name: 'All Spaces' },
        ...apiData.usage.analytics.map((team) => ({
          id: team.teamId,
          name: team.teamName,
        })),
      ];
    };

    return allSpaces(llmAndApiUsage);
  }, [llmAndApiUsage]);

  const handleSpaceChange = (spaceId: string) => {
    const space = getAllSpaces.find((space) => space.id === spaceId);
    setSelectedSpace(space);
    setSelectedAgent({ id: 'all-agents', name: 'All Agents' });
  };

  const handleMonthChange = (increment: number) => {
    if (isLoading) return;

    setSelectedMonth((currentDate) => {
      if (!currentDate) return new Date();
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + increment);
      return newDate;
    });
    setSelectedAgent({ id: 'all-agents', name: 'All Agents' });
    setSelectedSpace({ id: 'all-spaces', name: 'All Spaces' });
  };

  function exportToCSV(chartData, dataType) {
    if (!chartData) {
      console.warn('No chartData provided');
      return;
    }

    // 1) If dataType === 'usage', do the 5-column export
    if (dataType === 'usage') {
      // Check that we have a breakdown
      if (!chartData.labels?.length || !chartData.breakdown) {
        console.warn('No valid usage data to export');
        return;
      }

      const rows = [];
      const labelsSorted = [...chartData.labels];

      // Sort the day labels chronologically by parsing them
      labelsSorted.sort((a, b) => {
        const dA: any = new Date(`${a}, ${new Date().getFullYear()}`);
        const dB: any = new Date(`${b}, ${new Date().getFullYear()}`);
        return dA - dB;
      });

      // Build rows from breakdown
      for (const dayLabel of labelsSorted) {
        const categoryObj = chartData.breakdown[dayLabel] || {};
        for (const category of Object.keys(categoryObj)) {
          const childArr = categoryObj[category] || [];
          if (!childArr.length) {
            // skip if no sub-items
            continue;
          }
          for (const child of childArr) {
            rows.push({
              date: dayLabel,
              source: category, // e.g. "LLM", "Tasks", ...
              subCategory: child.name, // e.g. "llm:bard" or "smyth"
              units: child.units ?? 0,
              costs: child.cost ? child.cost.toFixed(5) : 0,
            });
          }
        }
      }

      if (!rows.length) {
        console.warn('No nonzero usage data to export');
        return;
      }

      // Build CSV
      const headers = ['Date', 'Source', 'Sub-Category', 'Units', 'Costs'];
      const csvLines = [headers.join(',')];
      for (const row of rows) {
        csvLines.push(`${row.date},${row.source},${row.subCategory},${row.units},${row.costs}`);
      }
      const csvContent = csvLines.join('\n');
      downloadCSV(csvContent, 'usage_analytics');

      // 2) If dataType === 'tasks', do the simpler 2-column export
    } else if (dataType === 'tasks') {
      // Check we have labels/datasets
      if (!chartData.labels?.length || !chartData.datasets?.length) {
        console.warn('No valid tasks data to export');
        return;
      }

      const csvRows = [];
      // Sort the day labels
      const sortedDateIndices = chartData.labels
        .map((date, index) => ({ date, index }))
        .sort((a, b) => {
          const dA: any = new Date(`${a.date}, ${new Date().getFullYear()}`);
          const dB: any = new Date(`${b.date}, ${new Date().getFullYear()}`);
          return dA - dB;
        });

      // For tasks, we typically have just 1 dataset: "Tasks"
      // But if you have multiple datasets, we can gather them all
      sortedDateIndices.forEach(({ date, index }) => {
        chartData.datasets.forEach((dataset) => {
          const taskValue = dataset.data[index] || 0;
          if (taskValue !== 0) {
            csvRows.push({
              date,
              tasks: taskValue,
            });
          }
        });
      });

      if (!csvRows.length) {
        console.warn('No valid tasks data to export');
        return;
      }

      const headers = ['Date', 'Tasks'];
      const csvLines = [headers.join(',')];
      for (const row of csvRows) {
        csvLines.push(`${row.date},${row.tasks}`);
      }
      const csvContent = csvLines.join('\n');
      downloadCSV(csvContent, 'tasks_analytics');
    } else {
      // If dataType is something else
      console.warn('Unknown dataType:', dataType);
    }
  }

  /**
   * Helper: downloadCSV(csvContent, filePrefix)
   * Creates a Blob from the CSV text and triggers a browser download
   */
  function downloadCSV(csvContent, filePrefix) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `${filePrefix}_${dateStr}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleExport = () => {
    const hasNoData =
      !chartData?.datasets?.length || chartData.datasets.every((dataset) => !dataset.data?.length);

    if (!hasNoData) {
      exportToCSV(chartData, dataType);
    }
  };

  function transformUsageDataToStackedBar(apiData, selectedSpace, selectedAgent) {
    // apiData => e.g. llmAndApiUsage.usage.analytics
    // If there's nothing to parse, return empty
    if (!apiData || !apiData.length) {
      return {
        labels: [],
        datasets: [],
        breakdown: {},
      };
    }

    //
    // 1) Identify all days that appear in the raw data,
    //    but only for teams that match selectedSpace
    //
    const daySet = new Set();
    for (const team of apiData) {
      // Check space
      if (selectedSpace.name !== 'All Spaces' && team.teamId !== selectedSpace.id) {
        continue; // skip
      }

      const daysObj = team?.data?.days || {};
      for (const dayStr of Object.keys(daysObj)) {
        daySet.add(dayStr);
      }
    }

    if (daySet.size === 0) {
      return {
        labels: [],
        datasets: [],
        breakdown: {},
      };
    }

    //
    // 2) Sort all days, fill in from earliest to latest
    //
    function parseDayStr(dayStr) {
      return new Date(`${dayStr}, ${new Date().getFullYear()}`);
    }

    const sortedDayStrings = [...daySet].sort(
      (a, b) => parseDayStr(a).getTime() - parseDayStr(b).getTime(),
    );
    const startDate = parseDayStr(sortedDayStrings[0]);
    const endDate = parseDayStr(sortedDayStrings[sortedDayStrings.length - 1]);

    function formatDay(dateObj) {
      return dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    }

    const allDayLabels = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      allDayLabels.push(formatDay(d));
    }

    //
    // 3) Decide on the categories (bottom -> top) + color map
    //
    const categoryOrder = ['Image Generation', 'Code', 'Tools', 'LLM', 'Weaver', 'Tasks'];

    const colorMap = {
      Tasks: '#FFEF92',
      Weaver: '#97DF85',
      LLM: '#46CEAE',
      Tools: '#7AA5E5',
      Code: '#E65D89',
      'Image Generation': '#8840E1',
    };

    //
    // 4) Prepare dayCategoryData for accumulation
    //    dayCategoryData[dayLabel][category] = { totalUnits, aggregator: {}, children: [] }
    //
    const dayCategoryData = {};
    for (const dayLabel of allDayLabels) {
      dayCategoryData[dayLabel] = {};
      for (const cat of categoryOrder) {
        dayCategoryData[dayLabel][cat] = {
          totalUnits: 0,
          aggregator: {},
          children: [],
        };
      }
    }

    // Helper function that maps (sourceKey, subKey) -> one of our 6 categories
    function getCategory(sourceKey, subKey) {
      if (sourceKey.startsWith('api:imagegen')) {
        return 'Image Generation';
      } else if (['api:serverless_code.smyth'].includes(sourceKey)) {
        return 'Code';
      } else if (sourceKey.startsWith('api:')) {
        return 'Tools';
      } else if (sourceKey.startsWith('llm:')) {
        return 'LLM';
      } else if (sourceKey === 'smyth') {
        if (subKey === 'task') return 'Tasks';
        if (subKey.startsWith('weaver')) return 'Weaver';
        return 'Tools';
      }
      return 'Tools';
    }

    //
    // 5) Accumulate usage from teams that match the selectedSpace,
    //    and agents that match the selectedAgent
    //
    for (const team of apiData) {
      // Skip if not the chosen space
      if (selectedSpace.name !== 'All Spaces' && team.teamId !== selectedSpace.id) {
        continue;
      }

      const daysObj = team?.data?.days || {};
      for (const rawDayStr of Object.keys(daysObj)) {
        const agentsObj = daysObj[rawDayStr]?.agents || {};
        const dayLabel = formatDay(parseDayStr(rawDayStr));

        // If dayLabel not in range, create a new entry
        if (!dayCategoryData[dayLabel]) {
          dayCategoryData[dayLabel] = {};
          for (const cat of categoryOrder) {
            dayCategoryData[dayLabel][cat] = {
              totalUnits: 0,
              aggregator: {},
              children: [],
            };
          }
        }

        // For each agent
        for (const agentId of Object.keys(agentsObj)) {
          // Skip if not the chosen agent
          if (selectedAgent.name !== 'All Agents' && agentId !== selectedAgent.id) {
            continue;
          }

          const sourcesObj = agentsObj[agentId]?.sources || {};
          // e.g. {"llm:gpt-4o": {"tok-in": {...}, "tok-out": {...}}}
          for (const sourceKey of Object.keys(sourcesObj)) {
            const subObj = sourcesObj[sourceKey];
            for (const subKey of Object.keys(subObj)) {
              const usage = subObj[subKey] || {};
              const units = usage.units || 0;
              const cost = usage.cost || 0;

              const cat = getCategory(sourceKey, subKey);

              // Increase total units for this category
              dayCategoryData[dayLabel][cat].totalUnits += units;

              // aggregator => group by the sourceKey
              if (!dayCategoryData[dayLabel][cat].aggregator[sourceKey]) {
                dayCategoryData[dayLabel][cat].aggregator[sourceKey] = {
                  units: 0,
                  cost: 0,
                };
              }
              dayCategoryData[dayLabel][cat].aggregator[sourceKey].units += units;
              dayCategoryData[dayLabel][cat].aggregator[sourceKey].cost += cost;
            }
          }
        }
      }
    }

    //
    // 6) Convert aggregator -> children arrays
    //
    for (const dayLabel of allDayLabels) {
      for (const cat of categoryOrder) {
        const agg = dayCategoryData[dayLabel][cat].aggregator;
        let childrenArr = Object.keys(agg).map((sourceKey) => ({
          name: sourceKey,
          units: agg[sourceKey].units,
          cost: agg[sourceKey].cost,
        }));

        // Special handling for Image Generation category to combine api:imagegen entries
        if (cat === 'Image Generation') {
          const imageGenEntries = childrenArr.filter((entry) =>
            entry.name.startsWith('api:imagegen'),
          );
          const otherEntries = childrenArr.filter(
            (entry) => !entry.name.startsWith('api:imagegen'),
          );

          if (imageGenEntries.length > 0) {
            const combinedImageGen = {
              name: 'api:imagegen',
              units: imageGenEntries.reduce((sum, entry) => sum + entry.units, 0),
              cost: imageGenEntries.reduce((sum, entry) => sum + entry.cost, 0),
            };
            childrenArr = [...otherEntries, combinedImageGen];
          }
        }

        dayCategoryData[dayLabel][cat].children = childrenArr;
      }
    }

    //
    // 7) Build final datasets in the correct order with the correct colors
    //
    const datasets = categoryOrder.map((cat) => ({
      label: cat,
      data: allDayLabels.map((lbl) => dayCategoryData[lbl][cat].totalUnits),
      backgroundColor: colorMap[cat] || '#CCCCCC',
    }));

    //
    // 8) Build a "breakdown" object for advanced tooltip usage
    //
    const breakdown = {};
    for (const dayLabel of allDayLabels) {
      breakdown[dayLabel] = {};
      for (const cat of categoryOrder) {
        breakdown[dayLabel][cat] = dayCategoryData[dayLabel][cat].children;
      }
    }

    // 9) Return the final chart data
    return {
      labels: allDayLabels,
      datasets,
      breakdown,
    };
  }

  function transformTasksDataToStackedBar(apiData, selectedSpace, selectedAgent) {
    const transformed: any = {
      labels: [],
      datasets: [],
    };

    // 1) Build a map from "Tasks" -> [ array of daily sums ]
    //    We only have one dataset, "Tasks".
    const taskMap = new Map<string, number[]>();

    // 2) Collect all unique labels (days)
    const allDays = new Set<string>();
    for (const team of apiData.usage.analytics) {
      if (!team.data?.days) continue;
      Object.keys(team.data.days).forEach((day) => allDays.add(day));
    }

    // Sort the day labels so they're in ascending order
    transformed.labels = Array.from(allDays).sort();

    // 3) Populate the sums
    for (const team of apiData.usage.analytics) {
      // Skip spaces that aren't selected (unless "All Spaces")
      if (selectedSpace.name !== 'All Spaces' && team.teamId !== selectedSpace.id) continue;
      if (!team.data?.days) continue;

      for (const [day, dayData] of Object.entries(team.data.days || {}) as any) {
        const agents = dayData.agents || {};
        for (const [agentId, agent] of Object.entries(agents) as any) {
          // Skip agents that aren't selected (unless "All Agents")
          if (selectedAgent.name !== 'All Agents' && agentId !== selectedAgent.id) continue;

          if ('tasks' in agent) {
            // If we haven't created the array for "Tasks" yet, do so
            if (!taskMap.has('Tasks')) {
              taskMap.set('Tasks', Array(transformed.labels.length).fill(0));
            }
            const taskArray = taskMap.get('Tasks');
            const dayIndex = transformed.labels.indexOf(day);
            if (dayIndex >= 0) {
              taskArray[dayIndex] += agent.tasks || 0;
            }
          }
        }
      }
    }

    // 4) Convert taskMap to final datasets
    for (const [taskLabel, taskData] of taskMap.entries()) {
      transformed.datasets.push({
        label: taskLabel,
        data: taskData.map((value) => value || 0),
        backgroundColor: '#FFEF92', // your color for tasks
      });
    }

    return transformed;
  }

  return (
    <UsageAnalytics
      isLoading={isLoading}
      allSpaces={getAllSpaces}
      selectedSpace={selectedSpace}
      setSelectedSpace={handleSpaceChange}
      allAgents={getAllAgents}
      selectedAgent={selectedAgent}
      setSelectedAgent={handleAgentChange}
      totalUsage={getTotalUsage}
      chartData={chartData} // Call the function to get the transformed data
      selectedMonth={selectedMonth}
      setSelectedMonth={handleMonthChange}
      handleExport={handleExport}
      showSpacesDropdown={userContext?.currentUserTeam?.parentId === null}
    />
  );
}

export default AnalyticsPage;
