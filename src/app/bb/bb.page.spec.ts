import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BBPage } from './bb.page';

describe('BbPage', () => {
  let component: BBPage;
  let fixture: ComponentFixture<BBPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BBPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
