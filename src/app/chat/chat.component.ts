import {Component, AfterViewChecked, ElementRef, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {marked} from 'marked';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ApiService} from '../api.service';
import {LlmResponse} from '../api.types';

interface Message {
  type: string;
  content: string;
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

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (!this.messagesContainer) return
    let ele = this.messagesContainer.nativeElement;
    ele.scrollTop = ele.scrollHeight;
  }

  async sendMessage() {
    if (this.newInput.trim()) {
      this.messages.push({
        type: "user",
        content: this.newInput.trim()
      });
      let msg = this.newInput.trim();
      this.newInput = "";

      this.apiService.generateResponse(msg).subscribe({
        next: (message) => {
          console.log(message);
          this.messages.push({
            type: "ai",
            content: message.content,
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
      this.sendMessage();
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
