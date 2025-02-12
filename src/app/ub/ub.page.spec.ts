import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UBPage } from './ub.page';

describe('UBPage', () => {
  let component: UBPage;
  let fixture: ComponentFixture<UBPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UBPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
