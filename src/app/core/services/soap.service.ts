// services/soap.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { SoapRequestParams, SoapResponse } from '../models/soap-request.model';

@Injectable({
  providedIn: 'root'
})
export class SoapService {

  private readonly defaultUrl = '/icu-tech/icutech-test.dll/soap/IICUTech'
  private readonly defaultNamespace = 'urn:ICUTech.Intf-IICUTech#';
  private readonly defaultTimeout = 30000;

  constructor(private http: HttpClient) { }

  /**
   * Общий метод для выполнения SOAP запросов с generic типом
   */
  callSoapMethod<T = any>(params: SoapRequestParams): Observable<SoapResponse<T>> {
    const soapEnvelope = this.buildSoapEnvelope(params);
    const headers = this.buildHeaders(params);

    return this.http.post(params.url || this.defaultUrl, soapEnvelope, {
      headers,
      responseType: 'text'
    }).pipe(
      timeout(params.timeout || this.defaultTimeout),
      map(response => this.handleSuccessResponse<T>(response)),
      catchError(error => this.handleError<T>(error))
    );
  }

  /**
   * Метод с автоматическим парсингом XML в указанный тип
   */
  callSoapMethodWithParsing<T = any>(
    params: SoapRequestParams,
    parser?: (xmlDoc: Document) => T
  ): Observable<SoapResponse<T>> {
    return this.callSoapMethod<string>(params).pipe(
      map(response => {
        if (!response.success || !response.data) {
          return response as SoapResponse<T>;
        }

        try {
          const parsedData = parser
            ? parser(this.parseSoapResponse(response.data))
            : this.autoParseResponse<T>(response.data);

          return {
            ...response,
            data: parsedData,
            rawResponse: response.data
          };
        } catch (parseError) {
          return {
            success: false,
            error: `Ошибка парсинга XML: ${parseError}`,
            status: response.status,
            rawResponse: response.data
          };
        }
      })
    );
  }

