import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[chat-scroll]'
})
export class AutoScrollDirective implements OnChanges {
  @Input() messages: any[] = [];

  constructor(private el: ElementRef) {}

  ngOnChanges(changes: SimpleChanges) {
    const change = changes['messages'];
    if (change && change.currentValue?.length !== change.previousValue?.length) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    Promise.resolve().then(() => {
      const native = this.el.nativeElement;
      native.scrollTop = native.scrollHeight;
    });
  }
}
