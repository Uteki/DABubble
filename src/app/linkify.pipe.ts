import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'linkify',
  standalone: true
})
export class LinkifyPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string): SafeHtml {
    if (!text) return text;

    let result = text;

    //TODO: set chat from @ and #
    result = result.replace(
      /@([a-zA-Z]+\s[a-zA-Z]+)/g,
      `<a class="mention" href="#" data-user="$1">@$1</a>`
    );

    result = result.replace(
      /(https?:\/\/[^\s]+)/g,
      `<a href="$1" target="_blank" rel="noopener">$1</a>`
    );

    result = result.replace(
      /\b(www\.[^\s]+)/g,
      `<a href="https://$1" target="_blank" rel="noopener">$1</a>`
    );

    return this.sanitizer.bypassSecurityTrustHtml(result);
  }
}
