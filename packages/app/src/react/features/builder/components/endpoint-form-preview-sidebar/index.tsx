import Processing from '@src/react/features/builder/components/endpoint-form-preview-sidebar/views/Processing';
import {
  EndpointFormPreviewProvider,
  Mode,
  Skill,
  useEndpointFormPreview,
} from '@src/react/features/builder/contexts/endpoint-form-preview-sidebar.context';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useCallback, useEffect, useState } from 'react';
import { MemoryRouter as Router } from 'react-router-dom';

type Props = {
  mode: Mode;
};

const FormPreviewSidebar = ({ mode }: Props) => {
  const context = useEndpointFormPreview();
  const defaultSkill = mode.props.defaultSkill;
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [targetSkill, setTargetSkill] = useState<Skill | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const handleTestClick = useCallback((skillId: string) => {
    setIsLoading(true);
    try {
      const componentElement = document.getElementById(skillId);
      if (!componentElement) {
        throw new Error('Component element not found');
      }
      const formPreviewButton: HTMLElement | null =
        componentElement.querySelector('.form-preview-button');
      if (!formPreviewButton) {
        throw new Error('Form preview button not found');
      }

      formPreviewButton.click();
    } catch (error) {
      setIsLoading(false);
      console.error('Failed to trigger form preview:', error);
    }
  }, []);

  const handleSkillChange = useCallback(
    (skillId: string) => {
      try {
        const skill = availableSkills.find((s) => s.skillId === skillId) || null;
        setTargetSkill(skill);

        const componentElement = document.getElementById(skillId);
        if (!componentElement) {
          return;
        }

        mode.props.workspace?.scrollToComponent(componentElement);
      } catch (error) {
        console.error('Failed to scroll to skill:', error);
      }
    },
    [availableSkills, mode.props.workspace],
  );

  const fetchAvailableSkills = useCallback(() => {
    const skills = mode.props.getAvailableSkills?.() || [];
    setAvailableSkills(skills);
  }, [mode.props.getAvailableSkills]);

  const handleComponentChanged = useCallback(() => {
    fetchAvailableSkills();
  }, [fetchAvailableSkills]);

  useEffect(() => {
    setTargetSkill(availableSkills?.[0] || null);

    if (availableSkills.length === 1 && !context.selectedSkill && isInitialLoad) {
      handleTestClick(availableSkills[0].skillId);
      setIsInitialLoad(false);
    }
  }, [availableSkills, context.selectedSkill, isInitialLoad]);

  useEffect(() => {
    // if (mode.name === 'in-builder') {
    mode.props.workspace?.addEventListener('AgentSaved', handleComponentChanged);

    return () => {
      mode.props.workspace?.removeEventListener('AgentSaved', handleComponentChanged);
    };
    // }
  }, [mode]);

  useEffect(() => {
    // if (mode.name === 'in-builder') {

    context.setSelectedSkill(
      defaultSkill
        ? {
            skillId: defaultSkill?.skillId,
            inputsTypes: defaultSkill?.inputsTypes,
            formData: {},
            details: defaultSkill?.details,
            autoFillDataJson: defaultSkill?.autoFillDataJson,
          }
        : null,
    );

    fetchAvailableSkills();

    const title = document.getElementById('embodiment-sidebar-title');
    if (title && defaultSkill?.details?.name) {
      title.textContent = defaultSkill.details.name;
    }
    // }

    // if (mode.name === 'embed') {
    //   const skillId = mode.props.skillId;
    //   if (skillId) {
    //     fetchSkillInputs();
    //   }

    //   async function fetchSkillInputs() {
    //     const skill = await context.getSkill(skillId);
    //     context.setSelectedSkill({
    //       skillId,
    //       inputsTypes: skill.inputsTypes,
    //       formData: {},
    //       details: skill.details,
    //       autoFillDataJson: skill.autoFillDataJson,
    //     });
    //     const title = document.getElementById('embodiment-sidebar-title');
    //     if (title) {
    //       title.textContent = skill.details.name;
    //     }
    //   }
    // }
  }, []);

  return (
    <div className="endpoint-form-preview-sidebar">
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <Spinner />
        </div>
      ) : context.selectedSkill && availableSkills.length > 0 ? (
        <Processing
          showBackButton={availableSkills.length > 1}
          onBackButtonClick={() => context.setSelectedSkill(null)}
        />
      ) : availableSkills.length === 0 ? (
        <div className="text-gray-600 py-4">
          <p>
            <b>No testable skills available.</b>
            <br />
            Please add skills to your agent and configure inputs to test.
          </p>
        </div>
      ) : (
        <div>
          <p className="pb-2">Select one of your agent's skills from the list, then click Test.</p>
          <div className="flex gap-2">
            <select
              className="h-9 w-full bg-white border text-gray-900 rounded block outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none text-sm font-normal placeholder:text-sm placeholder:font-normal px-[10px] border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500 appearance-none cursor-pointer"
              value={targetSkill?.skillId}
              onChange={(e) => handleSkillChange(e.target.value)}
            >
              {availableSkills.map((skill) => (
                <option key={skill.skillId} value={skill.skillId} className="py-2">
                  {skill.details.name}
                </option>
              ))}
            </select>
            <Button
              handleClick={() => handleTestClick(targetSkill?.skillId || '')}
              disabled={!targetSkill}
            >
              Test
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main component for the endpoint form preview sidebar
 * Wraps content with the context provider and router
 */
function EndpointFormPreviewSidebar({ mode }: Props) {
  return (
    <EndpointFormPreviewProvider mode={mode}>
      <Router initialEntries={['/home']} initialIndex={0}>
        <FormPreviewSidebar mode={mode} />
      </Router>
    </EndpointFormPreviewProvider>
  );
}

export default EndpointFormPreviewSidebar;
