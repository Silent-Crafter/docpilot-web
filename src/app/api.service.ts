import {inject, Injectable, NgZone} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable, Observer} from 'rxjs';
import {LlmResponse} from './api.types';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:31337'
  constructor(private httpClient: HttpClient, private zone: NgZone) {}

  generateResponse(userMessage: string): Observable<LlmResponse> {
    return this.httpClient.post<LlmResponse>(`${this.apiUrl}/generate`, JSON.stringify({'prompt': userMessage}), {
      headers: new HttpHeaders({'Content-Type': 'application/json'})
    })
  }

  streamResponse(userMessage: string): Observable<LlmResponse> {
      return new Observable<LlmResponse>((observer) => {
          const source = new EventSource(this.apiUrl + `/stream?prompt=${encodeURIComponent(userMessage)}`)

          source.onmessage = (event) => {
              this.zone.run(() => {
                  try {
                      observer.next(JSON.parse(event.data));
                  } catch (err) {
                      observer.error(err)
                  }
              });
          };

          source.onerror = (err) => {
              this.zone.run(() => {
                  observer.error(err);
                  source.close();
              });
          };

          return () => source.close();
      });
  }
}

