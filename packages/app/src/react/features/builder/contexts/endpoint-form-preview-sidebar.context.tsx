import EventEmitter from '@src/react/features/builder/utils';
import { Input } from '@src/react/shared/types/agent-data.types';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import {
  createContext,
  Dispatch,
  FC,
  MutableRefObject,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type CommonModeProps = {
  agentId: string;
  dbg_url: string;
  defaultSkill: Skill;
  workspace?: any;
  getAvailableSkills?: () => Skill[];
};

export type Mode =
  | {
      name: 'in-builder';
      props: CommonModeProps & {};
    }
  | {
      name: 'embed';
      props: CommonModeProps & {
        // skillId: string;
      };
    };

/**
 * Interface defining the context state and methods
 */
interface EndpointFormPreviewContextType {
  selectedSkill: FormData | null;
  setSelectedSkill: Dispatch<SetStateAction<FormData | null>>;
  requests: Req[];
  setRequests: Dispatch<SetStateAction<Req[]>>;
  getSkill: (skillId: string) => Promise<Skill>;
  uuid: () => string;
  callSkillMutation: UseMutationResult<any, unknown, any, unknown>;
  view: 'form' | 'home' | 'view_response';
  setView: Dispatch<SetStateAction<'form' | 'home' | 'view_response'>>;
  lastFormValues: Record<string, unknown> | null;
  setLastFormValues: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  abortController: MutableRefObject<AbortController | null>;
  lastResponse: any;
  mode: Mode;
  agentSkillErrors: SkillErrorType[];
}

/**
 * Props for the context provider component
 */
interface EndpointFormPreviewProviderProps {
  children: ReactNode;
  mode: Mode;
}

export type SkillErrorType = {
  error_slug: string;
  error_message: string;
};
export interface SkillError extends EventEmitter {
  errors: SkillErrorType[];
}

export interface Skill {
  inputsTypes: Input[];
  autoFillDataJson: Record<string, unknown>;
  skillId: string;
  details: {
    name: string;
    description: string;
    endpoint: string;
    method: string;
    skillErrors?: SkillError;
  };
}

export interface Req extends Skill {
  id: string;
  formData: Record<string, unknown>;
  status: 'pending' | 'success' | 'error';
  outputData?: Record<string, unknown> | null;
  fetchPromise?: Promise<any> | null;
  lastFormValues?: Record<string, unknown> | null;
  setLastFormValues?: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  lastResponse?: any;
}

export type FormData = Pick<Req, 'formData' | 'skillId' | 'inputsTypes'> & Skill;

const EndpointFormPreviewContext = createContext<EndpointFormPreviewContextType | undefined>(
  undefined,
);

/**
 * Provider component for the endpoint form preview context
 */
export const EndpointFormPreviewProvider: FC<EndpointFormPreviewProviderProps> = ({
  children,
  mode,
}) => {
  const abortController = useRef<AbortController | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<FormData | null>(null);
  const [requests, setRequests] = useState<Req[]>([]);
  const [view, setView] = useState<'form' | 'home' | 'view_response'>('form');
  const [lastFormValues, setLastFormValues] = useState<Record<string, unknown> | null>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [agentSkillErrors, setAgentSkillErrors] = useState<SkillErrorType[]>([]);

  useEffect(() => {
    // if (mode.name !== 'in-builder') return;
    setAgentSkillErrors([...(mode.props.defaultSkill?.details?.skillErrors?.errors || [])]);
    function handleChange(errors: SkillErrorType[]) {
      setAgentSkillErrors([...errors]);
    }
    mode.props.defaultSkill?.details?.skillErrors?.on('changed', handleChange);

    return () => {
      mode.props.defaultSkill?.details?.skillErrors?.off('changed', handleChange);
    };
  }, [mode]);

  // TODO: if needed, load all skills (API CALL)

  const getSkill = async (skillId: string): Promise<Skill> => {
    // return Promise.resolve({
    //   skillId,
    //   details: {
    //     name: 'skill1',
    //     description: 'skill1 description',
    //     endpoint: 'skill1 endpoint',
    //     method: 'GET',
    //   },
    //   inputsTypes: [
    //     {
    //       name: 'i1',
    //       type: 'Any',
    //       color: '#F35063',
    //       optional: false,
    //       index: 0,
    //       default: false,
    //     },
    //     {
    //       name: 'file',
    //       type: 'Binary',
    //       color: '#F35063',
    //       optional: false,
    //       index: 1,
    //       default: false,
    //     },
    //   ],
    // });

    return Promise.reject('Not implemented');
  };

  const uuid = () => {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  };

  const callSkillMutation = useMutation({
    mutationFn: async (values: any) => {
      abortController.current?.abort();
      abortController.current = new AbortController();
      return await fetch(`/api/page/builder/ai-agent/${mode.props.agentId}/skill-call`, {
        method: 'POST',
        body: JSON.stringify({
          payload: values,
          componentId: selectedSkill?.skillId,
          version: 'dev',
        }),
        signal: abortController.current?.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-MONITOR-ID': (window as any).currentMonitorId,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('setLastResponse', data);
          setLastResponse(data);
          return data;
        });
    },
    mutationKey: ['call_skill', selectedSkill?.skillId],
  });

  const value = {
    selectedSkill,
    setSelectedSkill,
    requests,
    setRequests,
    getSkill,
    mode,
    uuid,
    callSkillMutation,
    view,
    setView,
    lastFormValues,
    setLastFormValues,
    abortController,
    lastResponse,
    agentSkillErrors,
  };

  return (
    <EndpointFormPreviewContext.Provider value={value}>
      {children}
    </EndpointFormPreviewContext.Provider>
  );
};

/**
 * Custom hook to use the endpoint form preview context
 * @throws {Error} If used outside of EndpointFormPreviewProvider
 */
export const useEndpointFormPreview = (): EndpointFormPreviewContextType => {
  const context = useContext(EndpointFormPreviewContext);
  if (context === undefined) {
    throw new Error('useEndpointFormPreview must be used within a EndpointFormPreviewProvider');
  }
  return context;
};
