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
  selector: 'app-whresults',
  templateUrl: './whresults.page.html',
  styleUrls: ['./whresults.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class WHresultsPage implements AfterViewInit {
  constructor(private navCtrl: NavController, private globalService: GlobalService) {}

  @ViewChild('WHchartCanvas') WHchartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('WHchartContainer') WHchartContainer!: ElementRef<HTMLDivElement>;
  WHChart: any;
  WHDataArray: ReadonlyArray<{ date: Date; roundsResult: number[], rounds: number }> = [];
  WHstartDate!: Date;
  WHendDate!: Date;
  WHfixedLatestDate!: Date;
  WHchartData: { average: number[], longest: number[] } = { average: [], longest: [] };
  WHselectedDataDates: string[] = [];
  WHmaxYValue: number = 1;
  WHlongestSessionAverage: string = '';
  WHlongestSessionAverageDate: string = '';
  WHlongestRound: string = '';
  WHlongestRoundDate: string = '';
  WHtotalSessions: number = 0;
  WHhasData: boolean = false;
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';


  ngAfterViewInit(): void {
    this.WHloadDataFromLocalStorage();
    if (this.WHhasData) {
      this.WHsetDateRange();
      this.WHinitializeChart();
      this.WHsetupScrolling();
      this.WHcalculateOverviewData();
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

  WHloadDataFromLocalStorage(): void {
    const data = JSON.parse(localStorage.getItem('WHResults') || '[]');
    if(data.length > 0){
      this.WHhasData = true;
      this.WHchartContainer.nativeElement.style.display = 'block'
    }else{
      this.WHhasData = false;
      this.WHchartContainer.nativeElement.style.display = 'none'
    }
  
    this.WHDataArray = Object.freeze(
      data.map((item: any) => ({
        date: Object.freeze(new Date(item.date)),
        roundsResult: Object.freeze(item.roundsResult),
        rounds: item.rounds
      }))
    );
    
    this.WHfixedLatestDate = this.WHDataArray.length > 0
      ? new Date(this.WHDataArray[this.WHDataArray.length - 1].date)
      : new Date();
  }
  

  WHsetDateRange(): void {
    const lastResultDate = this.WHDataArray.length > 0
      ? new Date(this.WHDataArray[this.WHDataArray.length - 1].date)
      : new Date();

    this.WHendDate = new Date(lastResultDate);
    this.WHstartDate = new Date(this.WHendDate);
    this.WHstartDate.setDate(this.WHendDate.getDate() - 6);
  }

  WHcalculateOverviewData() {
    if (this.WHDataArray.length === 0) {
      this.WHlongestSessionAverage = '';
      this.WHlongestSessionAverageDate = '';
      this.WHlongestRound = '';
      this.WHlongestRoundDate = '';
      this.WHtotalSessions = 0;
      return;
    }
  
    this.WHtotalSessions = this.WHDataArray.length; // Total number of sessions (entries)
  
    // Find the latest longest round
    const allRoundsWithDates = this.WHDataArray.map(entry => ({
      round: Math.max(...entry.roundsResult),
      date: entry.date
    }));
    const longestRoundEntry = allRoundsWithDates.reduce((max, entry) =>
      entry.round > max.round || (entry.round === max.round && entry.date > max.date) ? entry : max
    );
    this.WHlongestRound = this.formatTime(longestRoundEntry.round/60);
    this.WHlongestRoundDate = this.formatDate(longestRoundEntry.date, true);
  
    // Find the latest longest session average
    const sessionAveragesWithDates = this.WHDataArray.map(entry => ({
      average: entry.roundsResult.reduce((a, b) => a + b, 0) / entry.rounds,
      date: entry.date
    }));
    const longestSessionAverageEntry = sessionAveragesWithDates.reduce((max, entry) =>
      entry.average > max.average || (entry.average === max.average && entry.date > max.date) ? entry : max
    );
    this.WHlongestSessionAverage = this.formatTime(parseFloat(longestSessionAverageEntry.average.toFixed(0))/60);
    this.WHlongestSessionAverageDate = this.formatDate(longestSessionAverageEntry.date, true);
  }  

  WHinitializeChart(): void {
    const context = this.WHchartCanvas.nativeElement.getContext('2d');
    if (context) {
      this.WHChart = new Chart(context, {
        type: 'bar',
        data: {
          labels: this.WHselectedDataDates,
          datasets: [
            {
              label: this.isPortuguese ? 'Média do Dia' : 'Day Average',
              backgroundColor: '#49B79D',
              data: this.WHchartData.average,
              barPercentage: 0.5,
              categoryPercentage: 0.8,
            },
            {
              label: this.isPortuguese ? 'Maior Rodada' : 'Longest Round',
              backgroundColor: '#0661AA',
              data: this.WHchartData.longest,
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
              text: this.WHgetChartTitle(),
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
                  `${this.WHselectedDataDates[tooltipItem.dataIndex]}: ${this.formatTime(tooltipItem.raw)}`
              }
            },
          },
          scales: {
            x: { ticks: { color: '#0661AA' }, grid: { display: false } },
            y: { beginAtZero: true, max: this.WHmaxYValue, ticks: { stepSize: 1, color: '#0661AA' } }
          }
        }
      });
      this.WHupdateChart(this.WHstartDate, this.WHendDate);
    } else {
      console.error('Failed to acquire 2D context for the chart');
    }
  }

  WHupdateChart(WHstartDate: Date, WHendDate: Date): void {
    const { WHchartData, WHmaxYValue, WHselectedDataDates } = this.WHupdateChartData(WHstartDate, WHendDate);
    this.WHselectedDataDates = WHselectedDataDates;
    this.WHchartData = WHchartData;
    this.WHmaxYValue = WHmaxYValue;
    this.WHChart.data.labels = this.WHselectedDataDates;
    this.WHChart.data.datasets[0].data = this.WHchartData.average;
    this.WHChart.data.datasets[1].data = this.WHchartData.longest;
    this.WHChart.options.scales.y.max = this.WHmaxYValue;
    this.WHChart.options.plugins.title.text = this.WHgetChartTitle();
    this.WHChart.update();
  }

  WHupdateChartData(WHstartDate: Date, WHendDate: Date): { WHchartData: { average: number[], longest: number[] }, WHmaxYValue: number, WHselectedDataDates: string[] } {
    const dateRange: Date[] = [];
    let currentDate = new Date(WHstartDate);
  
    while (currentDate <= WHendDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  
    const aggregatedData: { [key: string]: { totalValue: number, count: number, maxRound: number } } = {};
    
    // Aggregate data by date
    this.WHDataArray.forEach(whResult => {
      const resultDate = new Date(whResult.date);
      if (resultDate < WHstartDate || resultDate > WHendDate) return;
  
      const formattedDate = this.formatDate(resultDate); // Format as "dd/mm"
      const sessionTotal = whResult.roundsResult.reduce((a, b) => a + b, 0); // Sum of all results in the session
      const maxRound = Math.max(...whResult.roundsResult);
  
      if (!aggregatedData[formattedDate]) {
        aggregatedData[formattedDate] = { totalValue: sessionTotal, count: whResult.roundsResult.length, maxRound: maxRound };
      } else {
        aggregatedData[formattedDate].totalValue += sessionTotal; // Accumulate total for the day
        aggregatedData[formattedDate].count += whResult.roundsResult.length; // Accumulate count for the day
        aggregatedData[formattedDate].maxRound = Math.max(aggregatedData[formattedDate].maxRound, maxRound); // Track longest round for the day
      }
    });
  
    // Calculate daily averages and longest data
    const averageData = dateRange.map(date => {
      const formattedDate = this.formatDate(date);
      const aggregatedDatum = aggregatedData[formattedDate];
      return aggregatedDatum ? parseFloat((aggregatedDatum.totalValue / aggregatedDatum.count / 60).toFixed(2)) : 0; // Average in minutes
    });
  
    const longestData = dateRange.map(date => {
      const formattedDate = this.formatDate(date);
      const aggregatedDatum = aggregatedData[formattedDate];
      return aggregatedDatum ? aggregatedDatum.maxRound / 60 : 0; // Longest round in minutes
    });
  
    // Calculate max Y value in minutes
    const maxSeconds = Math.max(...averageData.concat(longestData)) * 60; // Convert to seconds for comparison
    const maxMinutes = Math.ceil(maxSeconds / 60) + 1; // Round up to nearest minute and add 1 minute
  
    const WHselectedDataDates = dateRange.map(date => this.formatDate(date)); // For chart, using "dd/mm"
  
    return { WHchartData: { average: averageData, longest: longestData }, WHmaxYValue: maxMinutes, WHselectedDataDates };
  }
  
  
  
  WHgetChartTitle(): string {
    const year = this.WHendDate.getFullYear();
    return this.isPortuguese
      ? `Seus resultados de Hiperventilação Guiada (${year})`
      : `Your Guided Hyperventilation results (${year})`;
  }

  WHsetupScrolling(): void {
    let lastScrollX = 0;

    this.WHchartCanvas.nativeElement.addEventListener('touchstart', (event: TouchEvent) => {
      lastScrollX = event.touches[0].clientX;
    });

    this.WHchartCanvas.nativeElement.addEventListener('touchmove', (event: TouchEvent) => {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - lastScrollX;
      this.WHhandleScroll(-deltaX);
      lastScrollX = event.touches[0].clientX;
    });

    this.WHchartCanvas.nativeElement.addEventListener('wheel', (event: WheelEvent) => {
      this.WHhandleScroll(-event.deltaX);
    });
  }

  WHhandleScroll(deltaX: number): void {
    const scrollSpeedFactor = 5;
    const dayShift = deltaX / scrollSpeedFactor;

    if (dayShift < -0.5 && this.WHstartDate > this.WHDataArray[0]?.date) {
      this.WHendDate = new Date(this.WHendDate.setDate(this.WHendDate.getDate() - 1));
      this.WHstartDate = new Date(this.WHstartDate.setDate(this.WHstartDate.getDate() - 1));
    } else if (dayShift > 0.5 && this.WHendDate < this.WHfixedLatestDate) {
      this.WHendDate = new Date(this.WHendDate.setDate(this.WHendDate.getDate() + 1));
      this.WHstartDate = new Date(this.WHstartDate.setDate(this.WHstartDate.getDate() + 1));
    }

    this.WHupdateChart(this.WHstartDate, this.WHendDate);
  }
  formatDate(date: Date, fullYear: boolean = false): string {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
    if (fullYear) {
      options.year = 'numeric';
    }
    return date.toLocaleDateString(this.isPortuguese ? 'pt-PT' : 'en-GB', options);
  }  
  formatTime(valueInMinutes: number): string {
    const totalSeconds = Math.round(valueInMinutes * 60); // Convert minutes to total seconds for calculation
    const minutes = Math.floor(totalSeconds / 60); // Calculate minutes
    const seconds = totalSeconds % 60; // Calculate remaining seconds
  
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    const formattedSeconds = seconds < 10 ? '0' + seconds : seconds;
  
    return `${formattedMinutes} min & ${formattedSeconds} sec`;
  }
  

  goBack(): void {
    this.navCtrl.back();
  }
}
