import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WHresultsPage } from './whresults.page';

describe('WHresultsPage', () => {
  let component: WHresultsPage;
  let fixture: ComponentFixture<WHresultsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WHresultsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
