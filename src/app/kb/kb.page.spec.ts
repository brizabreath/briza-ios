import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KBPage } from './kb.page';

describe('KBPage', () => {
  let component: KBPage;
  let fixture: ComponentFixture<KBPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(KBPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
