import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BRWPage } from './brw.page';

describe('BRWPage', () => {
  let component: BRWPage;
  let fixture: ComponentFixture<BRWPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BRWPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
