import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular';

import {
  collection,
  getDocs,
  query,
  orderBy,
  type CollectionReference,
  doc,
  getDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { ToastController } from '@ionic/angular';
import { FirebaseService } from '../services/firebase.service';

interface CommentRow {
  id: string;
  text: string;
  userName: string;
  videoId: string;
  videoTitle: string;
  createdAt: Date | null;
}

@Component({
  selector: 'app-manage-comments',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule],
  templateUrl: './manage-comments.page.html',
  styleUrls: ['./manage-comments.page.scss'],
})

export class ManageComments {
  q = '';
  comments = signal<CommentRow[]>([]);
  // + state for reply
  replyOpenId: string | null = null;
  replyText = '';

  constructor(
    private firebase: FirebaseService,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
  ) {}

  async ionViewWillEnter() {
    const db = this.firebase.firestore!;
    const videosSnap = await getDocs(collection(db, 'videos'));

    const all: CommentRow[] = [];

    for (const v of videosSnap.docs) {
      const videoId = v.id;
      const videoData = v.data() as any;
      const title =
        videoData.title ||
        videoData.videoTitle ||
        videoData.name ||
        videoData.meta?.title ||
        '(untitled)';

      const commentsRef = collection(db, `videos/${videoId}/comments`) as CollectionReference<any>;
      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);

      snap.forEach(c => {
        const data = c.data();
        all.push({
          id: c.id,
          text: data.text,
          userName: data.userName,
          videoId,
          videoTitle: title,
          createdAt: data.createdAt?.toDate?.() ?? null,
        });
      });
    }
    all.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    this.comments.set(all);
  }


  filtered = computed(() => {
    const term = this.q.toLowerCase();
    return this.comments().filter(c =>
      c.text.toLowerCase().includes(term) ||
      c.userName.toLowerCase().includes(term) ||
      c.videoTitle.toLowerCase().includes(term) ||
      c.videoId.toLowerCase().includes(term)
    );
  });
   // + helper: is admin?
  private isAdmin(): boolean {
    const email = (this.firebase.auth?.currentUser?.email || '').toLowerCase();
    return email === 'info@brizabreath.com';
  }

  // + helper: online guard
  private async guardOnline(): Promise<boolean> {
    if (navigator.onLine) return true;
    const t = await this.toastCtrl.create({ message: 'You are offline.', duration: 1500 });
    await t.present();
    return false;
  }

  // + UI toggle for reply box
  toggleReply(id: string) {
    this.replyOpenId = this.replyOpenId === id ? null : id;
    if (!this.replyOpenId) this.replyText = '';
  }

  // + DELETE (admin or owner—server rules also enforce)
  async deleteComment(c: CommentRow) {
    if (!this.isAdmin()) return; // extra safety on UI
    if (!(await this.guardOnline())) return;

    const ok = confirm('Delete this comment?');
    if (!ok) return;

    const db = this.firebase.firestore!;
    await deleteDoc(doc(db, `videos/${c.videoId}/comments/${c.id}`));

    // Optional UX: remove locally (snapshot refresh will also handle it)
    this.comments.set(this.comments().filter(x => x.id !== c.id));
  }

  // + REPLY (posts a child comment with parentId)
  async submitReply(parent: CommentRow) {
    if (!this.isAdmin()) return; // only admin uses this page
    if (!(await this.guardOnline())) return;

    const text = this.replyText.trim();
    if (!text) return;

    const user = this.firebase.auth?.currentUser;
    if (!user) {
      const t = await this.toastCtrl.create({ message: 'Please log in.', duration: 1500 });
      await t.present();
      return;
    }

    const name = (localStorage.getItem('currentUserName') || 'Admin').trim();
    const db = this.firebase.firestore!;
    const commentsRef = collection(db, `videos/${parent.videoId}/comments`) as CollectionReference<any>;

    // 🟢 Save reply as a new comment under the video
    const replyDoc = await addDoc(commentsRef, {
      text,
      userId: user.uid,
      userName: name,
      parentId: parent.id,
      createdAt: serverTimestamp(),
    });

    // reset UI
    this.replyText = '';
    this.replyOpenId = null;

    // 🔄 re-fetch comments so the admin sees the new one
    await this.ionViewWillEnter();

    const t = await this.toastCtrl.create({ message: 'Reply posted.', duration: 1200 });
    await t.present();

    // ==============================
    // 📨 Notify the original commenter
    // ==============================
    try {
      const parentSnap = await getDoc(doc(db, `videos/${parent.videoId}/comments/${parent.id}`));
      if (!parentSnap.exists()) {
        console.warn('⚠️ Parent comment not found');
        return;
      }

      const parentData = parentSnap.data() as any;
      const parentUserId = parentData.userId;

      if (!parentUserId) {
        console.warn('⚠️ Parent comment missing userId');
        return;
      }

      const replyId = replyDoc.id; // use actual reply ID
      await setDoc(doc(db, `users/${parentUserId}/notifications/${replyId}`), {
        type: 'commentReply',
        videoId: parent.videoId,
        replierName: name,
        createdAt: serverTimestamp(),
        seen: false,
      });

      console.log(`💾 Saved notification for user ${parentUserId} about reply ${replyId}`);
    } catch (err) {
      console.error('❌ Failed to save Firestore notification:', err);
    }
  }

    // Method to navigate back
  goBack(): void {
    this.navCtrl.back();
  }
}
