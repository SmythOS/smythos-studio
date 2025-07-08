export const EVENTS = {
  CHAT_EVENTS: {
    SESSION_START: 'chat_session_started',
    SESSION_END: 'chat_session_ended',
    MESSAGE_SENT: 'chat_message_sent',
  },

  TEMPLATES_EVENTS: {
    SUGGESTED_TEMPLATE_SELECTED: 'agent_creation_using_template',
  },

  ACCOUNT_HIERARCHY_EVENTS: {
    SPACE_CREATED: 'accountHierarchy_space_created',
    SPACE_DELETED: 'accountHierarchy_space_deleted',
    SPACE_UPDATED: 'accountHierarchy_space_updated',
    SPACE_SWITCHED: 'accountHierarchy_space_switched',
    SPACE_MEMBER_INVITED: 'accountHierarchy_space_member_invited',
    SPACE_MEMBER_REMOVED: 'accountHierarchy_space_member_removed',
    SPACE_MEMBER_UPDATED: 'accountHierarchy_space_member_updated',
  },
  AGENT_SETTINGS_EVENTS: {
    app_LLM_selected: 'app_LLM_selected',
    app_add_new_work_schedule: 'app_add_new_work_schedule',
    app_work_location_toggle: 'app_work_location_toggle',
    app_agent_skills_click: 'app_agent_skills_click',
    app_view_logs_click: 'app_view_logs_click',
    app_chat_with_agent: 'app_chat_with_agent',
  },
};
