import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WHPage } from './wh.page';

describe('WHPage', () => {
  let component: WHPage;
  let fixture: ComponentFixture<WHPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WHPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
