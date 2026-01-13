import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VitalityPage } from './vitality.page';

describe('VitalityPage', () => {
  let component: VitalityPage;
  let fixture: ComponentFixture<VitalityPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(VitalityPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
