import TemplateCard from '@react/features/templates/components/templateCard';
import { Template } from '@src/react/features/agents/types/agents.types';
import { FaArrowRight } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

interface TemplatesSectionProps {
  templates: Template[];
  userJobRole?: string;
}

/**
 * Component for displaying templates section with job role specific templates
 */
export function TemplatesSection({ templates, userJobRole }: TemplatesSectionProps) {
  const navigate = useNavigate();

  if (!templates?.length) {
    return null;
  }

  return (
    <div className="pb-4">
      <div className="flex justify-between align-middle mb-4 text-lg">
        <p>
          {userJobRole ? (
            <>
              Templates for <span className="capitalize">{userJobRole}</span>
            </>
          ) : (
            'Featured Templates'
          )}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {templates.slice(0, 8).map((template) => (
          <TemplateCard
            data={{
              ...template,
              jobType: userJobRole,
            }}
            key={template.id}
            type="template"
            suggestedTamplate
          />
        ))}
      </div>

      <button
        onClick={() => navigate('/templates')}
        type="button"
        className="group mt-3 float-right mr-0 flex justify-center items-center text-gray-700 
        relative py-2 text-sm hover:no-underline after:absolute after:bottom-0 after:left-0 
        after:h-[2px] after:w-0 after:bg-current after:transition-all after:duration-300"
      >
        <span>
          View all templates <FaArrowRight className="inline-block ml-1" />
        </span>
      </button>
    </div>
  );
} 