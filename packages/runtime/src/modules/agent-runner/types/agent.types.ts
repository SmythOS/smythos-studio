// **********************************************************************************
//* Until now, the agent.types.ts file is identical across sre-builder-debugger, sre-agent-server, and sre-embodiment-server.
//* Any changes made here should also be applied to the corresponding files in all three services.
// **********************************************************************************

export type PLAN_NAMES =
    | 'v4_Enterprise_T1'
    | 'v4_Enterprise_T2'
    | 'v4_Enterprise_T3'
    | 'v4_Enterprise_T4'
    | 'v4_Scaleup'
    | 'v4_Builder'
    | 'v4_Startup'
    | 'SmythOS Free'
    | 'Early Adopters'
    | 'Premium'
    | 'Enterprise'; // v3 enterprise

export type PlanInfo = {
    planName: PLAN_NAMES;
    isDefaultPlan?: boolean;
    flags: {
        hasBuiltinModels: boolean;
    };
    properties: {
        freeCredits: number;
    };
};

export type ComponentConfig = {
    id: string;
    name: string;
    title?: string;
    displayName?: string;
    eventId?: string;
    data?: {
        model?: string;
        [key: string]: any;
    };
};

export type Agent = {
    agentRequest: {
        req: {
            _agent: {
                planInfo: PlanInfo;
                parentTeamId: string;
                teamId: string;
            };
        };
    };
};

// **********************************************************************************
//* Until now, the agent.types.ts file is identical across sre-builder-debugger, sre-agent-server, and sre-embodiment-server.
//* Any changes made here should also be applied to the corresponding files in all three services.
// **********************************************************************************
