import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YogaPage } from './yoga.page';

describe('YogaPage', () => {
  let component: YogaPage;
  let fixture: ComponentFixture<YogaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(YogaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
