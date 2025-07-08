import  { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';

export default function StackedBarChart({ chartData }) {
  const chartRef = useRef(null);
  const [chart, setChart] = useState(null);

  function fillMissingDaysInMonth(chartData) {
    // 1) If no labels or empty data, just return as is
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
      return chartData;
    }

    // 2) Parse the "month" + "year" from the *first* label (e.g., "Feb 2")
    //    We'll assume the current year for the parse.
    const firstLabel = chartData.labels[0];
    const firstDate = new Date(`${firstLabel}, ${new Date().getFullYear()}`);
    const year = firstDate.getFullYear();
    const month = firstDate.getMonth(); // 0-based

    // 3) Determine how many days are in that month (28..31, depending on month/year)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 4) Generate all possible day labels for that month, e.g. "Feb 1", "Feb 2", ...
    const allDates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const label = d.toLocaleString('en-US', { month: 'short', day: 'numeric' });
      allDates.push(label);
    }

    // 5) Map existing label => index
    const existingLabelIndex = new Map();
    chartData.labels.forEach((lbl, i) => {
      existingLabelIndex.set(lbl, i);
    });

    // 6) For each dataset, build a new data array with zero if the day is missing
    const newDatasets = chartData.datasets.map((ds) => {
      const newData = allDates.map((dateLabel) => {
        if (existingLabelIndex.has(dateLabel)) {
          const oldIndex = existingLabelIndex.get(dateLabel);
          return ds.data[oldIndex] ?? 0; // fallback to 0 if undefined
        }
        // Missing => 0
        return 0;
      });
      return {
        ...ds,
        data: newData,
      };
    });

    // 7) If there's no breakdown property at all, just return updated labels/datasets
    if (!chartData.breakdown) {
      return {
        labels: allDates,
        datasets: newDatasets,
      };
    }

    // 8) If we do have a breakdown, fill missing days with empty arrays
    const oldBreakdown = chartData.breakdown;
    const newBreakdown = {};
    for (const dayLabel of allDates) {
      if (oldBreakdown[dayLabel]) {
        // reuse existing
        newBreakdown[dayLabel] = oldBreakdown[dayLabel];
      } else {
        // otherwise create empty arrays for each dataset label
        newBreakdown[dayLabel] = {};
        for (const ds of newDatasets) {
          newBreakdown[dayLabel][ds.label] = [];
        }
      }
    }

    // 9) Return the fully updated chart data
    return {
      labels: allDates,
      datasets: newDatasets,
      breakdown: newBreakdown,
    };
  }

  // If all datasets are empty or there's no data
  const hasNoData =
    !chartData?.datasets?.length || chartData.datasets.every((ds) => ds.data.every((v) => v === 0));

  // Destroy old chart instance, create a new one
  useEffect(() => {
    if (!chartRef.current) return;
    if (chart) chart.destroy();

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const newChart = new Chart(ctx, {
      type: 'bar',
      data: fillMissingDaysInMonth(chartData),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                // e.g. show K, M
                if (typeof value === 'number') {
                  if (value >= 1_000_000) return `${value / 1_000_000}M`;
                  if (value >= 1000) return `${value / 1000}K`;
                  return value;
                }
                return value;
              },
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'end',
            reverse: true,
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              boxWidth: 6,
              boxHeight: 6,
            },
          },
          tooltip: {
            itemSort: (a, b) => b.datasetIndex - a.datasetIndex,
            backgroundColor: 'rgb(0, 0, 0)',
            padding: 16,
            titleColor: '#FFF',
            titleFont: { size: 16, weight: 'normal' },
            titleAlign: 'left',
            bodySpacing: 8,
            bodyFont: { size: 14 },
            bodyColor: '#FFF',
            displayColors: true,
            boxPadding: 8,
            cornerRadius: 8,
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            callbacks: {
              title: (tooltipItems) => {
                return tooltipItems[0]?.label || '';
              },
              label: (context: any) => {
                const cat = context.dataset.label;
                const dayLabel = context.label;
                const breakdown = context.chart.data.breakdown || {};
                const childItems = breakdown?.[dayLabel]?.[cat] || [];

                if (!childItems.length) return;

                let lines = [];
                for (const child of childItems) {
                  // skip zero-cost if desired
                  // if (child.cost === 0) continue;

                  // look up a friendly name
                  // let displayName = friendlyNameMap[child.name] ?? child.name;
                  let displayName = child.name;

                  // you can also rename entire categories if needed
                  if (cat === 'Tasks') {
                    displayName = 'Agent Tasks';
                  } else if (cat === 'Weaver') {
                    displayName = 'Weaver';
                  } else if (cat === 'Image Generation') {
                    displayName = 'Image Generation';
                  }

                  lines.push(`${displayName} : $${child.cost.toFixed(5)}`);
                }

                if (!lines.length) return;
                return lines; // multi-line in the tooltip
              },
            },
          },
        },
      },
    });

    setChart(newChart);

    return () => {
      if (newChart) newChart.destroy();
    };
  }, [chartData]);

  return (
    <div className="relative">
      <div className="h-[400px] w-full">
        <canvas ref={chartRef} />
        {hasNoData && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500">No data for this period</p>
          </div>
        )}
      </div>
    </div>
  );
}
