import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GlobalService } from '../services/global.service'; // Import the GlobalService
import { RouterModule } from '@angular/router'; // Import RouterModule

Chart.register(...registerables);

@Component({
  selector: 'app-allresults',
  templateUrl: './allresults.page.html',
  styleUrls: ['./allresults.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class ALLresultsPage implements AfterViewInit {
  constructor(private navCtrl: NavController, private globalService: GlobalService) {}

  @ViewChild('allChartCanvas') allChartCanvas!: ElementRef<HTMLCanvasElement>;
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
  hasData: boolean = false;
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';

  ngAfterViewInit(): void {
    this.loadDataFromLocalStorage();
    if (this.hasData) {
      this.setDateRange();
      this.initializeChart();
      this.setupScrolling();
      this.calculateOverviewData();
    }
  }

  ionViewWillEnter() {
    if (this.isPortuguese) {
      this.globalService.hideElementsByClass('english');
      this.globalService.showElementsByClass('portuguese');
    } else {
      this.globalService.hideElementsByClass('portuguese');
      this.globalService.showElementsByClass('english');
    }
  }

  loadDataFromLocalStorage(): void {
    const exerciseKeys = ['BBResults', 'YBResults', 'BREResults', 'BRWResults', 'CTResults', 'APResults', 'UBResults', 'BOXResults', 'CBResults', 'RBResults', 'NBResults', 'CUSTResults'];
    const aggregatedData: { [key: string]: { totalSeconds: number; sessionCount: number } } = {};

    exerciseKeys.forEach(key => {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      data.forEach((item: any) => {
        const date = new Date(item.date).toLocaleDateString('en-GB'); // Parse as "dd/mm/yyyy"
        const resultInSeconds = this.convertToSeconds(item.result);

        if (!aggregatedData[date]) {
          aggregatedData[date] = { totalSeconds: resultInSeconds, sessionCount: 1 };
        } else {
          aggregatedData[date].totalSeconds += resultInSeconds;
          aggregatedData[date].sessionCount += 1;
        }
      });
    });

    this.aggregatedDataArray = Object.keys(aggregatedData).map(date => ({
      date: new Date(date.split('/').reverse().join('-')), // Parse as "yyyy-mm-dd" for proper Date object
      totalMinutes: parseFloat((aggregatedData[date].totalSeconds / 60).toFixed(2)),
      sessionCount: aggregatedData[date].sessionCount
    }));

    this.hasData = this.aggregatedDataArray.length > 0;
    this.fixedLatestDate = this.hasData ? new Date(this.aggregatedDataArray[this.aggregatedDataArray.length - 1].date) : new Date();
  }

  convertToSeconds(result: string): number {
    const [minutes, seconds] = result.split(' : ').map(Number);
    return minutes * 60 + seconds;
  }

  setDateRange(): void {
    const lastResultDate = this.hasData ? new Date(this.aggregatedDataArray[this.aggregatedDataArray.length - 1].date) : new Date();
    this.endDate = new Date(lastResultDate);
    this.startDate = new Date(this.endDate);
    this.startDate.setDate(this.endDate.getDate() - 6);
  }

  calculateOverviewData(): void {
    if (this.aggregatedDataArray.length === 0) {
      this.maxTotalMinutes = '';
      this.maxTotalMinutesDate = '';
      this.totalSessions = 0;
      return;
    }

    let maxEntry = this.aggregatedDataArray[0];
    this.totalSessions = 0;

    this.aggregatedDataArray.forEach(entry => {
      this.totalSessions += entry.sessionCount;
      if (
        entry.totalMinutes > maxEntry.totalMinutes ||
        (entry.totalMinutes === maxEntry.totalMinutes && entry.date > maxEntry.date)
      ) {
        maxEntry = entry;
      }
    });

    this.maxTotalMinutes = this.formatTime(maxEntry.totalMinutes * 60);
    this.maxTotalMinutesDate = this.formatDate(maxEntry.date, true);
  }

  initializeChart(): void {
    const context = this.allChartCanvas.nativeElement.getContext('2d');
    if (context) {
      this.allChart = new Chart(context, {
        type: 'bar',
        data: {
          labels: this.selectedDataDates,
          datasets: [
            {
              label: this.isPortuguese ? 'Total do Dia' : 'Total per Day',
              backgroundColor: '#49B79D',
              data: this.chartData,
              barPercentage: 0.6,
              categoryPercentage: 0.8,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
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
                title: () => this.isPortuguese ? 'Total do Dia' : 'Total per Day',
                label: (tooltipItem: any) => {
                  const totalSeconds = tooltipItem.raw * 60; // Convert minutes back to seconds for formatting
                  return `${this.selectedDataDates[tooltipItem.dataIndex]}: ${this.formatTime(totalSeconds)}`;
                }
              }
            }
          },
          scales: {
            x: { ticks: { color: '#0661AA' }, grid: { display: false } },
            y: {
              beginAtZero: true,
              max: this.maxYValue,
              ticks: {
                stepSize: this.calculateStepSize(), // Calculate an optimal step size
                color: '#0661AA',
                callback: (value) => `${Math.floor(Number(value))} min`
              }
            }
          }
        }
      });
      this.updateChart(this.startDate, this.endDate);
    }
  }
  
  updateChart(startDate: Date, endDate: Date): void {
    const { chartData, maxYValue, selectedDataDates } = this.updateChartData(startDate, endDate);
    this.selectedDataDates = selectedDataDates;
    this.chartData = chartData;
  
    // Round maxYValue up to the next whole minute and add 1 minute
    this.maxYValue = maxYValue === 0 ? 1 : Math.ceil(maxYValue + 1);
  
    this.allChart.data.labels = this.selectedDataDates;
    this.allChart.data.datasets[0].data = this.chartData;
    this.allChart.options.scales.y.max = this.maxYValue;
    this.allChart.options.scales.y.ticks.stepSize = this.calculateStepSize(); // Update step size dynamically
    this.allChart.options.plugins.title.text = this.getChartTitle(); // Update title with current year
    this.allChart.update();
  }
  
  
  // Helper function to calculate optimal step size
  calculateStepSize(): number {
    if (this.maxYValue <= 1) {
      return 1; // Show only 0 and 1 min when there's no or minimal data
    }
    return Math.ceil(this.maxYValue / 5); // Dynamic step size to create approximately 5 ticks on the y-axis
  }
  
  
  
  // Dynamically generate the chart title with the current year
  getChartTitle(): string {
    return this.isPortuguese
      ? `Minutos Totais Diários (${this.endDate.getFullYear()})`
      : `Daily Total Minutes (${this.endDate.getFullYear()})`;
  }
  
  
  updateChartData(startDate: Date, endDate: Date): { chartData: number[], maxYValue: number, selectedDataDates: string[] } {
    const dateRange: Date[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const chartData = dateRange.map(date => {
      const formattedDate = this.formatDate(date, true);
      const entry = this.aggregatedDataArray.find(data => this.formatDate(data.date, true) === formattedDate);
      return entry ? entry.totalMinutes : 0;
    });

    const maxYValue = Math.max(...chartData);
    const selectedDataDates = dateRange.map(date => this.formatDate(date, false));

    return { chartData, maxYValue, selectedDataDates };
  }

  formatDate(date: Date, fullYear: boolean = false): string {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
    if (fullYear) options.year = 'numeric';
    return date.toLocaleDateString('en-GB', options);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
    return `${formattedMinutes} min & ${formattedSeconds} sec`;
  }

  setupScrolling(): void {
    let lastScrollX = 0;
    this.allChartCanvas.nativeElement.addEventListener('touchstart', (event: TouchEvent) => lastScrollX = event.touches[0].clientX);
    this.allChartCanvas.nativeElement.addEventListener('touchmove', (event: TouchEvent) => {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - lastScrollX;
      this.handleScroll(-deltaX);
      lastScrollX = event.touches[0].clientX;
    });
    this.allChartCanvas.nativeElement.addEventListener('wheel', (event: WheelEvent) => this.handleScroll(-event.deltaX));
  }

  handleScroll(deltaX: number): void {
    const scrollSpeedFactor = 5;
    const dayShift = deltaX / scrollSpeedFactor;
    if (dayShift < -0.5 && this.startDate > this.aggregatedDataArray[0]?.date) {
      this.endDate = new Date(this.endDate.setDate(this.endDate.getDate() - 1));
      this.startDate = new Date(this.startDate.setDate(this.startDate.getDate() - 1));
    } else if (dayShift > 0.5 && this.endDate < this.fixedLatestDate) {
      this.endDate = new Date(this.endDate.setDate(this.endDate.getDate() + 1));
      this.startDate = new Date(this.startDate.setDate(this.startDate.getDate() + 1));
    }
    this.updateChart(this.startDate, this.endDate);
  }

  goBack(): void {
    this.navCtrl.back();
  }
}
