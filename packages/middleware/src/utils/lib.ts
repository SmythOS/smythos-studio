import { config } from '../../config/config';
import axios from 'axios';

export const crawlerAxiosInstance = axios.create({
  baseURL: config.variables.SMYTH_CRAWLER,
});
