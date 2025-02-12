import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KBresultsPage } from './kbresults.page';

describe('KBresultsPage', () => {
  let component: KBresultsPage;
  let fixture: ComponentFixture<KBresultsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(KBresultsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
