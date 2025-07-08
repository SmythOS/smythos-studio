export type OperationResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

export type APIResponse<T = any> = OperationResponse<T>;

export type ModelsQueryParams = {
  page?: number;
  search?: string;
  sort?: string;
  hf_cursor_prev?: string;
  hf_cursor_next?: string;
  smyth_cursor_next?: string;
};

export type CacheData = {
  createdAt?: string;
  updatedAt?: string;
  expiredAt?: string | number; // string > ISOString, number > seconds
  data?: any;
};
