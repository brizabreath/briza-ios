import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SETKBPage } from './setkb.page';

describe('SETKBPage', () => {
  let component: SETKBPage;
  let fixture: ComponentFixture<SETKBPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SETKBPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
