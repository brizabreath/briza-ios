import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AudioService } from './audio.service';

@Injectable({
  providedIn: 'root',
})
export class GlobalService {
  private slideIndex = 1;
  public timeouts: any[] = []; // Array to store all timeout IDs
  private isModalOpenSubject = new BehaviorSubject<boolean>(false);
  isModalOpen$ = this.isModalOpenSubject.asObservable();

  
  constructor(private audioService: AudioService) {}  
  private get isPT() { return localStorage.getItem('isPortuguese') === 'true'; }
  private get L() {
    return this.isPT
      ? { next: 'Próximo', start: 'Começar' }
      : { next: 'Next',    start: 'Get started' };
  }
  openModal2(): void {
    this.isModalOpenSubject.next(true); // Show modal
     // Ensure the modal is loaded before checking content
     setTimeout(() => this.checkIfModalIsEmpty(), 500); // Adding a slight delay to ensure modal has loaded
  }
  checkIfModalIsEmpty() {
    const modalContent = document.querySelector('.modalPrices');
    const membershipStatus = localStorage.getItem('membershipStatus') || 'inactive';
    const isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    if (membershipStatus === 'failed') {
      return; // modal will show "Manage Payment" button
    }
    if (!modalContent) {
      console.warn('⚠️ Subscription offerings did not load.');
      const message = isPortuguese
        ? 'Não foi possível carregar planos de assinatura. Feche o app e tente novamente.'
        : 'Unable to load subscription plans. close app and try again';

      alert(message);
      // Don’t close modal immediately — let user retry inside ModalComponent
    } else {
      console.log('✅ Subscription options detected in the modal.');
    }
  }
  
  closeModal2(): void {
    this.isModalOpenSubject.next(false); // Hide modal
  }
  
  // Method to hide all <option> elements with a specific class
  hideElementsByClass(className: string): void {
      const elements = document.getElementsByClassName(className);

      for (let i = elements.length - 1; i >= 0; i--) { // Iterate in reverse to avoid index shifting issues
          const element = elements[i] as HTMLOptionElement;

          if (element.tagName.toLowerCase() === 'option') {
              element.remove(); // Completely remove the option from the DOM
          } else {
              element.style.display = 'none';
          }
      }
  }

