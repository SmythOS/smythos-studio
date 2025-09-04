export type OpenAiParamsProps = Record<
    string,
    {
        type: string;
        description?: string;
        items?: object;
        additionalProperties?: object;
        enum?: string[];
    }
>;
export type OpenAiParams = {
  type: string;
  properties: OpenAiParamsProps;
  required: string[];
};
export interface OpenAiFunctionArg {
  name: string;
  description: string;
  parameters: OpenAiParams;
}