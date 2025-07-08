import { useQuery } from '@tanstack/react-query';
import { ModelAgentCard } from './card';

interface ModelAgent {
  id: string;
  name: string;
  avatar: string;
  description: string;
}

const fetchModelAgents = async (): Promise<ModelAgent[]> => {
  // const { data } = await axios.get('/api/page/agents/models');
  const response = await fetch('/api/page/agents/models');
  const data = await response.json();

  // Map the response to match our component's expected props
  return data.agents;
};

const ModelAgentsSection = () => {
  const {
    data: modelAgents,
    isLoading,
    error,
  } = useQuery<ModelAgent[]>({
    queryKey: ['modelAgents'],
    queryFn: fetchModelAgents,
  });

  if (isLoading) {
    return (
      <section className="my-20">
        <div className="flex justify-between align-middle mb-4 text-lg">
          <p>Model Agents</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="animate-pulse">
              <div
                style={{
                  backgroundColor: 'white',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div className="w-[50px] h-[50px] bg-gray-200 rounded-full mr-4"></div>
                <div>
                  <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="my-20">
        <h2 className="text-xl font-medium text-gray-800 mb-4">Models</h2>
        <div className="p-4 text-red-500 bg-red-50 rounded-lg">
          Error loading models. Please try again later.
        </div>
      </section>
    );
  }

  return (
    <section className="my-20">
      <div className="flex justify-between align-middle mb-4 text-lg">
        <p>Model Agents</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modelAgents && modelAgents.map((model) => <ModelAgentCard key={model.id} model={model} />)}
      </div>
    </section>
  );
};

export default ModelAgentsSection;
