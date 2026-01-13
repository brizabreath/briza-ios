import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPassword2Page } from './forgot-password2.page';

describe('ForgotPassword2Page', () => {
  let component: ForgotPassword2Page;
  let fixture: ComponentFixture<ForgotPassword2Page>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ForgotPassword2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
