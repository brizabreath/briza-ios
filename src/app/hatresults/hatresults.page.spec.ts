import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HatresultsPage } from './hatresults.page';

describe('HatresultsPage', () => {
  let component: HatresultsPage;
  let fixture: ComponentFixture<HatresultsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HatresultsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
