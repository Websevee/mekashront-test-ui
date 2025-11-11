import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SoapService {
  private soapEndpoint = 'http://example.com/service?wsdl'; // URL вашего WSDL

  constructor(private http: HttpClient) { }

  getData(param: string): Observable<string> {
    // Создаем SOAP-запрос (XML)
    const soapRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://example.com/namespace">
         <soapenv:Header/>
         <soapenv:Body>
            <ns:GetData>
               <ns:Parameter>${param}</ns:Parameter>
            </ns:GetData>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    return this.http.post<string>(this.soapEndpoint, soapRequest, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://example.com/namespace/GetData' // Содержит имя операции
      }
    }).pipe(
      map((response: any) => {
        // Обработка SOAP-ответа (парсинг XML)
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        // Извлечь данные из XML
        const resultElements = xmlDoc.getElementsByTagName('Result');
        if (resultElements.length > 0 && resultElements[0].childNodes.length > 0) {
          return resultElements[0].childNodes[0].nodeValue || '';
        }
        return '';
      })
    );
  }
}
