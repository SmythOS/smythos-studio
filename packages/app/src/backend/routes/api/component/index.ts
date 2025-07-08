import DataSourceLookup from './DataSourceLookup';
import DataSourceIndexer from './DataSourceIndexer';
import GPTPlugin from './GPTPlugin';
import APIEndpoint from './APIEndpoint';
import GoogleSheet from './GoogleSheet';
import HuggingFace from './HuggingFace';
import AgentPlugin from './AgentPlugin';
import ZapierAction from './ZapierAction';
import DataSourceCleaner from './DataSourceCleaner';
import OpenAPI from './OpenAPI';

const routers = {
  DataSourceLookup,
  DataSourceIndexer,
  DataSourceCleaner,
  GPTPlugin,
  APIEndpoint,
  GoogleSheet,
  HuggingFace,
  AgentPlugin,
  ZapierAction,
  OpenAPI,
};

export default routers;
