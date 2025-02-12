import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RBPage } from './rb.page';

describe('RBPage', () => {
  let component: RBPage;
  let fixture: ComponentFixture<RBPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RBPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