  /**
   * Специализированный парсер для извлечения JSON из тега <return> в SOAP-ответе
   */
  extractJsonFromSoapResponse(xmlResponse: string): any {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');

      // Проверка на ошибки SOAP
      const fault = xmlDoc.getElementsByTagName('soap:Fault')[0] ||
        xmlDoc.getElementsByTagName('Fault')[0];

      if (fault) {
        const faultString = fault.getElementsByTagName('faultstring')[0]?.textContent ||
          fault.getElementsByTagName('faultcode')[0]?.textContent;
        throw new Error(faultString || 'SOAP Fault');
      }

      // Извлечение содержимого тега <return>
      const returnElements = xmlDoc.getElementsByTagName('return');
      if (returnElements.length > 0) {
        const returnContent = returnElements[0].textContent;
        if (returnContent) {
          // Попытка парсинга как JSON
          try {
            return JSON.parse(returnContent);
          } catch (jsonError) {
            // Если не удалось распарсить как JSON, возвращаем как есть
            return returnContent;
          }
        }
      }

      // Если тег <return> не найден, возвращаем весь XML как строку
      return xmlResponse;
    } catch (error) {
      throw new Error(`Ошибка извлечения JSON из SOAP ответа: ${error}`);
    }
  }

  /**
   * Обработка успешного ответа с generic типом
   */
  private handleSuccessResponse<T>(response: any): SoapResponse<T> {
    try {
      const responseText = typeof response === 'string' ? response : response.body || response;

      return {
        success: true,
        data: responseText as T,
        status: 200,
        rawResponse: responseText
      };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка обработки ответа: ${error}`,
        status: 200
      } as SoapResponse<T>;
    }
  }

  /**
   * Автоматический парсинг ответа
   */
  private autoParseResponse<T>(xmlResponse: string): T {
    const xmlDoc = this.parseSoapResponse(xmlResponse);

    // Базовая логика автоматического парсинга
    // Можно расширить под конкретные нужды
    const resultElement = xmlDoc.documentElement;

    return this.xmlToJson(resultElement) as T;
  }

  /**
   * Преобразование XML в JSON (базовая реализация)
   */
  private xmlToJson(xml: Element): any {
    const obj: any = {};

    if (xml.nodeType === 1) { // element node
      if (xml.attributes.length > 0) {
        obj['@attributes'] = {};
        for (let j = 0; j < xml.attributes.length; j++) {
          const attribute = xml.attributes[j];
          obj['@attributes'][attribute.nodeName] = attribute.nodeValue;
        }
      }
    } else if (xml.nodeType === 3) { // text node
      return xml.nodeValue;
    }

    // process child nodes
    if (xml.hasChildNodes()) {
      for (let i = 0; i < xml.childNodes.length; i++) {
        const item = xml.childNodes[i] as Element;
        const nodeName = item.nodeName;

        if (typeof obj[nodeName] === 'undefined') {
          obj[nodeName] = this.xmlToJson(item);
        } else {
          if (typeof obj[nodeName].push === 'undefined') {
            const old = obj[nodeName];
            obj[nodeName] = [];
            obj[nodeName].push(old);
          }
          obj[nodeName].push(this.xmlToJson(item));
        }
      }
    }

    return obj;
  }

  /**
   * Обработка ошибок с generic типом
   */
  private handleError<T>(error: any): Observable<SoapResponse<T>> {
    let errorMessage = 'Произошла ошибка при выполнении SOAP запроса';
    let status = error.status;

    if (error.status === 0) {
      errorMessage = 'Ошибка сети: невозможно подключиться к серверу';
      status = 0;
    } else if (error.status === 404) {
      errorMessage = 'SOAP сервис не найден';
    } else if (error.status === 500) {
      errorMessage = 'Внутренняя ошибка сервера';
    } else if (error.name === 'TimeoutError') {
      errorMessage = 'Превышено время ожидания ответа от сервера';
      status = 408;
    }

    return throwError(() => ({
      success: false,
      error: errorMessage,
      status: status
    } as SoapResponse<T>));
  }

  // Остальные методы остаются без изменений
  private buildSoapEnvelope(params: SoapRequestParams): string {
    const namespace = params.namespace || this.defaultNamespace;
    const parametersXml = this.buildParametersXml(params.parameters);

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${params.method}>
      ${parametersXml}
    </${params.method}>
  </soap:Body>
</soap:Envelope>`;
  }

  private buildParametersXml(parameters: { [key: string]: any }): string {
    let parametersXml = '';

    for (const [key, value] of Object.entries(parameters)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          parametersXml += value.map(item =>
            `<${key}>${this.escapeXmlValue(item)}</${key}>`
          ).join('');
        } else if (typeof value === 'object') {
          parametersXml += `<${key}>${this.buildParametersXml(value)}</${key}>`;
        } else {
          parametersXml += `<${key}>${this.escapeXmlValue(value)}</${key}>`;
        }
      }
    }

    return parametersXml;
  }

  private escapeXmlValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private buildHeaders(params: SoapRequestParams): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `${params.namespace || this.defaultNamespace}${params.method}`,
      ...this.sanitizeHeaders(params.headers)
    });
  }

  private sanitizeHeaders(headers?: { [key: string]: any }): { [key: string]: string } {
    if (!headers) return {};

    const sanitized: { [key: string]: string } = {};

    for (const [key, value] of Object.entries(headers)) {
      sanitized[key] = typeof value === 'string' ? value : String(value);
    }

    return sanitized;
  }

  parseSoapResponse(xmlResponse: string): Document {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');

      const fault = xmlDoc.getElementsByTagName('soap:Fault')[0] ||
        xmlDoc.getElementsByTagName('Fault')[0];

      if (fault) {
        const faultString = fault.getElementsByTagName('faultstring')[0]?.textContent ||
          fault.getElementsByTagName('faultcode')[0]?.textContent;
        throw new Error(faultString || 'SOAP Fault');
      }

      return xmlDoc;
    } catch (error) {
      throw new Error(`Ошибка парсинга SOAP ответа: ${error}`);
    }
  }
}
