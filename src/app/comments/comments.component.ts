import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import {
  collection, addDoc, serverTimestamp, query, orderBy,
  onSnapshot, doc, deleteDoc, type CollectionReference
} from 'firebase/firestore';
import { FirebaseService } from '../services/firebase.service';
import { GlobalAlertService } from '../services/global-alert.service';
import { LocalReminderService } from '../services/local-reminder.service';

interface VideoComment {
  id?: string;
  text: string;
  userId: string;
  userName: string;
  parentId?: string | null;
  createdAt: any;
}

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  template: `
  <div class="comments-container">
    <h2 class="comments-title">{{ L.comments }}</h2>

    <!-- Add new top-level comment -->
    <form (ngSubmit)="addComment()" class="comment-form">
      <ion-textarea
        [(ngModel)]="newComment"
        name="newComment"
        [placeholder]="L.writeComment"
        autoGrow="true">
      </ion-textarea>
      <ion-button type="submit" expand="block" class="commentPost">{{ L.post }}</ion-button>
    </form>

    <!-- Empty state -->
    <div *ngIf="topLevel().length === 0" class="empty-state">
      {{ L.beFirst }}
    </div>

    <!-- Thread -->
    <div class="comment-thread">
      <ng-container *ngFor="let c of topLevel()">
        <div class="comment">
          <div class="meta">
            <b>{{ c.userName || 'User' }}</b>
            <span>{{ timeAgo(c.createdAt?.toDate?.() || null) }}</span>
            <ion-button fill="clear" size="small" (click)="toggleReplyBox(c.id!)">{{ L.reply }}</ion-button>
            <ion-button *ngIf="canDelete(c)" fill="clear" size="small" class="delete-button" (click)="deleteComment(c)">{{ L.delete }}</ion-button>
          </div>

          <div class="textCom">{{ c.text }}</div>

          <!-- Reply box -->
          <form *ngIf="replyBoxOpenId() === c.id" (ngSubmit)="addReply(c.id!)" class="reply-form">
            <ion-textarea
              [(ngModel)]="replyText"
              name="replyText"
              [placeholder]="L.writeReply"
              autoGrow="true">
            </ion-textarea>
            <div class="reply-actions">
              <ion-button type="submit" size="small" class="commentPost">{{ L.reply }}</ion-button>
              <ion-button type="button" size="small" fill="clear" (click)="toggleReplyBox(null)">{{ L.cancel }}</ion-button>
            </div>
          </form>

          <!-- Replies -->
          <div class="replies" *ngIf="repliesByParent(c.id!).length">
            <div class="reply" *ngFor="let r of repliesByParent(c.id!)">
              <div class="meta">
                <b>{{ r.userName || 'User' }}</b>
                <span>{{ timeAgo(r.createdAt?.toDate?.() || null) }}</span>
                <ion-button *ngIf="canDelete(r)" fill="clear" size="small" class="delete-button" (click)="deleteComment(r)">{{ L.delete }}</ion-button>
              </div>
              <div class="textCom">{{ r.text }}</div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  </div>
  `,
  styles: [`
    .comments-container { padding: 12px; text-align: left; }
    .comments-title { font-size: 18px; margin: 8px 0 12px; }
    .comment-form, .reply-form { display: grid; gap: 8px; margin-bottom: 12px; }
    .comment-thread { display: flex; flex-direction: column; gap: 12px; align-items: stretch; }
    .comment { background: #f7f9fc; border-radius: 14px; padding: 10px 12px; }
    .meta { display: flex; align-items: center; gap: 8px; font-size: 12px; opacity: 0.85; justify-content: flex-start; }
    .textCom { margin-top: 6px; white-space: pre-wrap; }
    .replies { margin-left: 12px; border-left: 2px solid #e5e7eb; padding-left: 10px; margin-top: 8px; display: grid; gap: 8px; }
    .reply { background: #ffffff; border-radius: 12px; padding: 8px 10px; }
    .reply-actions { display: flex; gap: 8px; align-items: center; }
    .empty-state { opacity: 0.7; font-style: italic; padding: 8px 0; }
  `]
})
export class CommentsComponent {
  @Input({ required: true }) videoId!: string;

  newComment = '';
  replyText = '';

  private comments = signal<VideoComment[]>([]);
  replyBoxOpenId = signal<string | null>(null);

  constructor(
    private firebaseService: FirebaseService,
    private toastCtrl: ToastController,
    private globalAlert: GlobalAlertService,
    private localReminders: LocalReminderService
  ) {}

  ngOnInit() {
    const db = this.firebaseService.firestore!;
    const commentsRef = collection(db, `videos/${this.videoId}/comments`) as CollectionReference<VideoComment>;
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    onSnapshot(q, (snap) => {
      const rows: VideoComment[] = [];
      snap.forEach(d => {
        const data = d.data() as VideoComment;
        rows.push({
          id: d.id,
          text: data.text,
          userId: data.userId,
          userName: data.userName,
          parentId: data.parentId ?? null, // 👈 normalize
          createdAt: data.createdAt,
        });
      });
      this.comments.set(rows);
    });
  }

