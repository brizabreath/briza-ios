import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NBPage } from './nb.page';

describe('NBPage', () => {
  let component: NBPage;
  let fixture: ComponentFixture<NBPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NBPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
