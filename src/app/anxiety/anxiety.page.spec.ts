import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnxietyPage } from './anxiety.page';

describe('AnxietyPage', () => {
  let component: AnxietyPage;
  let fixture: ComponentFixture<AnxietyPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(AnxietyPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
