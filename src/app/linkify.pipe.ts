import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { User } from './core/interfaces/user';

@Pipe({
  name: 'linkify',
  standalone: true
})
export class LinkifyPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string, users: User[], channels: any[]): SafeHtml {
    if (!text) return text;

    let html = text;

    html = html.replace(/(^|[\s\n])@([A-Za-z]+(?:\s[A-Za-z]+)?)(?=[\s.,!?]|$)/g,
      (match, prefix, name) => {
        const user = users.find(u => u.name?.toLowerCase() === name.toLowerCase());

        if (!user) return `${prefix}<span class="unknown">@${name}</span>`;

        return `${prefix}<a
          class="mention user-link"
          data-type="user"
          data-uid="${user.uid}"
        >@${name}</a>`;
      }
    );

    html = html.replace(/(^|[\s\n])#([A-Za-z]+(?:\s[A-Za-z]+){0,2})(?=[\s.,!?]|$)/g,
      (match, prefix, name) => {
        const channel = channels.find(c => c.name?.toLowerCase() === name.toLowerCase());

        if (!channel) return `${prefix}<span class="unknown">#${name}</span>`;

        return `${prefix}<a
          class="mention channel-link"
          data-type="channel"
          data-id="${channel.id}"
        >#${name}</a>`;
      }
    );

    html = html.replace(
      /(https?:\/\/[^\s]+)/g,
      `<a href="$1" target="_blank" rel="noopener">$1</a>`
    );

    html = html.replace(
      /\b(www\.[^\s]+)/g,
      `<a href="https://$1" target="_blank" rel="noopener">$1</a>`
    );

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
