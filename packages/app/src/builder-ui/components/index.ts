import { plugins, PluginTarget, PluginType } from '@src/react/shared/plugins/Plugins';
import { AgentPlugin } from './AgentPlugin.class';
import { APICall } from './APICall.class';
import { APIEndpoint } from './APIEndpoint.class';
import { APIOutput } from './APIOutput.class';
import { Async } from './Async.class';
import { Await } from './Await.class';
import { Classifier } from './Classifier.class';
import { Component } from './Component.class';
import { FEncDec } from './FEncDec.class';
import { FHash } from './FHash.class';
import { FileStore } from './FileStore.class';
import { ForEach } from './ForEach.class';
import { FSign } from './FSign.class';
import { FSleep } from './FSleep.class';
import { FTimestamp } from './FTimestamp.class';
import { GenAILLM } from './GenAILLM.class';
import { GPTPlugin } from './GPTPlugin.class';
import { HuggingFace } from './HuggingFace.class';
import { ImageGenerator } from './ImageGenerator.class'; // Legacy
import { JSONFilter } from './JSONFilter.class';
import { LLMAssistant } from './LLMAssistant.class';
import { LogicAND } from './LogicAND.class';
import { LogicAtLeast } from './LogicAtLeast.class';
import { LogicAtMost } from './LogicAtMost.class';
import { LogicOR } from './LogicOR.class';
import { LogicXOR } from './LogicXOR.class';
import { MCPClient } from './MCPClient.class';
import { MemoryDeleteKeyVal } from './MemoryDeleteKeyVal.class';
import { MemoryReadKeyVal } from './MemoryReadKeyVal.class';
import { MemoryWriteKeyVal } from './MemoryWriteKeyVal.class';
import { MemoryWriteObject } from './MemoryWriteObject.class';
import { MultimodalLLM } from './MultimodalLLM.class';
import { Note } from './Note.class';
import { PromptGenerator } from './PromptGenerator.class';
import { VisionLLM } from './VisionLLM.class';
import { ZapierAction } from './ZapierAction.class';

import { AgentCard } from './AgentCard.class';
import { GmailTrigger } from './Triggers/Gmail.trigger';
import { WhatsAppTrigger } from './Triggers/WhatsApp.trigger';
import { JobSchedulerTrigger } from './Triggers/JobScheduler.trigger';

const baseComponents = {
  Component,
  Classifier,
  PromptGenerator,
  GPTPlugin,
  APIEndpoint,
  APICall,
  APIOutput,
  LogicAND,
  LogicOR,
  LogicXOR,
  LogicAtLeast,
  LogicAtMost,
  HuggingFace,
  AgentPlugin,
  ZapierAction,
  MemoryWriteObject,
  MemoryWriteKeyVal,
  MemoryReadKeyVal,
  MemoryDeleteKeyVal,
  Note,
  JSONFilter,
  ForEach,
  VisionLLM,
  LLMAssistant,
  Async,
  FHash,
  FSign,
  FEncDec,
  FSleep,
  FTimestamp,
  Await,
  MultimodalLLM,
  GenAILLM,
  FileStore,
  ImageGenerator,
  MCPClient,
  GmailTrigger,
  WhatsAppTrigger,
  AgentCard,
  JobSchedulerTrigger,
};

export const getBuilderComponents = () => {
  const pluginComponents = (
    plugins.getPluginsByTarget(PluginTarget.BuilderSREComponents, PluginType.Config) as {
      [key: string]: any;
    }[]
  ).reduce((acc, item) => {
    return {
      ...acc,
      ...item.config,
    };
  }, {});

  return {
    ...baseComponents,
    ...pluginComponents,
  };
};

export default baseComponents;
