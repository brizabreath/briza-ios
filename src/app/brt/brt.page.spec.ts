import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BRTPage } from './brt.page';

describe('BrtPage', () => {
  let component: BRTPage;
  let fixture: ComponentFixture<BRTPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BRTPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
