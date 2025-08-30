import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HUMPage } from './hum.page';

describe('HUMPage', () => {
  let component: HUMPage;
  let fixture: ComponentFixture<HUMPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HUMPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
