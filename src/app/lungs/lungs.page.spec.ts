import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LungsPage } from './lungs.page';

describe('LungsPage', () => {
  let component: LungsPage;
  let fixture: ComponentFixture<LungsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LungsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
