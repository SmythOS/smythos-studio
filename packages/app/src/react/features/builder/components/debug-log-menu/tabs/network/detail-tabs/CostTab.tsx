import { NetworkRequest } from '@src/react/features/builder/contexts/debug-log-menu.context';
import { FC } from 'react';
import { FaInfoCircle, FaMoneyBillWave } from 'react-icons/fa';

interface CostTabProps {
  request: NetworkRequest;
}

// Helper function to format cost model names more nicely
const formatModelName = (sourceId: string): { name: string; description: string } => {
  // Extract model name from sourceId (e.g., "llm:gpt-4o-mini" -> "GPT-4o Mini")
  const parts = sourceId.split(':');
  
  if (parts.length !== 2) {
    return { name: sourceId, description: 'Resource' };
  }
  
  const type = parts[0];
  const model = parts[1];
  
  // Create a more readable model name
  let formattedName = model.split('-').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');
  
  // Determine description based on model type
  let description = '';
  switch (type) {
    case 'llm':
      description = 'Large Language Model';
      break;
    case 'api':
      description = 'API Call';
      break;
    
    default:
      description = 'Resource';
  }
  
  return { name: formattedName, description };
};

/**
 * Displays cost/usage information for a network request
 */
export const CostTab: FC<CostTabProps> = ({ request }) => {
  // If no cost data is available
  if (!request.cost || request.cost.length === 0) {
    return (
      <div className="flex flex-col p-4">
        <div className="text-sm text-gray-500 text-center py-8">
          No cost information available for this request.
        </div>
      </div>
    );
  }

  // Calculate total cost across all sources
  const totalCost = request.cost.reduce((sum, item) => sum + item.units, 0);

  return (
    <div className="flex flex-col p-4">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 mb-4 rounded-lg border border-blue-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <FaMoneyBillWave className="text-yellow-500" size={16} />
          <h3 className="text-sm font-medium text-blue-700">
            Usage Summary
          </h3>
        </div>
        <div className="text-sm text-blue-800">
          Total Cost: $<span className="font-medium">{totalCost.toFixed(8)}</span>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h3 className="text-sm font-medium text-gray-700">Cost Breakdown</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-3 text-xs font-medium text-gray-500">Source</th>
              {/* We are reporting dollars */}
              <th className="text-right p-3 text-xs font-medium text-gray-500">Cost</th>
              <th className="text-right p-3 text-xs font-medium text-gray-500">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {request.cost.map((item, index) => {
              const { name, description } = formatModelName(item.sourceId);
              const percentage = (item.units / totalCost) * 100;
              
              return (
                <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="text-left p-3">
                    <div className="text-sm text-gray-700 font-medium">{name}</div>
                    <div className="text-xs text-gray-500">{description}</div>
                    <div className="text-xs text-gray-400 font-mono mt-1">{item.sourceId}</div>
                  </td>
                  <td className="text-right p-3 text-sm text-gray-700 font-mono">{item.units.toFixed(8)}</td>
                  <td className="text-right p-3">
                    <div className="text-sm text-gray-700">{percentage.toFixed(1)}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg border text-xs text-gray-500 flex items-start gap-2">
        <FaInfoCircle className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p>Cost data represents computational resource usage for this request. Cost is typically reported in dollars, depending on the service used.</p>
        </div>
      </div>
    </div>
  );
}; 