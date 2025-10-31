import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TIMERresultsPage } from './timerresults.page';

describe('TIMERresultsPage', () => {
  let component: TIMERresultsPage;
  let fixture: ComponentFixture<TIMERresultsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TIMERresultsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
