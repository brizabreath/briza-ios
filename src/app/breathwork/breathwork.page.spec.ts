import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BreathworkPage } from './breathwork.page';

describe('BreathworkPage', () => {
  let component: BreathworkPage;
  let fixture: ComponentFixture<BreathworkPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(BreathworkPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
