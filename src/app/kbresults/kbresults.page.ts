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
  selector: 'app-kbresults',
  templateUrl: './kbresults.page.html',
  styleUrls: ['./kbresults.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class KBresultsPage implements AfterViewInit {
  constructor(private navCtrl: NavController, private globalService: GlobalService) {}

  @ViewChild('KBchartCanvas') KBchartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('KBchartContainer') KBchartContainer!: ElementRef<HTMLDivElement>;
  KBChart: any;
  KBDataArray: ReadonlyArray<{ date: Date; roundsResult: number[], rounds: number }> = [];
  KBstartDate!: Date;
  KBendDate!: Date;
  KBfixedLatestDate!: Date;
  KBchartData: { average: number[], longest: number[] } = { average: [], longest: [] };
  KBselectedDataDates: string[] = [];
  KBmaxYValue: number = 1;
  KBlongestSessionAverage: string = '';
  KBlongestSessionAverageDate: string = '';
  KBlongestRound: string = '';
  KBlongestRoundDate: string = '';
  KBtotalSessions: number = 0;
  KBhasData: boolean = false;
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';


  ngAfterViewInit(): void {
    this.KBloadDataFromLocalStorage();
    if (this.KBhasData) {
      this.KBsetDateRange();
      this.KBinitializeChart();
      this.KBsetupScrolling();
      this.KBcalculateOverviewData();
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

  KBloadDataFromLocalStorage(): void {
    const data = JSON.parse(localStorage.getItem('KBResults') || '[]');
    if(data.length > 0){
      this.KBhasData = true;
      this.KBchartContainer.nativeElement.style.display = 'block'
    }else{
      this.KBhasData = false;
      this.KBchartContainer.nativeElement.style.display = 'none'
    }
  
    this.KBDataArray = Object.freeze(
      data.map((item: any) => ({
        date: Object.freeze(new Date(item.date)),
        roundsResult: Object.freeze(item.roundsResult),
        rounds: item.rounds
      }))
    );
    
    this.KBfixedLatestDate = this.KBDataArray.length > 0
      ? new Date(this.KBDataArray[this.KBDataArray.length - 1].date)
      : new Date();
  }
  

  KBsetDateRange(): void {
    const lastResultDate = this.KBDataArray.length > 0
      ? new Date(this.KBDataArray[this.KBDataArray.length - 1].date)
      : new Date();

    this.KBendDate = new Date(lastResultDate);
    this.KBstartDate = new Date(this.KBendDate);
    this.KBstartDate.setDate(this.KBendDate.getDate() - 6);
  }

  KBcalculateOverviewData() {
    if (this.KBDataArray.length === 0) {
      this.KBlongestSessionAverage = '';
      this.KBlongestSessionAverageDate = '';
      this.KBlongestRound = '';
      this.KBlongestRoundDate = '';
      this.KBtotalSessions = 0;
      return;
    }
  
    this.KBtotalSessions = this.KBDataArray.length; // Total number of sessions (entries)
  
    // Find the latest longest round
    const allRoundsWithDates = this.KBDataArray.map(entry => ({
      round: Math.max(...entry.roundsResult),
      date: entry.date
    }));
    const longestRoundEntry = allRoundsWithDates.reduce((max, entry) =>
      entry.round > max.round || (entry.round === max.round && entry.date > max.date) ? entry : max
    );
    this.KBlongestRound = this.formatTime(longestRoundEntry.round/60);
    this.KBlongestRoundDate = this.formatDate(longestRoundEntry.date, true);
  
    // Calculate lifetime average (average of all rounds ever recorded)
      let totalHoldTime = 0;
      let totalRounds = 0;

      this.KBDataArray.forEach(entry => {
        totalHoldTime += entry.roundsResult.reduce((a, b) => a + b, 0);
        totalRounds += entry.roundsResult.length;
      });

      const lifetimeAverageSeconds = totalRounds > 0 ? totalHoldTime / totalRounds : 0;
      this.KBlongestSessionAverage = this.formatTime(lifetimeAverageSeconds / 60);
      this.KBlongestSessionAverageDate = '';

  }  

  KBinitializeChart(): void {
    const context = this.KBchartCanvas.nativeElement.getContext('2d');
    if (context) {
      this.KBChart = new Chart(context, {
        type: 'bar',
        data: {
          labels: this.KBselectedDataDates,
          datasets: [
            {
              label: this.isPortuguese ? 'Média do Dia' : 'Day Average',
              backgroundColor: '#49B79D',
              data: this.KBchartData.average,
              barPercentage: 0.5,
              categoryPercentage: 0.8,
            },
            {
              label: this.isPortuguese ? 'Maior Rodada' : 'Longest Round',
              backgroundColor: '#0661AA',
              data: this.KBchartData.longest,
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
              text: this.KBgetChartTitle(),
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
                  `${this.KBselectedDataDates[tooltipItem.dataIndex]}: ${this.formatTime(tooltipItem.raw)}`
              }
            },
          },
          scales: {
            x: { ticks: { color: '#0661AA' }, grid: { display: false } },
            y: { beginAtZero: true, max: this.KBmaxYValue, ticks: { stepSize: 1, color: '#0661AA' } }
          }
        }
      });
      this.KBupdateChart(this.KBstartDate, this.KBendDate);
    } else {
      console.error('Failed to acquire 2D context for the chart');
    }
  }

  KBupdateChart(KBstartDate: Date, KBendDate: Date): void {
    const { KBchartData, KBmaxYValue, KBselectedDataDates } = this.KBupdateChartData(KBstartDate, KBendDate);
    this.KBselectedDataDates = KBselectedDataDates;
    this.KBchartData = KBchartData;
    this.KBmaxYValue = KBmaxYValue;
    this.KBChart.data.labels = this.KBselectedDataDates;
    this.KBChart.data.datasets[0].data = this.KBchartData.average;
    this.KBChart.data.datasets[1].data = this.KBchartData.longest;
    this.KBChart.options.scales.y.max = this.KBmaxYValue;
    this.KBChart.options.plugins.title.text = this.KBgetChartTitle();
    this.KBChart.update();
  }

  KBupdateChartData(KBstartDate: Date, KBendDate: Date): { KBchartData: { average: number[], longest: number[] }, KBmaxYValue: number, KBselectedDataDates: string[] } {
    const dateRange: Date[] = [];
    let currentDate = new Date(KBstartDate);
  
    while (currentDate <= KBendDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  
    const aggregatedData: { [key: string]: { totalValue: number, count: number, maxRound: number } } = {};
    
    // Aggregate data by date
    this.KBDataArray.forEach(whResult => {
      const resultDate = new Date(whResult.date);
      if (resultDate < KBstartDate || resultDate > KBendDate) return;
  
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
  
    const KBselectedDataDates = dateRange.map(date => this.formatDate(date)); // For chart, using "dd/mm"
  
    return { KBchartData: { average: averageData, longest: longestData }, KBmaxYValue: maxMinutes, KBselectedDataDates };
  }
  
  
  
  KBgetChartTitle(): string {
    const year = this.KBendDate.getFullYear();
    return this.isPortuguese
      ? `Seus resultados de Hiperventilação Guiada (${year})`
      : `Your Oxygen Boost results (${year})`;
  }

  KBsetupScrolling(): void {
    let lastScrollX = 0;

    this.KBchartCanvas.nativeElement.addEventListener('touchstart', (event: TouchEvent) => {
      lastScrollX = event.touches[0].clientX;
    });

    this.KBchartCanvas.nativeElement.addEventListener('touchmove', (event: TouchEvent) => {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - lastScrollX;
      this.KBhandleScroll(-deltaX);
      lastScrollX = event.touches[0].clientX;
    });

    this.KBchartCanvas.nativeElement.addEventListener('wheel', (event: WheelEvent) => {
      this.KBhandleScroll(-event.deltaX);
    });
  }

  KBhandleScroll(deltaX: number): void {
    const scrollSpeedFactor = 5;
    const dayShift = deltaX / scrollSpeedFactor;

    if (dayShift < -0.5 && this.KBstartDate > this.KBDataArray[0]?.date) {
      this.KBendDate = new Date(this.KBendDate.setDate(this.KBendDate.getDate() - 1));
      this.KBstartDate = new Date(this.KBstartDate.setDate(this.KBstartDate.getDate() - 1));
    } else if (dayShift > 0.5 && this.KBendDate < this.KBfixedLatestDate) {
      this.KBendDate = new Date(this.KBendDate.setDate(this.KBendDate.getDate() + 1));
      this.KBstartDate = new Date(this.KBstartDate.setDate(this.KBstartDate.getDate() + 1));
    }

    this.KBupdateChart(this.KBstartDate, this.KBendDate);
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
  
    return `${formattedMinutes} min : ${formattedSeconds} sec`;
  }
  

  goBack(): void {
    this.navCtrl.back();
  }
}
