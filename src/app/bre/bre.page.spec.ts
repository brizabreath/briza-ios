import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BREPage } from './bre.page';

describe('BREPage', () => {
  let component: BREPage;
  let fixture: ComponentFixture<BREPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BREPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