  // ===== i18n (EN/PT) =====
  get isPT() { return localStorage.getItem('isPortuguese') === 'true'; }
  en = {
    comments: 'Comments',
    writeComment: 'Write a comment...',
    writeReply: 'Write a reply...',
    post: 'Post',
    beFirst: 'Be the first to comment',
    reply: 'Reply',
    cancel: 'Cancel',
    delete: 'Delete',
    offline: 'You are offline.',
    loginToComment: 'Please log in to comment',
    ago: { s: 's ago', m: 'm ago', h: 'h ago', d: 'd ago' }
  };
  pt = {
    comments: 'Comentários',
    writeComment: 'Escreva um comentário...',
    writeReply: 'Escreva uma resposta...',
    post: 'Publicar',
    beFirst: 'Seja o primeiro a comentar',
    reply: 'Responder',
    cancel: 'Cancelar',
    delete: 'Excluir',
    offline: 'Você está offline.',
    loginToComment: 'Faça login para comentar',
    ago: { s: 's atrás', m: 'min atrás', h: 'h atrás', d: 'd atrás' }
  };
  get L() { return this.isPT ? this.pt : this.en; }

  // ===== Derived data =====
  topLevel = computed(() => this.comments().filter(c => !c.parentId));
  repliesByParent = (parentId: string) =>
  this.comments().filter(c => (c.parentId ?? '') === parentId);

  // ===== UI actions =====
  toggleReplyBox(id: string | null) {
    this.replyBoxOpenId.set(this.replyBoxOpenId() === id ? null : id);
    if (!id) this.replyText = '';
  }

  async addComment() {
    if (!this.guardOnline()) return;
    const text = this.newComment?.trim();
    if (!text) return;

    const user = this.firebaseService.auth!.currentUser;
    if (!user) { await this.needLoginToast(); return; }

    // ✅ Only use stored user name (set by AuthService in localStorage)
    const name = (localStorage.getItem('currentUserName') || 'User').trim();

    const db = this.firebaseService.firestore!;
    const commentsRef = collection(db, `videos/${this.videoId}/comments`) as CollectionReference<VideoComment>;
    await addDoc(commentsRef, {
      text,
      userId: user.uid,
      userName: name,
      parentId: null,  // 👈 ensure explicit null for top-level
      createdAt: serverTimestamp(),
    });
    this.newComment = '';
  }

  async addReply(parentId: string) {
    if (!this.guardOnline()) return;
    const text = this.replyText?.trim();
    if (!text) return;

    const user = this.firebaseService.auth!.currentUser;
    if (!user) { await this.needLoginToast(); return; }

    const name = (localStorage.getItem('currentUserName') || 'User').trim();
    const db = this.firebaseService.firestore!;
    const commentsRef = collection(db, `videos/${this.videoId}/comments`) as CollectionReference<VideoComment>;

    // 📝 Save reply in Firestore
    const replyDoc = await addDoc(commentsRef, {
      text,
      userId: user.uid,
      userName: name,
      parentId: parentId || null,  // 👈 ensure explicit null for top-level
      createdAt: serverTimestamp(),
    });
    console.log('✅ Reply saved:', { replyId: replyDoc.id, parentId, videoId: this.videoId });
    // Cloud Function will notify the parent comment owner.
    this.replyText = '';
    this.replyBoxOpenId.set(null);
    
  }

  async deleteComment(c: VideoComment) {
    if (!this.guardOnline() || !c.id) return;
    const confirmed = await this.globalAlert.showConfirm(
      'Delete comment',
      'Delete this comment?',
      'Yes',
      'No'
    );

    if (!confirmed){return}
    const db = this.firebaseService.firestore!;
    await deleteDoc(doc(db, `videos/${this.videoId}/comments/${c.id}`));
  }

  canDelete(c: VideoComment) {
    const user = this.firebaseService.auth!.currentUser;
    if (!user) return false;

    const uid = user.uid;
    const email = (user.email || '').toLowerCase();

    const isAdmin = this.firebaseService.isAdminEmail(email);
    const isOwner = c.userId === uid;

    return isAdmin || isOwner;
  }


  // ===== Time ago (EN/PT) =====
  timeAgo(date: Date | null) {
    if (!date) return this.isPT ? 'agora' : 'just now';
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}${this.L.ago.s}`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}${this.L.ago.m}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}${this.L.ago.h}`;
    const d = Math.floor(h / 24);
    return `${d}${this.L.ago.d}`;
  }

  // ===== Toasts / guards =====
  private async needLoginToast() {
    const t = await this.toastCtrl.create({ message: this.L.loginToComment, duration: 2000 });
    await t.present();
  }

  private guardOnline(): boolean {
    if (!navigator.onLine) {
      this.toastCtrl.create({ message: this.L.offline, duration: 1500 }).then(t => t.present());
      return false;
    }
    return true;
  }
}
