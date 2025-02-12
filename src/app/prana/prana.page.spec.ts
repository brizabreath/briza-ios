import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PranaPage } from './prana.page';

describe('PranaPage', () => {
  let component: PranaPage;
  let fixture: ComponentFixture<PranaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PranaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
