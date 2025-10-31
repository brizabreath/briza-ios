import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TIMERPage } from './timer.page';

describe('TIMERPage', () => {
  let component: TIMERPage;
  let fixture: ComponentFixture<TIMERPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TIMERPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
