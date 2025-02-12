import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CBPage } from './cb.page';

describe('BbPage', () => {
  let component: CBPage;
  let fixture: ComponentFixture<CBPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CBPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
