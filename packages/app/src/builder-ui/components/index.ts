import { plugins, PluginTarget, PluginType } from '@src/react/shared/plugins/Plugins';
import { AgentCard } from './AgentCard.class';
import { AgentPlugin } from './AgentPlugin.class';
import { APICall } from './APICall.class';
import { APIEndpoint } from './APIEndpoint.class';
import { APIOutput } from './APIOutput.class';
import { Async } from './Async.class';
import { Await } from './Await.class';
import { Base64Encoder } from './Base64Encoder.class';
import { Classifier } from './Classifier.class';
import { Component } from './Component.class';
import { DBInsert } from './DBInsert.class';
import { EmailSender } from './EmailSender.class';
import { FCrypto } from './FCrypto.class';
import { FEncDec } from './FEncDec.class';
import { FHash } from './FHash.class';
import { FileExport } from './FileExport.class';
import { FileStore } from './FileStore.class';
import { ForEach } from './ForEach.class';
import { FSign } from './FSign.class';
import { FSleep } from './FSleep.class';
import { FTimestamp } from './FTimestamp.class';
import { GenAILLM } from './GenAILLM.class';
import { GPTPlugin } from './GPTPlugin.class';
import { HuggingFace } from './HuggingFace.class';
import { BackgroundRemoval } from './Image/BackgroundRemoval.class';
import { ImageToImage } from './Image/ImageToImage.class';
import { ImageToText } from './Image/ImageToText.class';
import { ImageUpscaling } from './Image/ImageUpscaling.class';
import { Inpainting } from './Image/Inpainting.class';
import { Outpainting } from './Image/Outpainting.class';
import { RestyleControlNet } from './Image/RestyleControlNet.class';
import { RestyleIPAdapter } from './Image/RestyleIPAdapter.class';
import { TextToImage } from './Image/TextToImage.class';
import { ImageGenerator } from './ImageGenerator.class'; // Legacy
import { InputSync } from './InputSync.class';
import { JSONFilter } from './JSONFilter.class';
import { LinkedIn } from './LinkedIn.class';
import { LLMAssistant } from './LLMAssistant.class';
import { LogicAND } from './LogicAND.class';
import { LogicAtLeast } from './LogicAtLeast.class';
import { LogicAtMost } from './LogicAtMost.class';
import { LogicOR } from './LogicOR.class';
import { LogicXOR } from './LogicXOR.class';
import { MCPClient } from './MCPClient.class';
import { Memory } from './Memory.class';
import { MemoryDeleteKey } from './MemoryDeleteKey.class';
import { MemoryReadKeyVal } from './MemoryReadKeyVal.class';
import { MemoryReadOutput } from './MemoryReadOutput.class';
import { MemoryWriteInput } from './MemoryWriteInput.class';
import { MemoryWriteKeyVal } from './MemoryWriteKeyVal.class';
import { MultimodalLLM } from './MultimodalLLM.class';
import { Note } from './Note.class';
import { POST_APIEndpoint } from './POST_APIEndpoint.class';
import { PromptGenerator } from './PromptGenerator.class';
import { Redirect } from './Redirect.class';
import { SchedulerEndpoint } from './SchedulerEndpoint.class';
import { SMSSender } from './SMSSender';
import { TTS } from './TTS.class';
import { Twitter } from './Twitter.class';
import { VisionLLM } from './VisionLLM.class';
import { ZapierAction } from './ZapierAction.class';

const baseComponents = {
  Component,
  Classifier,
  PromptGenerator,
  //FormParser,
  InputSync,
  //EmailReader,
  GPTPlugin,
  EmailSender,
  FileExport,
  TTS,
  SMSSender,
  DBInsert,
  APIEndpoint,
  //GmailReader,
  //GmailSender,
  APICall,
  Memory,
  Twitter,
  LinkedIn,
  //GoogleSheet,
  APIOutput,
  LogicAND,
  LogicOR,
  LogicXOR,
  LogicAtLeast,
  LogicAtMost,
  Base64Encoder,
  HuggingFace,
  AgentPlugin,
  ZapierAction,
  MemoryWriteInput,
  MemoryWriteKeyVal,
  MemoryReadOutput,
  MemoryReadKeyVal,
  Note,
  SchedulerEndpoint,
  JSONFilter,
  ForEach,
  VisionLLM,
  LLMAssistant,
  Redirect,
  Async,
  FCrypto,
  FHash,
  FSign,
  FEncDec,
  FSleep,
  FTimestamp,
  Await,
  POST_APIEndpoint,
  MemoryDeleteKey,
  MultimodalLLM,
  GenAILLM,
  FileStore,
  ImageGenerator,
  TextToImage,
  ImageToImage,
  ImageToText,
  BackgroundRemoval,
  ImageUpscaling,
  RestyleControlNet,
  RestyleIPAdapter,
  Outpainting,
  Inpainting,
  AgentCard,
  MCPClient,
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
