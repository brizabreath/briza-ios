import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CTPage } from './ct.page';

describe('CTPage', () => {
  let component: CTPage;
  let fixture: ComponentFixture<CTPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CTPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
