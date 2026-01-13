import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YogaLikedPagePage } from './yogaLikedPage.page';

describe('YogaLikedPagePage', () => {
  let component: YogaLikedPagePage;
  let fixture: ComponentFixture<YogaLikedPagePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(YogaLikedPagePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
