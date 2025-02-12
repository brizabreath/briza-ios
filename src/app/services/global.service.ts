import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class GlobalService {
  private slideIndex = 1;
  public timeouts: any[] = []; // Array to store all timeout IDs
  private isModalOpenSubject = new BehaviorSubject<boolean>(false);
  isModalOpen$ = this.isModalOpenSubject.asObservable();

  
  constructor(private authService: AuthService) {}  
  async initializeApp() {
  }
  openModal2(): void {
    this.isModalOpenSubject.next(true); // Show modal
  }
  
  closeModal2(): void {
    this.isModalOpenSubject.next(false); // Hide modal
  }
  
  // Method to hide all elements with a specific class
  hideElementsByClass(className: string): void {
      const elements = document.getElementsByClassName(className) as HTMLCollectionOf<HTMLElement>;
      for (let i = 0; i < elements.length; i++) {
      elements[i].style.display = 'none';
      }
  }

  // Method to show all elements with a specific class
  showElementsByClass(className: string): void {
      const elements = document.getElementsByClassName(className) as HTMLCollectionOf<HTMLElement>;
      for (let i = 0; i < elements.length; i++) {
      elements[i].style.display = 'block';
      }
  }

  // Method to open modalBB
  openModal(element: any): void {
      if (element) {
      element.nativeElement.style.display = 'block';
      this.showSlides(this.slideIndex += 0, "slides", element);
      } else {
      console.error('Modal element not found.');
      }
  }

  // Method to close modalBB
  closeModal(element: any): void {
      element.nativeElement.style.display = 'none';
      this.slideIndex = 1;
  }
    showSlides(n: number, className: string, element: any): void {
        if (!element) {
            console.warn('Slide container not found.');
            return;
        }

        const slides = Array.from(
            element.nativeElement.getElementsByClassName(className) as HTMLCollectionOf<HTMLElement>
        );

        if (slides.length === 0) {
            console.warn('No slides found within the slide container.');
            return;
        }

        // Prevent invalid index
        if (n > slides.length) {
            this.slideIndex = slides.length;
        } else if (n < 1) {
            this.slideIndex = 1;
        } else {
            this.slideIndex = n;
        }

        // Hide all slides first
        slides.forEach((slide) => {
            slide.style.display = 'none';
        });

        // Show the current slide
        slides[this.slideIndex - 1].style.display = 'block';

        // Hide or show arrows
        const nextArrow = element.nativeElement.querySelector(".next");
        const prevArrow = element.nativeElement.querySelector(".prev");

        if (nextArrow) {
            nextArrow.style.display = this.slideIndex === slides.length ? "none" : "block";
        }
        if (prevArrow) {
            prevArrow.style.display = this.slideIndex === 1 ? "none" : "block";
        }
    }


    // Method to navigate slides
    plusSlides(n: number, className: string, element: any): void {
        if (!element) {
            console.warn('Slide container not found.');
            return;
        }

        const slides = Array.from(
            element.nativeElement.getElementsByClassName(className) as HTMLCollectionOf<HTMLElement>
        );

        if (slides.length === 0) {
            console.warn('No slides found within the slide container.');
            return;
        }

        // Check slideIndex boundaries before updating
        if ((this.slideIndex === slides.length && n > 0) || (this.slideIndex === 1 && n < 0)) {
            return; // Stop navigation if already at the last or first slide
        }

        this.showSlides(this.slideIndex += n, className, element);
    }

  // Method to change ball scale and duration
  changeBall(scale: number, duration: number, element: any): void {
      element.nativeElement.style.transform = `scale(${scale})`;
      element.nativeElement.style.transition = `transform ${duration}s ease`;
  }
  clearAllTimeouts(): void {
      this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId)); // Clear each timeout
      this.timeouts.length = 0; // Optionally reset the array
  }
}
