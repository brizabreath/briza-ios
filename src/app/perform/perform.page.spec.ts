import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerformPage } from './perform.page';

describe('PerformPage', () => {
  let component: PerformPage;
  let fixture: ComponentFixture<PerformPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(PerformPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
