import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable, Observer} from 'rxjs';
import {LlmResponse} from './api.types';


// TODO: IMPLEMENT THIS properly
function streamResponse(this: any, userMessage: string): Observable<LlmResponse> {
  return new Observable((observer: Observer<any>) => {
    const endpoint = this.apiUrl + '/generate';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      if (xhr.status !== 200) {
        observer.error(xhr.responseText);
      }

      const eventSource = new EventSource(endpoint);
      eventSource.onmessage = (event) => {
        const message: LlmResponse = JSON.parse(event.data);
        console.log({message});
        if (message.type === '<|END|>' ) {
          eventSource.close();
          observer.complete();
        } else {
          observer.next(message);
        }
      }
      eventSource.onerror = (error) => {
        observer.error(error);
        eventSource.close();
        observer.complete();
      }
    }

    xhr.onerror = () => {
      observer.error("Error connecting to server");
    }

    xhr.send(JSON.stringify({ prompt: userMessage }));
  })
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:31337'
  constructor(private httpClient: HttpClient) {}

  generateResponse(userMessage: string): Observable<LlmResponse> {
    return this.httpClient.post<LlmResponse>(`${this.apiUrl}/generate`, JSON.stringify({'prompt': userMessage}), {
      headers: new HttpHeaders({'Content-Type': 'application/json'})
    })
  }
}

