export interface GPTPluginInfo {
  id: string;
  manifest: {
    name_for_model: string;
    name_for_human: string;
    description_for_model: string;
    description_for_human: string;
    api: { url: string };
    logo_url: string;
  };
}
