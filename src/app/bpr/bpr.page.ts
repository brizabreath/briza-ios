// bpr.page.ts
import { Component, OnInit, ViewChild, ElementRef, Renderer2, AfterViewInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { GlobalAlertService } from '../services/global-alert.service';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-bpr',
  templateUrl: './bpr.page.html',
  styleUrls: ['./bpr.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class BPRPage implements OnInit, AfterViewInit {
  exerciseLinks = [
    { nameEN: 'Briza Retention Test', namePT: 'Teste de Retenção Briza', keys: ['brtResults'], url: '/brtresults' },
    { nameEN: 'Altitude Training', namePT: 'Treinamento de Altitude', keys: ['HATResults', 'HATCResults', 'AHATResults'], url: '/hatresults' },
    { nameEN: 'Oxygen Boost', namePT: 'Boost de oxigênio', keys: ['WHResults'], url: '/whresults' },
    { nameEN: 'Kapalabhati', namePT: 'Kapalabhati', keys: ['KBResults'], url: '/kbresults' },
    { nameEN: 'Yoga Classes', namePT: 'Aulas de Yoga', keys: ['YogaResults'], url: '/yogaresults' },
    { nameEN: 'Mindfulness', namePT: 'Mindfulness', keys: ['TIMERResults'], url: '/timerresults' },
    { nameEN: 'All Exercises', namePT: 'Todos Exercícios', keys: ['BBResults', 'YBResults', 'BREResults', 'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults', 'CBResults', 'RBResults', 'NBResults', 'CUSTResults','HATResults', 'HATCResults', 'AHATResults', 'KBResults','WHResults', 'LungsResults', 'DBResults', 'HUMResults', 'TIMERResults'], url: '/allresults' }
  ];

  @ViewChild('resultsList', { static: false }) resultsList?: ElementRef<HTMLDivElement>;
  @ViewChild('allChartCanvas', { static: false }) allChartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartDateKeys: string[] = []; // "YYYY-MM-DD" per bar index
  allChart: any;

  aggregatedDataArray: { date: Date; totalMinutes: number; sessionCount: number }[] = [];
  startDate!: Date;
  endDate!: Date;
  fixedLatestDate!: Date;

  chartData: number[] = [];
  selectedDataDates: string[] = [];

  maxYValue: number = 1;
  maxTotalMinutesDate: string = '';
  maxTotalMinutes: string = '';
  totalSessions: number = 0;
  totalPracticeSeconds: number = 0;
  totalPracticeFormatted: string = '';
  // ✅ Longest streak ever (excluding BRT)
  longestStreakEver: number = 0;

  hasData: boolean = false;
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';

  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  daysInMonth: number[] = [];
  blankDays: number[] = [];
  currentMonthName = '';

  resultsByDate: { [date: string]: any[] } = {};
  weekdays: string[] = [];

  isModalOpen2 = false;
  selectedDateHeader = '';
  selectedDateResults: any[] = [];

  selectedSegment: 'calendar' | 'chart' = 'calendar';
  resultsTrue = false;

  constructor(
    private navCtrl: NavController,
    private globalService: GlobalService,
    private renderer: Renderer2,
    private globalAlert: GlobalAlertService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Chart needs the canvas to exist
    this.loadDataFromLocalStorage();
    if (this.hasData) {
      this.setDateRange();
      this.initializeChart();
      this.setupScrolling();
      this.calculateOverviewData();
    }
    this.longestStreakEver = this.computeLongestStreakFromAggregated();
  }

  ionViewWillEnter() {
    this.isPortuguese = localStorage.getItem('isPortuguese') === 'true';

    this.loadResults();
    this.generateDaysInMonth();
    this.setLocale();

    // If chart is already created, refresh its data when entering
    this.loadDataFromLocalStorage();
    if (this.hasData) {
      this.setDateRange();
      this.calculateOverviewData();
      if (this.allChart) {
        this.updateChart(this.startDate, this.endDate);
      }
    }
    this.populateResults();
    this.longestStreakEver = this.computeLongestStreakFromAggregated();
  }

  private chartScrollBound = false;

  selectSegment(segment: 'calendar' | 'chart') {
    this.selectedSegment = segment;

    if (segment !== 'chart') return;

    // wait for Angular to render the canvas (because of *ngIf)
    setTimeout(() => {
      this.loadDataFromLocalStorage();
      if (!this.hasData) return;

      this.setDateRange();
      this.calculateOverviewData();

      // IMPORTANT: canvas was destroyed/recreated → chart must be destroyed and rebuilt
      if (this.allChart) {
        try { this.allChart.destroy(); } catch {}
        this.allChart = null;
      }

      this.initializeChart();
      this.populateResults();

      if (!this.chartScrollBound) {
        this.setupScrolling();
        this.chartScrollBound = true;
      }
    }, 0);
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

  async confirmDelete(resultToDelete: any): Promise<void> {
    const confirmed = await this.globalAlert.showConfirm(
      this.isPortuguese ? 'Deletar resultado' : 'Delete result',
      this.isPortuguese ? 'Tem certeza que deseja deletar este resultado?' : 'Are you sure you want to delete this result?',
      this.isPortuguese ? 'Sim' : 'Yes',
      this.isPortuguese ? 'Não' : 'No'
    );

    if (confirmed) {
      const exerciseKey = resultToDelete.exerciseKey;
      const results = JSON.parse(localStorage.getItem(exerciseKey) || '[]');

      const updatedResults = results.filter((storedResult: any) => {
        if (storedResult.date !== resultToDelete.date) return true;

        if (Array.isArray(storedResult.result) && Array.isArray(resultToDelete.result)) {
          return JSON.stringify(storedResult.result) !== JSON.stringify(resultToDelete.result);
        } else {
          return storedResult.result !== resultToDelete.result;
        }
      });

      localStorage.setItem(exerciseKey, JSON.stringify(updatedResults));
      this.syncWatchedYogaIdsFromResults();
      this.selectedDateResults = this.selectedDateResults.filter(item => item !== resultToDelete);

      // Reload dots + overview
      this.loadResults();
      this.longestStreakEver = this.computeLongestStreakFromAggregated();
      this.loadDataFromLocalStorage();
      this.calculateOverviewData();
    }
  }

  getExerciseName(key: string): string {
    const exerciseNames: { [key: string]: { en: string; pt: string } } = {
      brtResults: { en: 'Briza Retention Test', pt: 'Teste de Retenção Briza' },
      HATResults: { en: 'Altitude Training', pt: 'Treinamento de Altitude' },
      HATCResults: { en: 'Altitude Training PRO', pt: 'Treinamento de Altitude PRO' },
      WHResults: { en: 'Oxygen Boost', pt: 'Boost de oxigênio' },
      KBResults: { en: 'Kapalabhati', pt: 'Kapalabhati' },
      BBResults: { en: 'Briza Breathing', pt: 'Respiração Briza' },
      YBResults: { en: 'Yogic Breathing', pt: 'Respiração Yogi' },
      DBResults: { en: 'Reset Breathing', pt: 'Respiração Reset' },
      HUMResults: { en: 'Humming Breathing', pt: 'Respiração Zumbido' },
      BREResults: { en: 'Breath Recovery Exercise', pt: 'Recuperando o Fôlego' },
      BRWResults: { en: 'Walking Recovery Exercise', pt: 'Recuperando o Fôlego Andando' },
      CTResults: { en: 'CO2 Tolerance Training', pt: 'Treinamento de Tolerância ao CO2' },
      APResults: { en: 'Apnea Training', pt: 'Treinamento de Apneia' },
      UBResults: { en: 'Ujjayi Breathing', pt: 'Respiração Ujjayi' },
      BOXResults: { en: 'Box Breathing', pt: 'Respiração em Caixa' },
      CUSTResults: { en: 'Custom Breathwork', pt: 'Respiração Personalizada' },
      CBResults: { en: 'Coherent Breathing', pt: 'Respiração Coerente' },
      RBResults: { en: 'Relaxation Breathing', pt: 'Respiração Relaxante' },
      NBResults: { en: 'Nadi Shodhana', pt: 'Nadi Shodhana' },
      LungsResults: { en: 'Lungs Expansion', pt: 'Expansão Pulmonar' },
      YogaResults: { en: 'Yoga Classes', pt: 'Aulas de Yoga' },
      TIMERResults: { en: 'Mindfulness', pt: 'Mindfulness' },
    };
    const language = this.isPortuguese ? 'pt' : 'en';
    return exerciseNames[key]?.[language] || 'Exercise Name Not Found';
  }

  setLocale(): void {
    this.weekdays = this.isPortuguese
      ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    this.currentMonthName = this.getMonthName(this.currentMonth);
  }

  loadResults(): void {
    const exerciseKeys = [
      'brtResults', 'HATResults', 'HATCResults', 'AHATResults',
      'WHResults', 'KBResults', 'BBResults', 'YBResults', 'BREResults',
      'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults',
      'CBResults', 'RBResults', 'NBResults', 'CUSTResults', 'LungsResults',
      'YogaResults', 'DBResults', 'HUMResults', 'TIMERResults'
    ];

    this.resultsByDate = {};

    exerciseKeys.forEach((key) => {
      const results = JSON.parse(localStorage.getItem(key) || '[]');
      results.forEach((result: { date: string; result: string; rounds?: number }) => {
        const resultDateUTC = new Date(result.date);

        const localDateString = resultDateUTC.toLocaleDateString('en-CA', {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });

        if (!this.resultsByDate[localDateString]) this.resultsByDate[localDateString] = [];
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
    return today.getFullYear() === this.currentYear && today.getMonth() === this.currentMonth && today.getDate() === day;
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
    // ✅ close FIRST, always
    this.isModalOpen2 = false;

    // Defer DOM work to next tick so the modal is already closing
    setTimeout(() => {
      try {
        this.populateResults();
        this.loadResults();
        this.longestStreakEver = this.computeLongestStreakFromAggregated();
      } catch (e) {
        console.warn('closeModal post-work skipped due to error:', e);
      }
    }, 0);
  }

  getMonthName(monthIndex: number): string {
    const monthNamesEN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthNamesPT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return this.isPortuguese ? monthNamesPT[monthIndex] : monthNamesEN[monthIndex];
  }
  showcontent(resultsfound: boolean):void{
   if(resultsfound){
      this.resultsTrue = true;
    }else{
      this.resultsTrue = false;
    }
  }

  populateResults(): void {
    const resultsListEl = this.resultsList?.nativeElement;
    if (!resultsListEl) {
      const resultsFound = this.exerciseLinks.some(ex =>
        ex.keys.some(k => {
          const v = localStorage.getItem(k);
          return v && JSON.parse(v).length > 0;
        })
      );
      this.showcontent(resultsFound);
      return;
    }

    resultsListEl.innerHTML = '';

    let resultsFound = false;

    this.exerciseLinks.forEach(exercise => {
      const hasResults = exercise.keys.some(key => {
        const results = localStorage.getItem(key);
        return results && JSON.parse(results).length > 0;
      });

      const link = this.renderer.createElement('a');
      if (exercise.url === '/allresults'){this.renderer.addClass(link, 'noDisplay');}
      else{this.renderer.addClass(link, 'results-link');}
      this.renderer.setProperty(link, 'textContent', this.isPortuguese ? exercise.namePT : exercise.nameEN);

      if (hasResults) {
      this.renderer.listen(link, 'click', () => {
        void this.navCtrl.navigateForward(exercise.url);
      });
        resultsFound = true;
      } else {
        this.renderer.addClass(link, 'disabled');
        this.renderer.setAttribute(link, 'aria-disabled', 'true');
        this.renderer.setStyle(link, 'pointerEvents', 'none');
        this.renderer.setStyle(link, 'opacity', '0.4');
      }
      this.renderer.appendChild(resultsListEl, link);
    });

    this.showcontent(resultsFound);
  }


  isMultiRoundExercise(exerciseKey: string): boolean {
    const multiRoundExercises = ['HATResults', 'HATCResults', 'AHATResults', 'WHResults', 'KBResults'];
    return multiRoundExercises.includes(exerciseKey);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')} min : ${String(remainingSeconds).padStart(2, '0')} sec`;
  }

  // ✅ Aggregation excludes BRT already (matches your requirement)
  loadDataFromLocalStorage(): void {
    const exerciseKeys = [
      'brtResults','BBResults', 'YBResults', 'BREResults', 'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults',
      'CBResults', 'RBResults', 'NBResults', 'CUSTResults', 'AHATResults', 'HATResults', 'HATCResults', 'KBResults',
      'WHResults', 'LungsResults', 'DBResults', 'HUMResults', 'YogaResults', 'TIMERResults'
    ];

    const aggregatedData: { [key: string]: { totalSeconds: number; sessionCount: number } } = {};

    exerciseKeys.forEach(key => {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      data.forEach((item: any) => {
        const date = new Date(item.date).toLocaleDateString('en-GB');
        const resultInSeconds = this.convertToSeconds(item.result);

        if (!aggregatedData[date]) aggregatedData[date] = { totalSeconds: resultInSeconds, sessionCount: 1 };
        else {
          aggregatedData[date].totalSeconds += resultInSeconds;
          aggregatedData[date].sessionCount += 1;
        }
      });
    });

    this.aggregatedDataArray = Object.keys(aggregatedData).map(date => ({
      date: new Date(date.split('/').reverse().join('-')),
      totalMinutes: parseFloat((aggregatedData[date].totalSeconds / 60).toFixed(2)),
      sessionCount: aggregatedData[date].sessionCount
    }));

    this.aggregatedDataArray.sort((a, b) => a.date.getTime() - b.date.getTime());

    this.hasData = this.aggregatedDataArray.length > 0;
    this.fixedLatestDate = this.hasData
      ? new Date(this.aggregatedDataArray[this.aggregatedDataArray.length - 1].date)
      : new Date();
  }

  convertToSeconds(result: string): number {
    const [minutes, seconds] = result.split(' : ').map(Number);
    return minutes * 60 + seconds;
  }

  setDateRange(): void {
    const lastResultDate = this.hasData
      ? new Date(this.aggregatedDataArray[this.aggregatedDataArray.length - 1].date)
      : new Date();

    this.endDate = new Date(lastResultDate);
    this.startDate = new Date(this.endDate);
    this.startDate.setDate(this.endDate.getDate() - 6);
  }

  calculateOverviewData(): void {
    if (this.aggregatedDataArray.length === 0) {
      this.maxTotalMinutes = '';
      this.maxTotalMinutesDate = '';
      this.totalSessions = 0;
      this.totalPracticeSeconds = 0;
      this.totalPracticeFormatted = '';
      return;
    }

    let maxEntry = this.aggregatedDataArray[0];
    this.totalSessions = 0;
    this.totalPracticeSeconds = 0;

    this.aggregatedDataArray.forEach(entry => {
      this.totalSessions += entry.sessionCount;

      // entry.totalMinutes is a number with 2 decimals, convert back to seconds safely
      this.totalPracticeSeconds += Math.round(entry.totalMinutes * 60);

      if (
        entry.totalMinutes > maxEntry.totalMinutes ||
        (entry.totalMinutes === maxEntry.totalMinutes && entry.date > maxEntry.date)
      ) {
        maxEntry = entry;
      }
    });

    this.maxTotalMinutes = this.formatTime2(maxEntry.totalMinutes * 60);
    this.maxTotalMinutesDate = this.formatDate(maxEntry.date, true);

    this.totalPracticeFormatted = this.formatDurationHMS(this.totalPracticeSeconds);
  }
  formatDurationHMS(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    // tweak wording as you like
    return `${hh} hr : ${mm} min : ${ss} sec`;
  }
  initializeChart(): void {
    if (!this.allChartCanvas?.nativeElement) return;

    const ctx = this.allChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // ensure we start clean
    this.selectedDataDates = [];
    this.chartData = [];
    this.maxYValue = 1;

    this.allChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: this.isPortuguese ? 'Total do dia' : 'Day total',
          backgroundColor: '#49B79D',
          data: [],
          barPercentage: 0.6,
          categoryPercentage: 0.8,
        }]
      },
      options: {
       responsive: true,
        maintainAspectRatio: false,

        onClick: (_event: any, elements: any[]) => {
          if (!elements?.length) return;

          const index = elements[0].index; // bar index
          const key = this.chartDateKeys[index]; // YYYY-MM-DD

          if (!key) return;

          // open modal only if that day has results
          const dayResults = this.resultsByDate[key] || [];
          if (!dayResults.length) return;

          // set header dd/mm/yyyy (match your modal header style)
          const [yyyy, mm, dd] = key.split('-');
          this.selectedDateHeader = `${dd}/${mm}/${yyyy}`;
          this.selectedDateResults = dayResults;
          this.isModalOpen2 = true;
        },

        plugins: {
          legend: { display: true },
          title: {
            display: true,
            text: this.getChartTitle(),
            font: { size: 14 },
            color: '#0661AA'
          },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: () => this.isPortuguese ? 'Total do dia' : 'Day total',
              label: (tooltipItem: any) => {
                const totalSeconds = tooltipItem.raw * 60;
                return `${this.selectedDataDates[tooltipItem.dataIndex]}: ${this.formatTime2(totalSeconds)}`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: '#0661AA' }, grid: { display: false } },
          y: {
            beginAtZero: true,
            max: 1,
            ticks: {
              stepSize: 1,
              color: '#0661AA',
              callback: (value) => `${Math.floor(Number(value))} min`
            }
          }
        }
      }
    });

    this.updateChart(this.startDate, this.endDate);
  }


  updateChart(startDate: Date, endDate: Date): void {
    const { chartData, maxYValue, selectedDataDates, chartDateKeys } =
      this.updateChartData(startDate, endDate);

    this.selectedDataDates = selectedDataDates;
    this.chartData = chartData;
    this.chartDateKeys = chartDateKeys;

    this.maxYValue = maxYValue === 0 ? 1 : Math.ceil(maxYValue + 1);

    this.allChart.data.labels = this.selectedDataDates;
    this.allChart.data.datasets[0].data = this.chartData;
    this.allChart.options.scales.y.max = this.maxYValue;
    this.allChart.options.scales.y.ticks.stepSize = this.calculateStepSize();
    this.allChart.options.plugins.title.text = this.getChartTitle();
    this.allChart.update();
  }


  calculateStepSize(): number {
    if (this.maxYValue <= 1) return 1;
    return Math.ceil(this.maxYValue / 5);
  }

  getChartTitle(): string {
    return this.isPortuguese
      ? `Gráfico geral (${this.endDate.getFullYear()})`
      : `Overall chart (${this.endDate.getFullYear()})`;
  }

  updateChartData(startDate: Date, endDate: Date): {
    chartData: number[],
    maxYValue: number,
    selectedDataDates: string[],
    chartDateKeys: string[]
  } {
    const dateRange: Date[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const chartData = dateRange.map(date => {
      const formattedDate = this.formatDate(date, true); // dd/mm/yyyy
      const entry = this.aggregatedDataArray.find(data => this.formatDate(data.date, true) === formattedDate);
      return entry ? entry.totalMinutes : 0;
    });

    const maxYValue = Math.max(...chartData);

    // tooltip label dates (dd/mm)
    const selectedDataDates = dateRange.map(date => this.formatDate(date, false));

    // IMPORTANT: keys matching resultsByDate (en-CA = yyyy-mm-dd)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const chartDateKeys = dateRange.map(d => {
      const local = new Date(d.toLocaleString('en-US', { timeZone: tz }));
      return local.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }); // YYYY-MM-DD
    });

    return { chartData, maxYValue, selectedDataDates, chartDateKeys };
  }


  formatDate(date: Date, fullYear: boolean = false): string {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
    if (fullYear) options.year = 'numeric';
    return date.toLocaleDateString('en-GB', options);
  }

  formatTime2(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    const formattedMinutes = minutes < 10 ? '0' + minutes : String(minutes);
    const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : String(remainingSeconds);
    return `${formattedMinutes} min : ${formattedSeconds} sec`;
  }

  setupScrolling(): void {
    if (!this.allChartCanvas?.nativeElement) return;

    let lastScrollX = 0;
    this.allChartCanvas.nativeElement.addEventListener('touchstart', (event: TouchEvent) => {
      lastScrollX = event.touches[0].clientX;
    });

    this.allChartCanvas.nativeElement.addEventListener('touchmove', (event: TouchEvent) => {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - lastScrollX;
      this.handleScroll(-deltaX);
      lastScrollX = event.touches[0].clientX;
    });

    this.allChartCanvas.nativeElement.addEventListener('wheel', (event: WheelEvent) => {
      this.handleScroll(-event.deltaX);
    });
  }

  handleScroll(deltaX: number): void {
    if (!this.aggregatedDataArray.length) return;

    const scrollSpeedFactor = 5;
    const dayShift = deltaX / scrollSpeedFactor;

    if (dayShift < -0.5 && this.startDate > this.aggregatedDataArray[0]?.date) {
      this.endDate = new Date(this.endDate.setDate(this.endDate.getDate() - 1));
      this.startDate = new Date(this.startDate.setDate(this.startDate.getDate() - 1));
    } else if (dayShift > 0.5 && this.endDate < this.fixedLatestDate) {
      this.endDate = new Date(this.endDate.setDate(this.endDate.getDate() + 1));
      this.startDate = new Date(this.startDate.setDate(this.startDate.getDate() + 1));
    }

    if (this.allChart) this.updateChart(this.startDate, this.endDate);
  }
  onCloseModalClick(ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();
    this.closeModal();
  }

  // ✅ Longest streak ever based on aggregatedDataArray (already excludes BRT)
  private computeLongestStreakFromAggregated(): number {
    if (!this.aggregatedDataArray?.length) return 0;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Build unique day numbers (local midnight) for every day that has practice
    const dayNumsSet = new Set<number>();

    for (const entry of this.aggregatedDataArray) {
      // entry.date is already a Date (from your aggregation)
      const local = new Date(entry.date.toLocaleString('en-US', { timeZone: tz }));
      const localMidnight = new Date(local.getFullYear(), local.getMonth(), local.getDate());
      dayNumsSet.add(Math.floor(localMidnight.getTime() / 86400000));
    }

    const dayNums = Array.from(dayNumsSet).sort((a, b) => a - b);
    if (!dayNums.length) return 0;

    let best = 1;
    let cur = 1;

    for (let i = 1; i < dayNums.length; i++) {
      const diff = dayNums[i] - dayNums[i - 1];
      if (diff === 1) {
        cur++;
        if (cur > best) best = cur;
      } else if (diff > 1) {
        cur = 1;
      }
    }

    return best;
  }


  goBack(): void {
    this.navCtrl.back();
  }
  private syncWatchedYogaIdsFromResults(): void {
    const keysToScan = ['YogaResults', 'LungsResults']; // add 'TIMERResults' only if you want

    const watched = new Set<string>();

    for (const key of keysToScan) {
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(arr)) continue;

      for (const item of arr) {
        if (item && typeof item.videoId === 'string' && item.videoId.trim()) {
          watched.add(item.videoId.trim());
        }
      }
    }

    localStorage.setItem('watchedYogaIds', JSON.stringify(Array.from(watched)));
  }
}
