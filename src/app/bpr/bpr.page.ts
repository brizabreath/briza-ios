import { Component, OnInit, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

@Component({
  selector: 'app-bpr',
  templateUrl: './bpr.page.html',
  styleUrls: ['./bpr.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BPRPage implements OnInit {
  exerciseLinks = [
    { nameEN: 'Briza Retention Test', namePT: 'Teste de Retenção Briza', keys: ['brtResults'], url: '/brtresults' },
    { nameEN: 'High Altitude Training', namePT: 'Treinamento de Alta Altitude', keys: ['HATResults', 'HATCResults', 'AHATResults'], url: '/hatresults' },
    { nameEN: 'Guided Hyperventilation', namePT: 'Hiperventilação Guiada', keys: ['WHResults'], url: '/whresults' },
    { nameEN: 'Kapalabhati', namePT: 'Kapalabhati', keys: ['KBResults'], url: '/kbresults' },
    { nameEN: 'Others', namePT: 'Outros', keys: ['BBResults', 'YBResults', 'BREResults', 'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults', 'CBResults', 'RBResults', 'NBResults'], url: '/allresults' }
  ];

  @ViewChild('resultsList', { static: true }) resultsList!: ElementRef<HTMLDivElement>;
  @ViewChild('noResultsMessage', { static: true }) noResultsMessage!: ElementRef<HTMLDivElement>;
  @ViewChild('resultMSGpt') resultMSGpt!: ElementRef<HTMLDivElement>;
  @ViewChild('resultMSG') resultMSG!: ElementRef<HTMLDivElement>;
  @ViewChild('resultCalendar') resultCalendar!: ElementRef<HTMLDivElement>;

  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  daysInMonth: number[] = [];
  blankDays: number[] = [];
  currentMonthName = '';
  resultsByDate: { [date: string]: any[] } = {};
  weekdays: string[] = [];
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  isModalOpen2 = false;
  selectedDateHeader = '';
  selectedDateResults: any[] = [];


  constructor(
    private navCtrl: NavController,
    private globalService: GlobalService,
    private renderer: Renderer2,
  ) {}

  ngOnInit(): void {}
  ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }

    this.populateResults();
    this.loadResults();
    this.generateDaysInMonth();
    this.setLocale();
  }

  
  openResultsModal(day: number): void {
    const date = new Date(this.currentYear, this.currentMonth, day);
    const dayString = date.getDate().toString().padStart(2, '0');
    const monthString = (date.getMonth() + 1).toString().padStart(2, '0');
    const yearString = date.getFullYear().toString();
    
    this.selectedDateHeader = `${dayString}/${monthString}/${yearString}`;
    this.selectedDateResults = this.resultsByDate[`${this.currentYear}-${monthString}-${dayString}`] || [];
    this.isModalOpen2 = true;
  }
  
  confirmDelete(resultToDelete: any): void {
    if (confirm("Are you sure you want to delete this result?")) {
        const exerciseKey = resultToDelete.exerciseKey;
        const results = JSON.parse(localStorage.getItem(exerciseKey) || '[]');

        // Check if the result is stored as a single value or an array
        const updatedResults = results.filter((storedResult: any) => {
            if (storedResult.date !== resultToDelete.date) {
                return true; // Keep results with different dates
            }
            
            // Handle both cases: `result` as a string or as an array
            if (Array.isArray(storedResult.result) && Array.isArray(resultToDelete.result)) {
                // Match arrays by their stringified values
                return JSON.stringify(storedResult.result) !== JSON.stringify(resultToDelete.result);
            } else {
                // Otherwise, match them as strings
                return storedResult.result !== resultToDelete.result;
            }
        });
        
        // Save updated results back to local storage
        localStorage.setItem(exerciseKey, JSON.stringify(updatedResults));

        // Update the selectedDateResults array directly to remove deleted item from the modal view
        this.selectedDateResults = this.selectedDateResults.filter(item => item !== resultToDelete);

        // Reload the calendar dots if necessary
        this.loadResults();
    }
}

  getExerciseName(key: string): string {
    const exerciseNames: { [key: string]: { en: string; pt: string } } = {
        brtResults: { en: 'Briza Retention Test', pt: 'Teste de Retenção Briza' },
        HATResults: { en: 'High Altitude Training', pt: 'Treinamento de Alta Altitude' },
        HATCResults: { en: 'High Altitude Training Running', pt: 'Treinamento de Alta Altitude Correndo' },
        AHATResults: { en: 'Advanced High Altitude Training', pt: 'Treinamento Avançado de Alta Altitude' },
        WHResults: { en: 'Guided Hyperventilation', pt: 'Hiperventilação Guiada' },
        KBResults: { en: 'Kapalabhati', pt: 'Kapalabhati' },
        BBResults: { en: 'Briza Breathing', pt: 'Respiração Briza' },
        YBResults: { en: 'Yogic Breathing', pt: 'Respiração Yogi' },
        BREResults: { en: 'Breath Recovery Exercise', pt: 'Recuperando o Fôlego' },
        BRWResults: { en: 'Walking Recovery Exercise', pt: 'Recuperando o Fôlego Andando' },
        CTResults: { en: 'CO2 Tolerance Training', pt: 'Treinamento de Tolerância ao CO2' },
        APResults: { en: 'Apnea Training', pt: 'Treinamento de Apneia' },
        UBResults: { en: 'Ujjayi Breathing', pt: 'Respiração Ujjayi' },
        BOXResults: { en: 'Box Breathing', pt: 'Respiração em Caixa' },
        CBResults: { en: 'Coherent Breathing', pt: 'Respiração Coerente' },
        RBResults: { en: 'Relaxation Breathing', pt: 'Respiração Relaxante' },
        NBResults: { en: 'Nadi Shodhana', pt: 'Nadi Shodhana' },
      };
    const language = this.isPortuguese ? 'pt' : 'en';
    return exerciseNames[key]?.[language] || 'Exercise Name Not Found';
  }



  setLocale(): void {
    if (this.isPortuguese) {
      this.weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    } else {
      this.weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }
    this.currentMonthName = this.getMonthName(this.currentMonth);
  }

  loadResults(): void {
    const exerciseKeys = [
        'brtResults', 'HATResults', 'HATCResults', 'AHATResults', 
        'WHResults', 'KBResults', 'BBResults', 'YBResults', 'BREResults', 
        'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults', 
        'CBResults', 'RBResults', 'NBResults'
    ];

    this.resultsByDate = {};

    exerciseKeys.forEach((key) => {
        const results = JSON.parse(localStorage.getItem(key) || '[]');
        results.forEach((result: { date: string; result: string; rounds?: number }) => {
            const resultDateUTC = new Date(result.date);
            
            // Convert UTC date to a local date string in yyyy-mm-dd format
            const localDateString = resultDateUTC.toLocaleDateString('en-CA', {
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            
            if (!this.resultsByDate[localDateString]) {
                this.resultsByDate[localDateString] = [];
            }
            this.resultsByDate[localDateString].push({ ...result, exerciseKey: key });
        });
    });
  }



  generateDaysInMonth(): void {
    const daysInCurrentMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1).getDay();

    this.daysInMonth = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);
    this.blankDays = Array.from({ length: firstDayOfMonth });
    this.currentMonthName = this.getMonthName(this.currentMonth);
  }

  changeMonth(offset: number): void {
    this.currentMonth += offset;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.generateDaysInMonth();
  }

  isToday(day: number): boolean {
    const today = new Date();
    return (
      today.getFullYear() === this.currentYear &&
      today.getMonth() === this.currentMonth &&
      today.getDate() === day
    );
  }

  hasResultsOnDay(day: number): boolean {
    const localDate = new Date(this.currentYear, this.currentMonth, day);
    const dayString = localDate.toLocaleDateString('en-CA', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return this.resultsByDate[dayString]?.length > 0;
  }

  
  closeModal(): void {
    this.populateResults();
    this.isModalOpen2 = false;
  }

  getMonthName(monthIndex: number): string {
    const monthNamesEN = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthNamesPT = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return this.isPortuguese ? monthNamesPT[monthIndex] : monthNamesEN[monthIndex];
  }

  populateResults(): void {
    this.resultsList.nativeElement.innerHTML = "";
    let resultsFound = false;

    this.exerciseLinks.forEach(exercise => {
      // Check if any key in the keys array has results in local storage
      const hasResults = exercise.keys.some(key => {
        const results = localStorage.getItem(key);
        return results && JSON.parse(results).length > 0; // Check for non-empty result array
      });

      if (hasResults) {
        const link = this.renderer.createElement('a');
        this.renderer.addClass(link, 'results-link');
        const displayName = this.isPortuguese ? exercise.namePT : exercise.nameEN;
        this.renderer.setProperty(link, 'textContent', displayName);
        this.renderer.listen(link, 'click', () => {
          this.navCtrl.navigateForward(exercise.url);
        });
        this.renderer.appendChild(this.resultsList.nativeElement, link);
        resultsFound = true;
      }
    });

    this.noResultsMessage.nativeElement.style.display = resultsFound ? 'none' : 'block';
    this.resultCalendar.nativeElement.style.display = resultsFound ? 'block' : 'none';
    if(this.isPortuguese){
      this.resultMSGpt.nativeElement.style.display = resultsFound ? 'block' : 'none';
    }else{
      this.resultMSG.nativeElement.style.display = resultsFound ? 'block' : 'none';
    }
  }

  // Method to navigate back
  goBack(): void {
    this.navCtrl.back();
  }
}
