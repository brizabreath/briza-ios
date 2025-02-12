import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BHPage } from './bh.page';

describe('BHPage', () => {
  let component: BHPage;
  let fixture: ComponentFixture<BHPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BHPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
