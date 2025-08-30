import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DbPage } from './db.page';

describe('DbPage', () => {
  let component: DbPage;
  let fixture: ComponentFixture<DbPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DbPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
