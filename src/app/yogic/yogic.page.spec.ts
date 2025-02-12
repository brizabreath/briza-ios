import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YogicPage } from './yogic.page';

describe('YogicPage', () => {
  let component: YogicPage;
  let fixture: ComponentFixture<YogicPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(YogicPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
