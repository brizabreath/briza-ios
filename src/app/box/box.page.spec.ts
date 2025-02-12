import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BOXPage } from './box.page';

describe('BOXPage', () => {
  let component: BOXPage;
  let fixture: ComponentFixture<BOXPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BOXPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
