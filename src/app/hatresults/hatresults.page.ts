import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

Chart.register(...registerables);

@Component({
  selector: 'app-hatresults',
  templateUrl: './hatresults.page.html',
  styleUrls: ['./hatresults.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class HatresultsPage implements AfterViewInit {
  constructor(private navCtrl: NavController, private globalService: GlobalService) {}

  @ViewChild('HATchartCanvas') HATchartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('HATchartContainer') HATchartContainer!: ElementRef<HTMLDivElement>;
  HATChart: any;
  HATDataArray: ReadonlyArray<{ date: Date; result: number[], rounds: number }> = [];
  HATstartDate!: Date;
  HATendDate!: Date;
  HATfixedLatestDate!: Date;
  HATchartData: { average: number[], longest: number[] } = { average: [], longest: [] };
  HATselectedDataDates: string[] = [];
  HATmaxYValue: number = 10;
  HATlongestSessionAverage: number = 0;
  HATlongestSessionAverageDate: string = '';
  HATlongestRound: number = 0;
  HATlongestRoundDate: string = '';
  HATtotalSessions: number = 0;
  HAThasData: boolean = false;
  @ViewChild('HATCchartCanvas') HATCchartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('HATCchartContainer') HATCchartContainer!: ElementRef<HTMLDivElement>;
  HATCChart: any;
  HATCDataArray: ReadonlyArray<{ date: Date; result: number[], rounds: number }> = [];
  HATCstartDate!: Date;
  HATCendDate!: Date;
  HATCfixedLatestDate!: Date;
  HATCchartData: { average: number[], longest: number[] } = { average: [], longest: [] };
  HATCselectedDataDates: string[] = [];
  HATCmaxYValue: number = 10;
  HATClongestSessionAverage: number = 0;
  HATClongestSessionAverageDate: string = '';
  HATClongestRound: number = 0;
  HATClongestRoundDate: string = '';
  HATCtotalSessions: number = 0;
  HATChasData: boolean = false;
  @ViewChild('AHATchartCanvas') AHATchartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('AHATchartContainer') AHATchartContainer!: ElementRef<HTMLDivElement>;
  AHATChart: any;
  AHATDataArray: ReadonlyArray<{ date: Date; result: number[], rounds: number }> = [];
  AHATstartDate!: Date;
  AHATendDate!: Date;
  AHATfixedLatestDate!: Date;
  AHATchartData: { average: number[], longest: number[] } = { average: [], longest: [] };
  AHATselectedDataDates: string[] = [];
  AHATmaxYValue: number = 10;
  AHATlongestSessionAverage: number = 0;
  AHATlongestSessionAverageDate: string = '';
  AHATlongestRound: number = 0;
  AHATlongestRoundDate: string = '';
  AHATtotalSessions: number = 0;
  AHAThasData: boolean = false;
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';


  ngAfterViewInit(): void {
    this.HATloadDataFromLocalStorage();
    if (this.HAThasData) {
      this.HATsetDateRange();
      this.HATinitializeChart();
      this.HATsetupScrolling();
      this.HATcalculateOverviewData();
    }
    this.HATCloadDataFromLocalStorage();
    if (this.HATChasData) {
      this.HATCsetDateRange();
      this.HATCinitializeChart();
      this.HATCsetupScrolling();
      this.HATCcalculateOverviewData();
    }
    this.AHATloadDataFromLocalStorage();
    if (this.AHAThasData) {
      this.AHATsetDateRange();
      this.AHATinitializeChart();
      this.AHATsetupScrolling();
      this.AHATcalculateOverviewData();
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

  HATloadDataFromLocalStorage(): void {
    const data = JSON.parse(localStorage.getItem('HATResults') || '[]');
    if(data.length > 0){
      this.HAThasData = true;
      this.HATchartContainer.nativeElement.style.display = 'block'
    }else{
      this.HAThasData = false;
      this.HATchartContainer.nativeElement.style.display = 'none'
    }
  
    this.HATDataArray = Object.freeze(
      data.map((item: any) => ({
        date: Object.freeze(new Date(item.date)),
        result: Object.freeze(item.result),
        rounds: item.rounds
      }))
    );
    
    this.HATfixedLatestDate = this.HATDataArray.length > 0
      ? new Date(this.HATDataArray[this.HATDataArray.length - 1].date)
      : new Date();
  }
  

  HATsetDateRange(): void {
    const lastResultDate = this.HATDataArray.length > 0
      ? new Date(this.HATDataArray[this.HATDataArray.length - 1].date)
      : new Date();

    this.HATendDate = new Date(lastResultDate);
    this.HATstartDate = new Date(this.HATendDate);
    this.HATstartDate.setDate(this.HATendDate.getDate() - 6);
  }

  HATcalculateOverviewData() {
    if (this.HATDataArray.length === 0) {
      this.HATlongestSessionAverage = 0;
      this.HATlongestSessionAverageDate = '';
      this.HATlongestRound = 0;
      this.HATlongestRoundDate = '';
      this.HATtotalSessions = 0;
      return;
    }
  
    this.HATtotalSessions = this.HATDataArray.length; // Total number of sessions (entries)
  
    // Find the latest longest round
    const allRoundsWithDates = this.HATDataArray.map(entry => ({
      round: Math.max(...entry.result),
      date: entry.date
    }));
    const longestRoundEntry = allRoundsWithDates.reduce((max, entry) =>
      entry.round > max.round || (entry.round === max.round && entry.date > max.date) ? entry : max
    );
    this.HATlongestRound = longestRoundEntry.round;
    this.HATlongestRoundDate = this.formatDate(longestRoundEntry.date, true);
  
    // Find the latest longest session average
    const sessionAveragesWithDates = this.HATDataArray.map(entry => ({
      average: entry.result.reduce((a, b) => a + b, 0) / entry.rounds,
      date: entry.date
    }));
    const longestSessionAverageEntry = sessionAveragesWithDates.reduce((max, entry) =>
      entry.average > max.average || (entry.average === max.average && entry.date > max.date) ? entry : max
    );
    this.HATlongestSessionAverage = parseFloat(longestSessionAverageEntry.average.toFixed(2));
    this.HATlongestSessionAverageDate = this.formatDate(longestSessionAverageEntry.date, true);
  }  

  HATinitializeChart(): void {
    const context = this.HATchartCanvas.nativeElement.getContext('2d');
    if (context) {
      this.HATChart = new Chart(context, {
        type: 'bar',
        data: {
          labels: this.HATselectedDataDates,
          datasets: [
            {
              label: this.isPortuguese ? 'Média do Dia' : 'Day Average',
              backgroundColor: '#49B79D',
              data: this.HATchartData.average,
              barPercentage: 0.5,
              categoryPercentage: 0.8,
            },
            {
              label: this.isPortuguese ? 'Maior Rodada' : 'Longest Round',
              backgroundColor: '#0661AA',
              data: this.HATchartData.longest,
              barPercentage: 0.5,
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
              text: this.HATgetChartTitle(),
              font: { size: 14 },
              color: '#0661AA'
            },
            tooltip: {
              displayColors: false,
              callbacks: {
                title: (tooltipItems) => {
                  const datasetIndex = tooltipItems[0].datasetIndex;
                  return datasetIndex === 0
                    ? (this.isPortuguese ? 'Média do Dia' : 'Day Average')
                    : (this.isPortuguese ? 'Maior Rodada' : 'Longest Round');
                },
                label: (tooltipItem: any) =>
                  `${this.HATselectedDataDates[tooltipItem.dataIndex]}: ${tooltipItem.raw.toFixed(2)} seconds`
              }
            },
          },
          scales: {
            x: { ticks: { color: '#0661AA' }, grid: { display: false } },
            y: { beginAtZero: true, max: this.HATmaxYValue, ticks: { stepSize: 5, color: '#0661AA' } }
          }
        }
      });
      this.HATupdateChart(this.HATstartDate, this.HATendDate);
    } else {
      console.error('Failed to acquire 2D context for the chart');
    }
  }

  HATupdateChart(HATstartDate: Date, HATendDate: Date): void {
    const { HATchartData, HATmaxYValue, HATselectedDataDates } = this.HATupdateChartData(HATstartDate, HATendDate);
    this.HATselectedDataDates = HATselectedDataDates;
    this.HATchartData = HATchartData;
    this.HATmaxYValue = HATmaxYValue;
    this.HATChart.data.labels = this.HATselectedDataDates;
    this.HATChart.data.datasets[0].data = this.HATchartData.average;
    this.HATChart.data.datasets[1].data = this.HATchartData.longest;
    this.HATChart.options.scales.y.max = this.HATmaxYValue;
    this.HATChart.options.plugins.title.text = this.HATgetChartTitle();
    this.HATChart.update();
  }

  HATupdateChartData(HATstartDate: Date, HATendDate: Date): { HATchartData: { average: number[], longest: number[] }, HATmaxYValue: number, HATselectedDataDates: string[] } {
    const dateRange: Date[] = [];
    let currentDate = new Date(HATstartDate);
  
    while (currentDate <= HATendDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  
    const aggregatedData: { [key: string]: { totalValue: number, count: number, maxRound: number } } = {};
    this.HATDataArray.forEach(hatResult => {
      const resultDate = new Date(hatResult.date);
      if (resultDate < HATstartDate || resultDate > HATendDate) return;
  
      const formattedDate = this.formatDate(resultDate); // Using "dd/mm" format
      const sessionAverage = hatResult.result.reduce((a, b) => a + b, 0) / hatResult.rounds;
      const maxRound = Math.max(...hatResult.result);
  
      if (!aggregatedData[formattedDate]) {
        aggregatedData[formattedDate] = { totalValue: sessionAverage, count: 1, maxRound: maxRound };
      } else {
        aggregatedData[formattedDate].totalValue += sessionAverage;
        aggregatedData[formattedDate].count++;
        aggregatedData[formattedDate].maxRound = Math.max(aggregatedData[formattedDate].maxRound, maxRound);
      }
    });
  
    const averageData = dateRange.map(date => {
      const formattedDate = this.formatDate(date);
      const aggregatedDatum = aggregatedData[formattedDate];
      return aggregatedDatum ? parseFloat((aggregatedDatum.totalValue / aggregatedDatum.count).toFixed(2)) : 0;
    });
  
    const longestData = dateRange.map(date => {
      const formattedDate = this.formatDate(date);
      const aggregatedDatum = aggregatedData[formattedDate];
      return aggregatedDatum ? aggregatedDatum.maxRound : 0;
    });
  
    const HATmaxYValue = Math.max(...averageData.concat(longestData)) > 2
      ? Math.ceil(Math.max(...averageData.concat(longestData)) / 10) * 10
      : 10;
    const HATselectedDataDates = dateRange.map(date => this.formatDate(date)); // For chart, using "dd/mm"
  
    return { HATchartData: { average: averageData, longest: longestData }, HATmaxYValue, HATselectedDataDates };
  }
  
  HATgetChartTitle(): string {
    const year = this.HATendDate.getFullYear();
    return this.isPortuguese
      ? `Seus resultados de TAA em segundos (${year})`
      : `Your HAT results in seconds (${year})`;
  }

  HATsetupScrolling(): void {
    let lastScrollX = 0;

    this.HATchartCanvas.nativeElement.addEventListener('touchstart', (event: TouchEvent) => {
      lastScrollX = event.touches[0].clientX;
    });

    this.HATchartCanvas.nativeElement.addEventListener('touchmove', (event: TouchEvent) => {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - lastScrollX;
      this.HAThandleScroll(-deltaX);
      lastScrollX = event.touches[0].clientX;
    });

    this.HATchartCanvas.nativeElement.addEventListener('wheel', (event: WheelEvent) => {
      this.HAThandleScroll(-event.deltaX);
    });
  }

  HAThandleScroll(deltaX: number): void {
    const scrollSpeedFactor = 5;
    const dayShift = deltaX / scrollSpeedFactor;

    if (dayShift < -0.5 && this.HATstartDate > this.HATDataArray[0]?.date) {
      this.HATendDate = new Date(this.HATendDate.setDate(this.HATendDate.getDate() - 1));
      this.HATstartDate = new Date(this.HATstartDate.setDate(this.HATstartDate.getDate() - 1));
    } else if (dayShift > 0.5 && this.HATendDate < this.HATfixedLatestDate) {
      this.HATendDate = new Date(this.HATendDate.setDate(this.HATendDate.getDate() + 1));
      this.HATstartDate = new Date(this.HATstartDate.setDate(this.HATstartDate.getDate() + 1));
    }

    this.HATupdateChart(this.HATstartDate, this.HATendDate);
  }
  HATCloadDataFromLocalStorage(): void {
    const data = JSON.parse(localStorage.getItem('HATCResults') || '[]');
    if(data.length > 0){
      this.HATChasData = true;
      this.HATCchartContainer.nativeElement.style.display = 'block'
    }else{
      this.HATChasData = false;
      this.HATCchartContainer.nativeElement.style.display = 'none'
    }
  
    this.HATCDataArray = Object.freeze(
      data.map((item: any) => ({
        date: Object.freeze(new Date(item.date)),
        result: Object.freeze(item.result),
        rounds: item.rounds
      }))
    );
    
    this.HATCfixedLatestDate = this.HATCDataArray.length > 0
      ? new Date(this.HATCDataArray[this.HATCDataArray.length - 1].date)
      : new Date();
  }
  

  HATCsetDateRange(): void {
    const lastResultDate = this.HATCDataArray.length > 0
      ? new Date(this.HATCDataArray[this.HATCDataArray.length - 1].date)
      : new Date();

    this.HATCendDate = new Date(lastResultDate);
    this.HATCstartDate = new Date(this.HATCendDate);
    this.HATCstartDate.setDate(this.HATCendDate.getDate() - 6);
  }

  HATCcalculateOverviewData() {
    if (this.HATCDataArray.length === 0) {
      this.HATClongestSessionAverage = 0;
      this.HATClongestSessionAverageDate = '';
      this.HATClongestRound = 0;
      this.HATClongestRoundDate = '';
      this.HATCtotalSessions = 0;
      return;
    }
  
    this.HATCtotalSessions = this.HATCDataArray.length; // Total number of sessions (entries)
  
    // Find the latest longest round
    const allRoundsWithDates = this.HATCDataArray.map(entry => ({
      round: Math.max(...entry.result),
      date: entry.date
    }));
    const longestRoundEntry = allRoundsWithDates.reduce((max, entry) =>
      entry.round > max.round || (entry.round === max.round && entry.date > max.date) ? entry : max
    );
    this.HATClongestRound = longestRoundEntry.round;
    this.HATClongestRoundDate = this.formatDate(longestRoundEntry.date, true);
  
    // Find the latest longest session average
    const sessionAveragesWithDates = this.HATCDataArray.map(entry => ({
      average: entry.result.reduce((a, b) => a + b, 0) / entry.rounds,
      date: entry.date
    }));
    const longestSessionAverageEntry = sessionAveragesWithDates.reduce((max, entry) =>
      entry.average > max.average || (entry.average === max.average && entry.date > max.date) ? entry : max
    );
    this.HATClongestSessionAverage = parseFloat(longestSessionAverageEntry.average.toFixed(2));
    this.HATClongestSessionAverageDate = this.formatDate(longestSessionAverageEntry.date, true);
  }  

  HATCinitializeChart(): void {
    const context = this.HATCchartCanvas.nativeElement.getContext('2d');
    if (context) {
      this.HATCChart = new Chart(context, {
        type: 'bar',
        data: {
          labels: this.HATCselectedDataDates,
          datasets: [
            {
              label: this.isPortuguese ? 'Média do Dia' : 'Day Average',
              backgroundColor: '#49B79D',
              data: this.HATCchartData.average,
              barPercentage: 0.5,
              categoryPercentage: 0.8,
            },
            {
              label: this.isPortuguese ? 'Maior Rodada' : 'Longest Round',
              backgroundColor: '#0661AA',
              data: this.HATCchartData.longest,
              barPercentage: 0.5,
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
              text: this.HATCgetChartTitle(),
              font: { size: 14 },
              color: '#0661AA'
            },
            tooltip: {
              displayColors: false,
              callbacks: {
                title: (tooltipItems) => {
                  const datasetIndex = tooltipItems[0].datasetIndex;
                  return datasetIndex === 0
                    ? (this.isPortuguese ? 'Média do Dia' : 'Day Average')
                    : (this.isPortuguese ? 'Maior Rodada' : 'Longest Round');
                },
                label: (tooltipItem: any) =>
                  `${this.HATCselectedDataDates[tooltipItem.dataIndex]}: ${tooltipItem.raw.toFixed(2)} seconds`
              }
            },
          },
          scales: {
            x: { ticks: { color: '#0661AA' }, grid: { display: false } },
            y: { beginAtZero: true, max: this.HATCmaxYValue, ticks: { stepSize: 5, color: '#0661AA' } }
          }
        }
      });
      this.HATCupdateChart(this.HATCstartDate, this.HATCendDate);
    } else {
      console.error('Failed to acquire 2D context for the chart');
    }
  }

  HATCupdateChart(HATCstartDate: Date, HATCendDate: Date): void {
    const { HATCchartData, HATCmaxYValue, HATCselectedDataDates } = this.HATCupdateChartData(HATCstartDate, HATCendDate);
    this.HATCselectedDataDates = HATCselectedDataDates;
    this.HATCchartData = HATCchartData;
    this.HATCmaxYValue = HATCmaxYValue;
    this.HATCChart.data.labels = this.HATCselectedDataDates;
    this.HATCChart.data.datasets[0].data = this.HATCchartData.average;
    this.HATCChart.data.datasets[1].data = this.HATCchartData.longest;
    this.HATCChart.options.scales.y.max = this.HATCmaxYValue;
    this.HATCChart.options.plugins.title.text = this.HATCgetChartTitle();
    this.HATCChart.update();
  }

  HATCupdateChartData(HATCstartDate: Date, HATCendDate: Date): { HATCchartData: { average: number[], longest: number[] }, HATCmaxYValue: number, HATCselectedDataDates: string[] } {
    const dateRange: Date[] = [];
    let currentDate = new Date(HATCstartDate);
  
    while (currentDate <= HATCendDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  
    const aggregatedData: { [key: string]: { totalValue: number, count: number, maxRound: number } } = {};
    this.HATCDataArray.forEach(hatResult => {
      const resultDate = new Date(hatResult.date);
      if (resultDate < HATCstartDate || resultDate > HATCendDate) return;
  
      const formattedDate = this.formatDate(resultDate); // Using "dd/mm" format
      const sessionAverage = hatResult.result.reduce((a, b) => a + b, 0) / hatResult.rounds;
      const maxRound = Math.max(...hatResult.result);
  
      if (!aggregatedData[formattedDate]) {
        aggregatedData[formattedDate] = { totalValue: sessionAverage, count: 1, maxRound: maxRound };
      } else {
        aggregatedData[formattedDate].totalValue += sessionAverage;
        aggregatedData[formattedDate].count++;
        aggregatedData[formattedDate].maxRound = Math.max(aggregatedData[formattedDate].maxRound, maxRound);
      }
    });
  
    const averageData = dateRange.map(date => {
      const formattedDate = this.formatDate(date);
      const aggregatedDatum = aggregatedData[formattedDate];
      return aggregatedDatum ? parseFloat((aggregatedDatum.totalValue / aggregatedDatum.count).toFixed(2)) : 0;
    });
  
    const longestData = dateRange.map(date => {
      const formattedDate = this.formatDate(date);
      const aggregatedDatum = aggregatedData[formattedDate];
      return aggregatedDatum ? aggregatedDatum.maxRound : 0;
    });
  
    const HATCmaxYValue = Math.max(...averageData.concat(longestData)) > 2
      ? Math.ceil(Math.max(...averageData.concat(longestData)) / 10) * 10
      : 10;
    const HATCselectedDataDates = dateRange.map(date => this.formatDate(date)); // For chart, using "dd/mm"
  
    return { HATCchartData: { average: averageData, longest: longestData }, HATCmaxYValue, HATCselectedDataDates };
  }
  
  HATCgetChartTitle(): string {
    const year = this.HATCendDate.getFullYear();
    return this.isPortuguese
      ? `Seus resultados de TAAC em segundos (${year})`
      : `Your HATR results in seconds (${year})`;
  }

  HATCsetupScrolling(): void {
    let lastScrollX = 0;

    this.HATCchartCanvas.nativeElement.addEventListener('touchstart', (event: TouchEvent) => {
      lastScrollX = event.touches[0].clientX;
    });

    this.HATCchartCanvas.nativeElement.addEventListener('touchmove', (event: TouchEvent) => {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - lastScrollX;
      this.HATChandleScroll(-deltaX);
      lastScrollX = event.touches[0].clientX;
    });

    this.HATCchartCanvas.nativeElement.addEventListener('wheel', (event: WheelEvent) => {
      this.HATChandleScroll(-event.deltaX);
    });
  }

  HATChandleScroll(deltaX: number): void {
    const scrollSpeedFactor = 5;
    const dayShift = deltaX / scrollSpeedFactor;

    if (dayShift < -0.5 && this.HATCstartDate > this.HATCDataArray[0]?.date) {
      this.HATCendDate = new Date(this.HATCendDate.setDate(this.HATCendDate.getDate() - 1));
      this.HATCstartDate = new Date(this.HATCstartDate.setDate(this.HATCstartDate.getDate() - 1));
    } else if (dayShift > 0.5 && this.HATCendDate < this.HATCfixedLatestDate) {
      this.HATCendDate = new Date(this.HATCendDate.setDate(this.HATCendDate.getDate() + 1));
      this.HATCstartDate = new Date(this.HATCstartDate.setDate(this.HATCstartDate.getDate() + 1));
    }

    this.HATCupdateChart(this.HATCstartDate, this.HATCendDate);
  }
  AHATloadDataFromLocalStorage(): void {
    const data = JSON.parse(localStorage.getItem('AHATResults') || '[]');
    if(data.length > 0){
      this.AHAThasData = true;
      this.AHATchartContainer.nativeElement.style.display = 'block'
    }else{
      this.AHAThasData = false;
      this.AHATchartContainer.nativeElement.style.display = 'none'
    }
  
    this.AHATDataArray = Object.freeze(
      data.map((item: any) => ({
        date: Object.freeze(new Date(item.date)),
        result: Object.freeze(item.result),
        rounds: item.rounds
      }))
    );
    
    this.AHATfixedLatestDate = this.AHATDataArray.length > 0
      ? new Date(this.AHATDataArray[this.AHATDataArray.length - 1].date)
      : new Date();
  }
  

  AHATsetDateRange(): void {
    const lastResultDate = this.AHATDataArray.length > 0
      ? new Date(this.AHATDataArray[this.AHATDataArray.length - 1].date)
      : new Date();

    this.AHATendDate = new Date(lastResultDate);
    this.AHATstartDate = new Date(this.AHATendDate);
    this.AHATstartDate.setDate(this.AHATendDate.getDate() - 6);
  }

  AHATcalculateOverviewData() {
    if (this.AHATDataArray.length === 0) {
      this.AHATlongestSessionAverage = 0;
      this.AHATlongestSessionAverageDate = '';
      this.AHATlongestRound = 0;
      this.AHATlongestRoundDate = '';
      this.AHATtotalSessions = 0;
      return;
    }
  
    this.AHATtotalSessions = this.AHATDataArray.length; // Total number of sessions (entries)
  
    // Find the latest longest round
    const allRoundsWithDates = this.AHATDataArray.map(entry => ({
      round: Math.max(...entry.result),
      date: entry.date
    }));
    const longestRoundEntry = allRoundsWithDates.reduce((max, entry) =>
      entry.round > max.round || (entry.round === max.round && entry.date > max.date) ? entry : max
    );
    this.AHATlongestRound = longestRoundEntry.round;
    this.AHATlongestRoundDate = this.formatDate(longestRoundEntry.date, true);
  
    // Find the latest longest session average
    const sessionAveragesWithDates = this.AHATDataArray.map(entry => ({
      average: entry.result.reduce((a, b) => a + b, 0) / entry.rounds,
      date: entry.date
    }));
    const longestSessionAverageEntry = sessionAveragesWithDates.reduce((max, entry) =>
      entry.average > max.average || (entry.average === max.average && entry.date > max.date) ? entry : max
    );
    this.AHATlongestSessionAverage = parseFloat(longestSessionAverageEntry.average.toFixed(2));
    this.AHATlongestSessionAverageDate = this.formatDate(longestSessionAverageEntry.date, true);
  }  

  AHATinitializeChart(): void {
    const context = this.AHATchartCanvas.nativeElement.getContext('2d');
    if (context) {
      this.AHATChart = new Chart(context, {
        type: 'bar',
        data: {
          labels: this.AHATselectedDataDates,
          datasets: [
            {
              label: this.isPortuguese ? 'Média do Dia' : 'Day Average',
              backgroundColor: '#49B79D',
              data: this.AHATchartData.average,
              barPercentage: 0.5,
              categoryPercentage: 0.8,
            },
            {
              label: this.isPortuguese ? 'Maior Rodada' : 'Longest Round',
              backgroundColor: '#0661AA',
              data: this.AHATchartData.longest,
              barPercentage: 0.5,
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
              text: this.AHATgetChartTitle(),
              font: { size: 14 },
              color: '#0661AA'
            },
            tooltip: {
              displayColors: false,
              callbacks: {
                title: (tooltipItems) => {
                  const datasetIndex = tooltipItems[0].datasetIndex;
                  return datasetIndex === 0
                    ? (this.isPortuguese ? 'Média do Dia' : 'Day Average')
                    : (this.isPortuguese ? 'Maior Rodada' : 'Longest Round');
                },
                label: (tooltipItem: any) =>
                  `${this.AHATselectedDataDates[tooltipItem.dataIndex]}: ${tooltipItem.raw.toFixed(2)} seconds`
              }
            },
          },
          scales: {
            x: { ticks: { color: '#0661AA' }, grid: { display: false } },
            y: { beginAtZero: true, max: this.AHATmaxYValue, ticks: { stepSize: 5, color: '#0661AA' } }
          }
        }
      });
      this.AHATupdateChart(this.AHATstartDate, this.AHATendDate);
    } else {
      console.error('Failed to acquire 2D context for the chart');
    }
  }

  AHATupdateChart(AHATstartDate: Date, AHATendDate: Date): void {
    const { AHATchartData, AHATmaxYValue, AHATselectedDataDates } = this.AHATupdateChartData(AHATstartDate, AHATendDate);
    this.AHATselectedDataDates = AHATselectedDataDates;
    this.AHATchartData = AHATchartData;
    this.AHATmaxYValue = AHATmaxYValue;
    this.AHATChart.data.labels = this.AHATselectedDataDates;
    this.AHATChart.data.datasets[0].data = this.AHATchartData.average;
    this.AHATChart.data.datasets[1].data = this.AHATchartData.longest;
    this.AHATChart.options.scales.y.max = this.AHATmaxYValue;
    this.AHATChart.options.plugins.title.text = this.AHATgetChartTitle();
    this.AHATChart.update();
  }

  AHATupdateChartData(AHATstartDate: Date, AHATendDate: Date): { AHATchartData: { average: number[], longest: number[] }, AHATmaxYValue: number, AHATselectedDataDates: string[] } {
    const dateRange: Date[] = [];
    let currentDate = new Date(AHATstartDate);
  
    while (currentDate <= AHATendDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  
    const aggregatedData: { [key: string]: { totalValue: number, count: number, maxRound: number } } = {};
    this.AHATDataArray.forEach(hatResult => {
      const resultDate = new Date(hatResult.date);
      if (resultDate < AHATstartDate || resultDate > AHATendDate) return;
  
      const formattedDate = this.formatDate(resultDate); // Using "dd/mm" format
      const sessionAverage = hatResult.result.reduce((a, b) => a + b, 0) / hatResult.rounds;
      const maxRound = Math.max(...hatResult.result);
  
      if (!aggregatedData[formattedDate]) {
        aggregatedData[formattedDate] = { totalValue: sessionAverage, count: 1, maxRound: maxRound };
      } else {
        aggregatedData[formattedDate].totalValue += sessionAverage;
        aggregatedData[formattedDate].count++;
        aggregatedData[formattedDate].maxRound = Math.max(aggregatedData[formattedDate].maxRound, maxRound);
      }
    });
  
    const averageData = dateRange.map(date => {
      const formattedDate = this.formatDate(date);
      const aggregatedDatum = aggregatedData[formattedDate];
      return aggregatedDatum ? parseFloat((aggregatedDatum.totalValue / aggregatedDatum.count).toFixed(2)) : 0;
    });
  
    const longestData = dateRange.map(date => {
      const formattedDate = this.formatDate(date);
      const aggregatedDatum = aggregatedData[formattedDate];
      return aggregatedDatum ? aggregatedDatum.maxRound : 0;
    });
  
    const AHATmaxYValue = Math.max(...averageData.concat(longestData)) > 2
      ? Math.ceil(Math.max(...averageData.concat(longestData)) / 10) * 10
      : 10;
    const AHATselectedDataDates = dateRange.map(date => this.formatDate(date)); // For chart, using "dd/mm"
  
    return { AHATchartData: { average: averageData, longest: longestData }, AHATmaxYValue, AHATselectedDataDates };
  }
  
  AHATgetChartTitle(): string {
    const year = this.AHATendDate.getFullYear();
    return this.isPortuguese
      ? `Seus resultados de TAAA em segundos (${year})`
      : `Your AHAT results in seconds (${year})`;
  }

  AHATsetupScrolling(): void {
    let lastScrollX = 0;

    this.AHATchartCanvas.nativeElement.addEventListener('touchstart', (event: TouchEvent) => {
      lastScrollX = event.touches[0].clientX;
    });

    this.AHATchartCanvas.nativeElement.addEventListener('touchmove', (event: TouchEvent) => {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - lastScrollX;
      this.AHAThandleScroll(-deltaX);
      lastScrollX = event.touches[0].clientX;
    });

    this.AHATchartCanvas.nativeElement.addEventListener('wheel', (event: WheelEvent) => {
      this.AHAThandleScroll(-event.deltaX);
    });
  }

  AHAThandleScroll(deltaX: number): void {
    const scrollSpeedFactor = 5;
    const dayShift = deltaX / scrollSpeedFactor;

    if (dayShift < -0.5 && this.AHATstartDate > this.AHATDataArray[0]?.date) {
      this.AHATendDate = new Date(this.AHATendDate.setDate(this.AHATendDate.getDate() - 1));
      this.AHATstartDate = new Date(this.AHATstartDate.setDate(this.AHATstartDate.getDate() - 1));
    } else if (dayShift > 0.5 && this.AHATendDate < this.AHATfixedLatestDate) {
      this.AHATendDate = new Date(this.AHATendDate.setDate(this.AHATendDate.getDate() + 1));
      this.AHATstartDate = new Date(this.AHATstartDate.setDate(this.AHATstartDate.getDate() + 1));
    }

    this.AHATupdateChart(this.AHATstartDate, this.AHATendDate);
  }

  formatDate(date: Date, fullYear: boolean = false): string {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
    if (fullYear) {
      options.year = 'numeric';
    }
    return date.toLocaleDateString(this.isPortuguese ? 'pt-PT' : 'en-GB', options);
  }  

  goBack(): void {
    this.navCtrl.back();
  }
}
