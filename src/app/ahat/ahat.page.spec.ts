import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AHATPage } from './ahat.page';

describe('AHATPage', () => {
  let component: AHATPage;
  let fixture: ComponentFixture<AHATPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AHATPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