  // Method to show all <option> elements with a specific class
  showElementsByClass(className: 'english' | 'portuguese'): void { // Explicitly define the allowed types for `className`

      const elements = document.getElementsByClassName(className) as HTMLCollectionOf<HTMLElement>;

      for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          element.style.display = 'block';
      }
  }

  // Track per-modal state without leaking memory
  private sliderState = new WeakMap<HTMLElement, {
  slides: HTMLElement[];
  dotsHost: HTMLElement;
  index: number;
  }>();

  private controlsState = new WeakMap<HTMLElement, {
      footer: HTMLElement;
      button: HTMLButtonElement;
  }>();

    /** Initialize a bullet slider for a given modal/container */
  initBulletSlider(
    containerRef: { nativeElement: HTMLElement },
    dotsRef: { nativeElement: HTMLElement },
    className: string
    ): void {
    const host = containerRef?.nativeElement;
    const dotsHost = dotsRef?.nativeElement;
    if (!host || !dotsHost) return;

    const slides = Array.from(host.getElementsByClassName(className)) as HTMLElement[];
    if (!slides.length) return;

    // Build/refresh dots
    dotsHost.innerHTML = '';
    slides.forEach((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-label', `Go to slide ${i + 1}`);
        b.addEventListener('click', () => this.goToSlide(host, i));
        dotsHost.appendChild(b);
    });

    // Save state and show first slide
    this.sliderState.set(host, { slides, dotsHost, index: 0 });
    this.renderSlide(host, 0);

    // Optional: swipe to navigate
    this.attachSwipe(host);
  }
  private ensureControls(host: HTMLElement) {
    if (this.controlsState.get(host)) return;

    const footer = document.createElement('div');
    footer.className = 'modal-controls'; // style this in your global css

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'modal-primary';     // style this in your global css

    btn.addEventListener('click', () => {
      const s = this.sliderState.get(host);
      if (!s) return;
      const last = s.index >= s.slides.length - 1;
      if (!last) {
        this.goToSlide(host, s.index + 1);      // Next
      } else {
        // Get started = close modal
        this.closeModal({ nativeElement: host }); // reuse your function
      }
    });

    footer.appendChild(btn);

    // Append footer at end of modal content
    host.appendChild(footer);

    this.controlsState.set(host, { footer, button: btn });
  }

  /** Programmatically go to an index */
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

    const nextIdx = (typeof idx === 'number') ? idx : state.index;
    state.slides.forEach((el, i) => el.classList.toggle('active', i === nextIdx));

    const dots = Array.from(state.dotsHost.children) as HTMLElement[];
    dots.forEach((d, i) => d.classList.toggle('active', i === nextIdx));

    state.index = nextIdx;

    // Update button label based on slide position and language  // NEW
    const ctrl = this.controlsState.get(containerEl);
    if (ctrl) {
      const last = nextIdx >= state.slides.length - 1;
      ctrl.button.textContent = last ? this.L.start : this.L.next;
      ctrl.button.setAttribute('aria-label', ctrl.button.textContent || '');
    }
  }

    /** Optional swipe (left/right) */
  private attachSwipe(host: HTMLElement): void {
    let startX = 0, curX = 0, down = false;
    const onStart = (x: number) => { down = true; startX = curX = x; };
    const onMove  = (x: number) => { if (down) curX = x; };
    const onEnd   = () => {
        if (!down) return;
        const dx = curX - startX;
        down = false;
        const state = this.sliderState.get(host);
        if (!state) return;
        const THRESH = 40;
        if (dx > THRESH) this.goToSlide(host, state.index - 1);
        if (dx < -THRESH) this.goToSlide(host, state.index + 1);
    };

    host.addEventListener('pointerdown', e => onStart((e as PointerEvent).clientX));
    host.addEventListener('pointermove',  e => onMove((e as PointerEvent).clientX));
    host.addEventListener('pointerup',    onEnd);
    host.addEventListener('pointercancel',onEnd);
    host.addEventListener('pointerleave', onEnd);
  }

   /** Open modal and make sure button label matches current language */ // UPDATED
  openModal(element: any, dotsRef?: any, className: string = 'slides'): void {
    if (!element) return;
    const host = element.nativeElement;
    host.style.display = 'block';

    if (!this.sliderState.get(host) && dotsRef?.nativeElement) {
      this.initBulletSlider(element, dotsRef, className);
    } else {
      // Make sure controls exist & refresh label for current slide/language
      this.ensureControls(host);                 // NEW
      const state = this.sliderState.get(host);
      if (state) this.renderSlide(host, state.index);
    }
  }
  /** Close modal and reset index to 0 (optional) */
  closeModal(element: any): void {
    if (!element) return;
    const host = element.nativeElement;
    host.style.display = 'none';
    const state = this.sliderState.get(host);
    if (state) this.renderSlide(host, 0);
  }
  // Method to change ball scale and duration
  changeBall(scale: number, duration: number, element: any): void {
      element.nativeElement.style.transform = `scale(${scale})`;
      element.nativeElement.style.transition = `transform ${duration}s ease`;
  }
  clearAllTimeouts(): void {
    this.audioService.pauseSelectedSong();
    this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId)); // Clear each timeout
    this.timeouts.length = 0; // Optionally reset the array
    this.timeouts = [];
  }
  showMembershipMessage(status: 'offline' | 'no_store' | 'failed' | 'inactive'): void {
    let message = '';

    switch (status) {
      case 'offline':
        message = this.isPT
          ? 'Você está offline. Conecte-se à internet para assinar e acessar este conteúdo.'
          : 'You are offline. Connect to the internet to purchase a subscription and access this content.';
        break;

      case 'no_store':
        message = this.isPT
          ? 'Faça login na sua conta Apple/Google para continuar.'
          : 'Please log in to your Apple/Google account to continue.';
        break;

      case 'failed':
        message = this.isPT
          ? 'Você não possui uma assinatura ativa. Escolha um plano para desbloquear o conteúdo.'
          : 'You don’t have an active subscription. Choose a plan to unlock content.';
        break;

      case 'inactive':
        message = this.isPT
          ? 'Você não possui uma assinatura ativa. Escolha um plano para desbloquear o conteúdo.'
          : 'You don’t have an active subscription. Choose a plan to unlock content.';
        break;
    }

    alert(message);
  }
}
