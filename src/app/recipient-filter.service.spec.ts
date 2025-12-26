import { TestBed } from '@angular/core/testing';

import { RecipientFilterService } from './recipient-filter.service';

describe('RecipientFilterService', () => {
  let service: RecipientFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecipientFilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
