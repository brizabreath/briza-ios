import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTPage } from './cust.page';

describe('CUSTPage', () => {
  let component: CUSTPage;
  let fixture: ComponentFixture<CUSTPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CUSTPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
