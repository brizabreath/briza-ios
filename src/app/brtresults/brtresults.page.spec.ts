import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrtresultsPage } from './brtresults.page';

describe('BrtresultsPage', () => {
  let component: BrtresultsPage;
  let fixture: ComponentFixture<BrtresultsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BrtresultsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
