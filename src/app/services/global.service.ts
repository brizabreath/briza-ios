import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AudioService } from './audio.service';
import { GlobalAlertService } from '../services/global-alert.service';
import { RevenuecatService } from '../services/revenuecat.service'; // ✅ NEW import

@Injectable({
  providedIn: 'root',
})
export class GlobalService {
  private slideIndex = 1;
  public timeouts: any[] = [];
  private isModalOpenSubject = new BehaviorSubject<boolean>(false);
  isModalOpen$ = this.isModalOpenSubject.asObservable();

  constructor(
    private audioService: AudioService,
    private globalAlert: GlobalAlertService,
    private rc: RevenuecatService // ✅ Inject RevenuecatService
  ) {}

  private get isPT() {
    return localStorage.getItem('isPortuguese') === 'true';
  }
  private get L() {
    return this.isPT
      ? { next: 'Próximo', start: 'Começar' }
      : { next: 'Next', start: 'Get started' };
  }

  // ✅ Replaces openModal2() + checkIfModalIsEmpty()
  openModal2Safe(): void {
    this.isModalOpenSubject.next(true); // Show modal
  }

  closeModal2(): void {
    this.isModalOpenSubject.next(false);
  }

  // ---------- Existing UI helper functions ----------
  hideElementsByClass(className: string): void {
    const elements = document.getElementsByClassName(className);
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i] as HTMLOptionElement;
      if (element.tagName.toLowerCase() === 'option') {
        element.remove();
      } else {
        element.style.display = 'none';
      }
    }
  }

  showElementsByClass(className: 'english' | 'portuguese'): void {
    const elements = document.getElementsByClassName(
      className
    ) as HTMLCollectionOf<HTMLElement>;
    for (let i = 0; i < elements.length; i++) {
      elements[i].style.display = 'block';
    }
  }

  // ---------- Slider logic (unchanged) ----------
  private sliderState = new WeakMap<
    HTMLElement,
    { slides: HTMLElement[]; dotsHost: HTMLElement; index: number }
  >();

  private controlsState = new WeakMap<
    HTMLElement,
    { footer: HTMLElement; button: HTMLButtonElement }
  >();

  initBulletSlider(
    containerRef: { nativeElement: HTMLElement },
    dotsRef: { nativeElement: HTMLElement },
    className: string
  ): void {
    const host = containerRef?.nativeElement;
    const dotsHost = dotsRef?.nativeElement;
    if (!host || !dotsHost) return;

    const slides = Array.from(
      host.getElementsByClassName(className)
    ) as HTMLElement[];
    if (!slides.length) return;

    dotsHost.innerHTML = '';
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', `Go to slide ${i + 1}`);
      b.addEventListener('click', () => this.goToSlide(host, i));
      dotsHost.appendChild(b);
    });

    this.sliderState.set(host, { slides, dotsHost, index: 0 });
    this.renderSlide(host, 0);
    this.attachSwipe(host);
  }

  private ensureControls(host: HTMLElement) {
    if (this.controlsState.get(host)) return;
    const footer = document.createElement('div');
    footer.className = 'modal-controls';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'modal-primary';
    btn.addEventListener('click', () => {
      const s = this.sliderState.get(host);
      if (!s) return;
      const last = s.index >= s.slides.length - 1;
      if (!last) {
        this.goToSlide(host, s.index + 1);
      } else {
        this.closeModal({ nativeElement: host });
      }
    });
    footer.appendChild(btn);
    host.appendChild(footer);
    this.controlsState.set(host, { footer, button: btn });
  }

  goToSlide(containerEl: HTMLElement, i: number): void {
    const state = this.sliderState.get(containerEl);
    if (!state) return;
    const clamped = Math.max(0, Math.min(i, state.slides.length - 1));
    if (clamped === state.index) return;
    this.renderSlide(containerEl, clamped);
  }

  private renderSlide(containerEl: HTMLElement, idx?: number): void {
    const state = this.sliderState.get(containerEl);
    if (!state) return;
    const nextIdx = typeof idx === 'number' ? idx : state.index;
    state.slides.forEach((el, i) => el.classList.toggle('active', i === nextIdx));
    const dots = Array.from(state.dotsHost.children) as HTMLElement[];
    dots.forEach((d, i) => d.classList.toggle('active', i === nextIdx));
    state.index = nextIdx;
    const ctrl = this.controlsState.get(containerEl);
    if (ctrl) {
      const last = nextIdx >= state.slides.length - 1;
      ctrl.button.textContent = last ? this.L.start : this.L.next;
      ctrl.button.setAttribute('aria-label', ctrl.button.textContent || '');
    }
  }

  private attachSwipe(host: HTMLElement): void {
    let startX = 0,
      curX = 0,
      down = false;
    const onStart = (x: number) => {
      down = true;
      startX = curX = x;
    };
    const onMove = (x: number) => {
      if (down) curX = x;
    };
    const onEnd = () => {
      if (!down) return;
      const dx = curX - startX;
      down = false;
      const state = this.sliderState.get(host);
      if (!state) return;
      const THRESH = 40;
      if (dx > THRESH) this.goToSlide(host, state.index - 1);
      if (dx < -THRESH) this.goToSlide(host, state.index + 1);
    };
    host.addEventListener('pointerdown', (e) =>
      onStart((e as PointerEvent).clientX)
    );
    host.addEventListener('pointermove', (e) =>
      onMove((e as PointerEvent).clientX)
    );
    host.addEventListener('pointerup', onEnd);
    host.addEventListener('pointercancel', onEnd);
    host.addEventListener('pointerleave', onEnd);
  }

  openModal(element: any, dotsRef?: any, className: string = 'slides'): void {
    if (!element) return;
    const host = element.nativeElement;
    host.style.display = 'block';
    if (!this.sliderState.get(host) && dotsRef?.nativeElement) {
      this.initBulletSlider(element, dotsRef, className);
    } else {
      this.ensureControls(host);
      const state = this.sliderState.get(host);
      if (state) this.renderSlide(host, state.index);
    }
  }

  closeModal(element: any): void {
    if (!element) return;
    const host = element.nativeElement;
    host.style.display = 'none';
    const state = this.sliderState.get(host);
    if (state) this.renderSlide(host, 0);
  }

  changeBall(scale: number, duration: number, element: any): void {
    element.nativeElement.style.transform = `scale(${scale})`;
    element.nativeElement.style.transition = `transform ${duration}s ease`;
  }

  clearAllTimeouts(): void {
    this.audioService.pauseSelectedSong();
    this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.timeouts = [];
  }

  get platformIsIOS(): boolean {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (window as any).cordova?.platformId === 'ios'
    );
  }

  get storeName(): 'Apple' | 'Google' {
    return this.platformIsIOS ? 'Apple' : 'Google';
  }
}
