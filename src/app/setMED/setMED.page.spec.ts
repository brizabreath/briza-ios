import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SetMEDPage } from './setMED.page';

describe('SetMEDPage', () => {
  let component: SetMEDPage;
  let fixture: ComponentFixture<SetMEDPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SetMEDPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
