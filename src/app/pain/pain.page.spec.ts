import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainPage } from './pain.page';

describe('PainPage', () => {
  let component: PainPage;
  let fixture: ComponentFixture<PainPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(PainPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
