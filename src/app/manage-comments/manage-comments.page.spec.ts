import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageComments } from './manage-comments.page';

describe('ProfilePage', () => {
  let component: ManageComments;
  let fixture: ComponentFixture<ManageComments>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(ManageComments);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
