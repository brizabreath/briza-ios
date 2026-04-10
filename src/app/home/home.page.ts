import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CoreModule } from '../core.module';
import { Router, RouterModule } from '@angular/router'; // Import RouterModule
import { GlobalService } from '../services/global.service';
import { ShepherdService } from 'angular-shepherd';
import { ModalController, NavController } from '@ionic/angular';
import { GlobalAlertService } from '../services/global-alert.service';
import { DomSanitizer } from '@angular/platform-browser';
import { VideoModalComponent } from '../modals/video-modal.component';
import { VimeoMetaService } from '../services/vimeo-meta.service';
import { ActivatedRoute } from '@angular/router';
import { collection } from 'firebase/firestore';
import { getDocsFromServer } from 'firebase/firestore';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, CoreModule, RouterModule],
})
export class HomePage {
  constructor(
    private globalService: GlobalService,
    private shepherd: ShepherdService,
    private router: Router,
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private globalAlert: GlobalAlertService,
    private modalCtrl: ModalController,
    private sanitizer: DomSanitizer,
    private vimeoMeta: VimeoMetaService,
    private firebaseService: FirebaseService,
  ) {}
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  private likedKey = 'likedYogaIds';
  selectedSegment: string = 'sessions';
  isMember = false;
  lungsVideos: any[] = [];
  private openingVideo = false;
  meditateVideos: any[] = [];
  ngOnInit() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'isPortuguese') {
        this.isPortuguese = e.newValue === 'true';
        this.loadLungsVideosFromCache();
        this.loadMeditateVideosFromCache();
      }

      if (e.key === 'membershipStatus') {
        this.isMember = e.newValue === 'active';
        this.loadLungsVideosFromCache();
        this.loadMeditateVideosFromCache();
      }

      if (e.key === 'cachedYogaVideos') {
        this.loadLungsVideosFromCache();
        this.loadMeditateVideosFromCache();
      }
    });
  }
  async ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    this.isMember = localStorage.getItem('membershipStatus') === 'active';
    await this.ensureYogaVideosCache();
    this.loadLungsVideosFromCache();
    this.loadMeditateVideosFromCache();
    this.openFromQueryParamIfAny().catch(() => {});
  }
  private async ensureYogaVideosCache(): Promise<void> {
    let cachedVideos: any[] = [];

    try {
      const raw = localStorage.getItem('cachedYogaVideos');
      if (raw) cachedVideos = JSON.parse(raw)?.videos ?? [];
    } catch {}

    // if cache already has videos, no need to fetch
    if (cachedVideos.length > 0) return;

    if (!navigator.onLine || !this.firebaseService.firestore) return;

    try {
      const snap = await getDocsFromServer(collection(this.firebaseService.firestore, 'videos'));

      const videos = snap.docs.map((d) => {
        const v = d.data() as any;
        const rawUrl = v.url || v.rawUrl || v.videoUrl || '';
        return {
          id: d.id,
          ...v,
          videoUrl: v.videoUrl || this.vimeoMeta.toPlayerUrl(rawUrl),
          isFree: !!v.isFree,
        };
      });

      localStorage.setItem(
        'cachedYogaVideos',
        JSON.stringify({ ts: Date.now(), videos })
      );
    } catch (e) {
      console.error('Failed to build cachedYogaVideos:', e);
    }
  }
  ionViewDidEnter() {
  const shouldStart = localStorage.getItem('startHomeTour') === 'true';
  if (shouldStart) {
    localStorage.removeItem('startHomeTour');
  }else{
    return;
  }
  const isPT = localStorage.getItem('isPortuguese') === 'true';
  const t = (en: string, pt: string) => (isPT ? pt : en);
  const sel = (enSel: string, ptSel: string) => (isPT ? ptSel : enSel);

  this.shepherd.defaultStepOptions = {
    cancelIcon: { enabled: true },
    scrollTo: true,
    canClickTarget: false,
    modalOverlayOpeningPadding: 4,
    modalOverlayOpeningRadius: 10,
    classes: 'briza-tour',
  };
  this.shepherd.modal = true;

  setTimeout(() => {
    this.shepherd.addSteps([
      {
        id: 'hp-heart', 
        text: `
               <p>${t('Every class that you liked will be saved here',
                      'Todas as aulas que você curtiu serão salvas aqui')}</p>`,
        attachTo: { element: '#hp-heart', on: 'bottom' },
        buttons: [
          { text: t('Next','Próximo'), action: () => this.shepherd.next() },
        ]
      },
      { 
        id: 'hp-med',
        text: `
               <p>${t('Simple timer for you to track your meditation sessions',
                      'Um cronômetro simples para você acompanhar suas sessões de meditação')}</p>`,
        attachTo: { element: '#hp-med', on: 'bottom' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      { 
        id: 'hp-program2',
        text: `<h3>${t('Briza program','Programa Briza')}</h3>
               <p>${t('Daily exercises to improve breathing efficiency and quality',
                      'Exercícios diários para melhorar a eficiência e a qualidade respiratória')}</p>`,
        attachTo: { element: '#hp-program2', on: 'bottom' },
        buttons: [
          { text: t('Next','Próximo'), action: () => this.shepherd.next() },
        ]
      },
      {
        id: 'hp-prana',
        text: `<h3>${t('Traditional breathwork','Respirações tradicionais')}</h3>
               <p>${t('Breathing techniques to calm and balance your body',
                      'Técnicas de respiração para acalmar e equilibrar o corpo')}</p>`,
        attachTo: { element: '#hp-prana', on: 'bottom' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      {
        id: 'hp-bh',
        text: `<h3>${t('Breath holding','Apneia')}</h3>
               <p>${t('Improve CO₂ tolerance and mental resilience',
                      'Melhore a tolerância ao CO₂ e a resiliência mental')}</p>`,
        attachTo: { element: '#hp-bh', on: 'bottom' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      {
        id: 'hp-cust',
        text: `<h3>${t('Custom session','Sessão personalizada')}</h3>
               <p>${t('Create a breathing session adapted to your needs',
                      'Crie uma sessão de respiração adaptada às suas necessidades')}</p>`,
        attachTo: { element: '#hp-cust', on: 'bottom' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { 
            text: t('Next','Próximo'), 
            action: async () => {
              await this.selectSegment('breathing');
              await this.ensureStepTargetVisible('#hp-meditate-row');
              this.shepherd.next();
            }
          }     
        ]
      },
      {
        id: 'hp-meditate-row',
        text: `<h3>${t('Breathe & meditate','Respire e medite')}</h3>
               <p>${t('Guided classes of breathing exercices and meditation',
                      'Aulas guiadas de exercícios respiratórios e meditação.')}</p>`,
        attachTo: { element: '#hp-meditate-row', on: 'bottom' },
        buttons: [
          {
            text: t('Back','Voltar'),
            action: async () => {
              await this.selectSegment('sessions');
              await this.ensureStepTargetVisible('#hp-cust');
              this.shepherd.back();
            }
          },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      {
        id: 'hp-lungs',
        text: `<h3>${t('Lungs expansion','Expansão pulmonar')}</h3>
               <p>${t('Exercises to increase lungs capacity',
                      'Exercícios para aumentar a capacidade pulmonar')}</p>`,
        attachTo: { element: '#hp-lungs', on: 'bottom' },
        buttons: [
          { text: t('Back','Voltar'), action: () => this.shepherd.back() },
          { text: t('Next','Próximo'), action: () => this.shepherd.next() }
        ]
      },
      {
          id: 'brt-finish3',
          text: 
            `<h3>${t('Get started','Comece agora')}</h3>
            <p>${t(
              'Start the Briza Program and discover how far you can go',
              'Inicie pelo Programa Briza e descubra até onde você pode chegar'
            )}</p>`,
        buttons: [
          { 
            text: t('Start program','Iniciar programa'), 
            action: () => {
              this.shepherd.complete();
              localStorage.setItem('startProgTour','true');
              this.router.navigateByUrl('/program');
            },
          }
        ]
        }
      ]);

      const tour: any = (this.shepherd as any).tourObject || (this.shepherd as any).tour;
      if (tour?.on) {
        tour.off?.('start', this.lockUIForTour);
        tour.off?.('complete', this.unlockUIForTour);
        tour.off?.('cancel', this.unlockUIForTour);
        tour.off?.('inactive', this.unlockUIForTour);

        tour.on('start', this.lockUIForTour);
        tour.on('complete', this.unlockUIForTour);
        tour.on('cancel', this.unlockUIForTour);
        tour.on('inactive', this.unlockUIForTour);
      }

      this.shepherd.start();  
    }, 0);
  }
  private waitNextFrame(frames = 2): Promise<void> {
    return new Promise((resolve) => {
      const tick = () => {
        if (--frames <= 0) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  private async ensureStepTargetVisible(selector: string): Promise<void> {
    // Wait for Angular to insert the DOM for the new segment
    await this.waitNextFrame(2);

    // Wait until element exists (up to ~1s)
    const start = Date.now();
    while (!document.querySelector(selector) && Date.now() - start < 1000) {
      await this.waitNextFrame(1);
    }

    // If it exists, scroll it into view (helps a lot on iOS)
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      await this.waitNextFrame(2);
    }

    // Tell Shepherd to recompute position
    const tour: any = (this.shepherd as any).tourObject || (this.shepherd as any).tour;
    tour?.currentStep?.updateStepOptions?.({});
    tour?.currentStep?.position?.();
  }
  ionViewDidLeave() {
    this.unlockUIForTour();
  }
  private lockUIForTour = () => {
    document.documentElement.classList.add('tour-active');
    document.body.style.overflow = 'hidden'; // stop background scroll
  };

  private unlockUIForTour = () => {
    document.documentElement.classList.remove('tour-active');
    document.body.style.overflow = '';
  };
  hasLikedClasses(): boolean {
    const ids: string[] = JSON.parse(localStorage.getItem(this.likedKey) || '[]');
    return ids.length > 0;
  }
  goToLikedClasses(): void{
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';
    if(this.hasLikedClasses()){
      this.navCtrl.navigateRoot('/yogaLikedPage');
    }
    else{
      this.globalAlert.showalert(
        this.isPortuguese ? 'Aulas curtidas' : 'Liked classes',
        this.isPortuguese
          ? 'Você ainda não curtiu de nenhuma aula'
          : 'You did not like any classes yet'
      );
    }
  }
  async selectSegment(segment: 'sessions' | 'breathing') {
    this.selectedSegment = segment;
    await this.waitNextFrame(2);
  }
  private loadLungsVideosFromCache(): void {
    const selectedLanguage = this.isPortuguese ? 'PT' : 'EN';

    let cachedVideos: any[] = [];
    try {
      const raw = localStorage.getItem('cachedYogaVideos');
      if (raw) cachedVideos = JSON.parse(raw)?.videos ?? [];
    } catch {}

    const normalized = (cachedVideos || []).map((v: any) => {
      const rawUrl = v.url || v.rawUrl || v.videoUrl || '';
      return {
        ...v,
        videoUrl: v.videoUrl || this.vimeoMeta.toPlayerUrl(rawUrl),
        isFree: !!v.isFree,
      };
    });

    const base = normalized.filter((v: any) => {
      return v.category === 'lungs' && v.language === selectedLanguage;
    });

    // helper: newest first (fallback to 0 if missing)
    const toTime = (x: any) => {
      const d = x?.addedOn;
      if (!d) return 0;
      // supports Firestore Timestamp, ISO string, number
      if (typeof d === 'number') return d;
      if (typeof d === 'string') return Date.parse(d) || 0;
      if (typeof d?.toMillis === 'function') return d.toMillis();
      if (d?.seconds != null) return (d.seconds * 1000) + Math.floor((d.nanoseconds || 0) / 1e6);
      return 0;
    };

    // ---- Pin "Intro" first ----
    const isIntro = (v: any) => (v?.title || '').trim().toLowerCase() === 'intro';
    const intro = base.find(isIntro);
    const withoutIntro = base.filter(v => !isIntro(v));

    // ---- Now apply membership rules ----
    if (!this.isMember) {
      const free = withoutIntro.filter(v => !!v.isFree).sort((a, b) => toTime(b) - toTime(a));
      const paid = withoutIntro.filter(v => !v.isFree).sort((a, b) => toTime(b) - toTime(a));

      this.lungsVideos = intro ? [intro, ...free, ...paid] : [...free, ...paid];
    } else {
      const all = withoutIntro.sort((a, b) => toTime(b) - toTime(a));
      this.lungsVideos = intro ? [intro, ...all] : all;
    }
  }
  async onVideoClick(video: any) {
    if (this.openingVideo) return;
    this.openingVideo = true;

    try {
      if (!navigator.onLine) {
        const msg = this.isPortuguese
          ? '🌐 Você está offline.\n\nConecte-se à internet para assistir a este vídeo'
          : '🌐 You are offline.\n\nConnect to the internet to watch this video';
        this.globalAlert.showalert('OFFLINE', msg);
        return;
      }

      if (!video.isFree && !this.isMember) {
        this.globalService.openModal2Safe();
        return;
      }

      const url = this.sanitizer.bypassSecurityTrustResourceUrl(video.videoUrl || video.url);

      const modal = await this.modalCtrl.create({
        component: VideoModalComponent,
        componentProps: {
          url,
          title: video.title,
          description: video.description,
          duration: video.duration,
          videoId: video.id,
          addedOn: video.addedOn,
          category: video.category,
        },
        cssClass: 'video-modal',
      });

      await modal.present();
    } finally {
      setTimeout(() => (this.openingVideo = false), 250);
    }
  }
  private loadMeditateVideosFromCache(): void {
    const selectedLanguage = this.isPortuguese ? 'PT' : 'EN';

    let cachedVideos: any[] = [];
    try {
      const raw = localStorage.getItem('cachedYogaVideos');
      if (raw) cachedVideos = JSON.parse(raw)?.videos ?? [];
    } catch {}

    const normalized = (cachedVideos || []).map((v: any) => {
      const rawUrl = v.url || v.rawUrl || v.videoUrl || '';
      return {
        ...v,
        videoUrl: v.videoUrl || this.vimeoMeta.toPlayerUrl(rawUrl),
        isFree: !!v.isFree,
      };
    });

    const base = normalized.filter((v: any) => {
      return v.category === 'meditate' && v.language === selectedLanguage;
    });

    const toTime = (x: any) => {
      const d = x?.addedOn;
      if (!d) return 0;

      if (typeof d === 'number') return d;

      if (typeof d?.toMillis === 'function') return d.toMillis();

      if (d?.seconds != null) {
        return (d.seconds * 1000) + Math.floor((d.nanoseconds || 0) / 1e6);
      }

      if (typeof d === 'string') {
        const s = d.trim();

        // dd/mm/yy or dd/mm/yyyy
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
        if (m) {
          const dd = Number(m[1]);
          const mm = Number(m[2]);
          let yy = Number(m[3]);

          if (m[3].length === 2) yy = 2000 + yy;

          const date = new Date(yy, mm - 1, dd, 12, 0, 0);
          const ts = date.getTime();
          return Number.isFinite(ts) ? ts : 0;
        }

        const parsed = Date.parse(s);
        return Number.isFinite(parsed) ? parsed : 0;
      }

      return 0;
    };

    if (!this.isMember) {
      const free = base.filter(v => !!v.isFree).sort((a, b) => toTime(b) - toTime(a));
      const paid = base.filter(v => !v.isFree).sort((a, b) => toTime(b) - toTime(a));
      this.meditateVideos = [...free, ...paid];
    } else {
      this.meditateVideos = base.sort((a, b) => toTime(b) - toTime(a));
    }
  }
  private async openFromQueryParamIfAny(): Promise<void> {
    const openId = this.route.snapshot.queryParamMap.get('open');
    if (!openId) return;

    // optional: switch segment if passed
    const seg = this.route.snapshot.queryParamMap.get('segment') as any;
    if (seg === 'sessions' || seg === 'breathing') {
      this.selectedSegment = seg;
    }

    // find video from cache
    const video = this.getVideoByIdFromCache(openId);
    if (video) {
      await this.onVideoClick(video);
    } else {
      console.warn('Home open: video not found', openId);
    }

    // remove query param so it won't reopen on refresh/back
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { open: null, segment: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private getVideoByIdFromCache(id: string): any | null {
    let cachedVideos: any[] = [];
    try {
      const raw = localStorage.getItem('cachedYogaVideos');
      if (raw) cachedVideos = JSON.parse(raw)?.videos ?? [];
    } catch {}

    const selectedLanguage = this.isPortuguese ? 'PT' : 'EN';

    const v = (cachedVideos || []).find((x: any) => x?.id === id && x?.language === selectedLanguage);
    if (!v) return null;

    const rawUrl = v.url || v.rawUrl || v.videoUrl || '';
    return {
      ...v,
      videoUrl: v.videoUrl || this.vimeoMeta.toPlayerUrl(rawUrl),
      isFree: !!v.isFree,
    };
  }
}
