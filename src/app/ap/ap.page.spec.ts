import { ComponentFixture, TestBed } from '@angular/core/testing';
import { APPage } from './ap.page';

describe('APPage', () => {
  let component: APPage;
  let fixture: ComponentFixture<APPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(APPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
