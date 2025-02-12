import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HATPage } from './hat.page';

describe('HATPage', () => {
  let component: HATPage;
  let fixture: ComponentFixture<HATPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HATPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
