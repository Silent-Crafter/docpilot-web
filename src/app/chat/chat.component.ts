import {Component, AfterViewChecked, ElementRef, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {marked} from 'marked';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ApiService} from '../api.service';
import {LlmResponse} from '../api.types';
import {Observable, Subscription} from 'rxjs';

interface Message {
  type: string;
  content: string;
  status: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    NgForOf,
    NgIf,
    NgClass
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements AfterViewChecked {
  constructor(private sanitizer: DomSanitizer, private apiService: ApiService) {}
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: Message[] = [];
  newInput: string = '';

  private streamSub?: Subscription;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (!this.messagesContainer) return
    let ele = this.messagesContainer.nativeElement;
    ele.scrollTop = ele.scrollHeight;
  }

  streamResponse() {
    let lastIndex = -1;
    if (!this.newInput.trim()) {
        return
    }

    this.messages.push({
      type: "user",
      content: this.newInput.trim(),
      status: ''
    });
    let prompt = this.newInput.trim();
    this.streamSub = this.apiService.streamResponse(prompt).subscribe({
      next: (msg: LlmResponse) => {
        console.log(msg.status);
        switch (msg.type) {
          case 'query':
            lastIndex = this.messages.length - 1;
            if (this.messages[lastIndex].type == "user") {
              this.messages.push({
                type: "ai",
                content: '',
                status: "Searching for: " + msg.content + ".<br>" + msg.status
              });
            } else {
              this.messages[lastIndex] = {
                type: "ai",
                content: '',
                status: "Searching for: " + msg.content + ".<br>" + msg.status
              };
            }
            break;

          case 'files':
            lastIndex = this.messages.length - 1;
            if (this.messages[lastIndex].type == "user") {
              this.messages.push({
                type: "ai",
                content: '',
                status: "Using files: " + JSON.stringify(msg.content) + ".<br>" + msg.status
              });
            } else {
              this.messages[lastIndex] = {
                type: "ai",
                content: '',
                status: "Using files: " + JSON.stringify(msg.content) + ".<br>" + msg.status
              };
            }
            break;

          case 'answer':
            lastIndex = this.messages.length - 1;
            if (this.messages[lastIndex].type == "user") {
              this.messages.push({
                type: "ai",
                content: msg.content,
                status: msg.status
              });
            } else {
              this.messages[lastIndex] = {
                type: "ai",
                content: msg.content,
                status: msg.status
              };
            }
            break;

          case 'answer_with_images':
            lastIndex = this.messages.length - 1;
            if (this.messages[lastIndex].type == "user") {
              this.messages.push({
                type: "ai",
                content: msg.content,
                status: msg.status
              });
            } else {
            this.messages[lastIndex] = {
                type: "ai",
                content: msg.content,
                status: msg.status
              };
            }

            this.streamSub?.unsubscribe();
            break;

          default:
            break;
        }
      }
    });
    this.newInput = '';
  }

  async sendMessage() {
    if (this.newInput.trim()) {
      this.messages.push({
        type: "user",
        content: this.newInput.trim(),
        status: ''
      });
      let msg = this.newInput.trim();
      this.newInput = "";

      this.apiService.generateResponse(msg).subscribe({
        next: (message) => {
          console.log(message);
          this.messages.push({
            type: "ai",
            content: message.content,
            status: ''
          });
          console.log(message.status);
        }
      });
      this.newInput = '';
    }
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.streamResponse();
    }
  }

  renderMarkdown(text: string): SafeHtml {
    const html = marked(text, {async: false}) as string;
    return html;
    // return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  autoGrow(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}
