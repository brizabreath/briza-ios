import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HATCPage } from './hatc.page';

describe('HATCPage', () => {
  let component: HATCPage;
  let fixture: ComponentFixture<HATCPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HATCPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
