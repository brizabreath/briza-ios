import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ALLresultsPage } from './allresults.page';

describe('ALLresultsPage', () => {
  let component: ALLresultsPage;
  let fixture: ComponentFixture<ALLresultsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ALLresultsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
