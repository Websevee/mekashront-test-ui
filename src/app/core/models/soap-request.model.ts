// models/soap-request.model.ts
export interface SoapRequestParams {
  url?: string;
  method: string;
  namespace?: string;
  parameters: { [key: string]: any };
  headers?: { [key: string]: string };
  timeout?: number;
}

export interface SoapResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  rawResponse?: string;
}
