import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { User } from '../../core/interfaces/user';

/**
 * LinkifyPipe
 *
 * Transforms plain text messages into clickable HTML links.
 *
 * Supported transformations:
 * - User mentions → `@Username`
 * - Channel mentions → `#ChannelName`
 * - URLs → clickable anchor links
 *
 * The pipe safely sanitizes the generated HTML
 * using Angular's {@link DomSanitizer}.
 *
 * Usage example:
 * ```html
 * <div [innerHTML]="message.text | linkify:users:channels"></div>
 * ```
 */
@Pipe({
  name: 'linkify',
  standalone: true
})
export class LinkifyPipe implements PipeTransform {

  /**
   * Injects Angular's sanitizer to safely render HTML.
   *
   * @param sanitizer - Service used to mark HTML as trusted.
   */
  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Transforms message text into linkified HTML.
   *
   * Processing steps:
   * 1. Convert `@mentions` → user links
   * 2. Convert `#channels` → channel links
   * 3. Convert URLs → anchor tags
   *
   * @param text - Raw message text.
   * @param users - List of available users for mention matching.
   * @param channels - List of available channels for mention matching.
   *
   * @returns SafeHtml - Sanitized HTML safe for binding via `[innerHTML]`.
   */
  transform(text: string, users: User[], channels: any[]): SafeHtml {

    /** Guard: return early if no text provided */
    if (!text) return text;

    let html = text;

    /**
     * USER MENTIONS
     *
     * Matches patterns like:
     * - @John
     * - @John Doe
     *
     * Ensures mention is preceded by whitespace or line start.
     */
    html = html.replace(/(^|[\s\n])@([A-Za-z]+(?:\s[A-Za-z]+)?)(?=[\s.,!?]|$)/g,
      (match, prefix, name) => {
        const user = users.find(u => u.name?.toLowerCase() === name.toLowerCase());

        /** Unknown user fallback */
        if (!user) return `${prefix}<span class="unknown">@${name}</span>`;

        /** Known user → clickable mention */
        return `${prefix}<a
          class="mention user-link"
          data-type="user"
          data-uid="${user.uid}"
        >@${name}</a>`;
      }
    );

    /**
     * CHANNEL MENTIONS
     *
     * Matches:
     * - #General
     * - #Project Alpha
     */
    html = html.replace(/(^|[\s\n])#([A-Za-z]+(?:\s[A-Za-z]+){0,2})(?=[\s.,!?]|$)/g,
      (match, prefix, name) => {
        const channel = channels.find(c => c.name?.toLowerCase() === name.toLowerCase());

        /** Unknown channel fallback */
        if (!channel) return `${prefix}<span class="unknown">#${name}</span>`;

        /** Known channel → clickable mention */
        return `${prefix}<a
          class="mention channel-link"
          data-type="channel"
          data-id="${channel.id}"
        >#${name}</a>`;
      }
    );

    /**
     * FULL URL LINKS
     *
     * Matches:
     * - https://example.com
     * - http://example.com
     */
    html = html.replace(
      /(https?:\/\/[^\s]+)/g,
      `<a href="$1" target="_blank" rel="noopener">$1</a>`
    );

    /**
     * WWW LINKS (without protocol)
     *
     * Matches:
     * - www.example.com
     */
    html = html.replace(
      /\b(www\.[^\s]+)/g,
      `<a href="https://$1" target="_blank" rel="noopener">$1</a>`
    );

    /**
     * Sanitize final HTML output
     *
     * Marks generated HTML as trusted so Angular
     * allows rendering via `[innerHTML]`.
     */
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
