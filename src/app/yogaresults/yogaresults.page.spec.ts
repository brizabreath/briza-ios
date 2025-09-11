import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YogaresultsPage } from './yogaresults.page';

describe('YogaresultsPage', () => {
  let component: YogaresultsPage;
  let fixture: ComponentFixture<YogaresultsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(YogaresultsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
