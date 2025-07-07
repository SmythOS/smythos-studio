export interface AiPluginJson {
  schema_version: string;
  name_for_human: string;
  name_for_model: string;
  description_for_human: string;
  description_for_model: string;

  auth: {
    type: 'none' | 'basic' | 'oauth2';
  };

  api: {
    type: 'openapi';
    url: string;
    is_user_authenticated: boolean;
  };

  logo_url: string;
  contact_email: string;
  legal_info_url: string;
}
