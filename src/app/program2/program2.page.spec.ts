import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Program2Page } from './program2.page';

describe('Program2Page', () => {
  let component: Program2Page;
  let fixture: ComponentFixture<Program2Page>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Program2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
