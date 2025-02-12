import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BPRPage } from './bpr.page';

describe('BPRPage', () => {
  let component: BPRPage;
  let fixture: ComponentFixture<BPRPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(BPRPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
