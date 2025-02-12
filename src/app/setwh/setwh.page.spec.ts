import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SETWHPage } from './setwh.page';

describe('SETWHPage', () => {
  let component: SETWHPage;
  let fixture: ComponentFixture<SETWHPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SETWHPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
