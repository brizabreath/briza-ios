import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SetPage } from './set.page';

describe('SetPage', () => {
  let component: SetPage;
  let fixture: ComponentFixture<SetPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SetPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
