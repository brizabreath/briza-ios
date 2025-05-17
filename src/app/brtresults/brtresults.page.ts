import { Component, ViewChild, ElementRef, AfterViewInit, Input } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { GlobalService } from '../services/global.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router'; // Import RouterModule

Chart.register(...registerables);

@Component({
  selector: 'app-brtresults',
  templateUrl: './brtresults.page.html',
  styleUrls: ['./brtresults.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class BrtresultsPage implements AfterViewInit {
  constructor(private navCtrl: NavController, private globalService: GlobalService) {}

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  BRTchart: any;
  BRTdataArray: ReadonlyArray<{ date: Date; result: number }> = [];
  BRTstartDate!: Date;
  BRTendDate!: Date;
  fixedLatestDate!: Date;
  BRTchartData: number[] = [];
  BRTselectedDataDates: string[] = [];
  BRTmaxYValue: number = 10;
  isPortuguese = localStorage.getItem('isPortuguese') === 'true';
  latestTest: { result: number, date: string } = { result: 0, date: '' };
  longestTest: { result: number, date: string } = { result: 0, date: '' };
  totalTests: number = 0;

  ngAfterViewInit(): void {
    this.loadDataFromLocalStorage();
    this.setDateRange();
    this.initializeChart();
    this.setupScrolling();
    this.calculateOverviewData();
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
    const data = JSON.parse(localStorage.getItem('brtResults') || '[]');
    this.BRTdataArray = Object.freeze(
      data.map((item: any) => ({
        date: Object.freeze(new Date(item.date)),
        result: this.parseTimeToSeconds(item.result)
      }))
    );
    this.fixedLatestDate = this.BRTdataArray.length > 0
      ? new Date(this.BRTdataArray[this.BRTdataArray.length - 1].date)
      : new Date();
  }

  parseTimeToSeconds(timeString: string): number {
    const [minutes, seconds] = timeString.split(' : ').map(Number);
    return minutes * 60 + seconds;
  }

  setDateRange(): void {
    const lastResultDate = this.BRTdataArray.length > 0
      ? new Date(this.BRTdataArray[this.BRTdataArray.length - 1].date)
      : new Date();

    this.BRTendDate = new Date(lastResultDate);
    this.BRTstartDate = new Date(this.BRTendDate);
    this.BRTstartDate.setDate(this.BRTendDate.getDate() - 6);
  }

  calculateOverviewData() {
    if (this.BRTdataArray.length === 0) {
      this.latestTest = { result: 0, date: '' };
      this.longestTest = { result: 0, date: '' };
      this.totalTests = 0;
      return;
    }

    this.totalTests = this.BRTdataArray.length;
    const latestEntry = this.BRTdataArray[this.BRTdataArray.length - 1];
    this.latestTest = {
      result: latestEntry.result,
      date: new Date(latestEntry.date).toLocaleDateString(this.isPortuguese ? 'pt-PT' : 'en-GB')
    };

    const longestEntry = this.BRTdataArray.reduce((max, current) =>
      current.result > max.result ? current : max
    );
    this.longestTest = {
      result: longestEntry.result,
      date: new Date(longestEntry.date).toLocaleDateString(this.isPortuguese ? 'pt-PT' : 'en-GB')
    };
  }

  getFeedbackText(): string {
    const latestResult = this.latestTest.result;
    if (this.isPortuguese) {
      if (latestResult <= 15) {
        return 'Com base no seu último teste (' + latestResult + ' segundos), parece que sua resistência ao CO2 é muito baixa.<br><br>'
             + 'Você pode ter dificuldades para ter uma boa noite de sono, respiração pela boca frequente, acordar com a boca seca, bocejar frequentemente e baixos níveis de energia durante o dia.<br><br>'
             + 'É recomendado que você se concentre em estabelecer uma rotina do Programa Briza para melhorar sua aptidão física e bem-estar.';
      } else if (latestResult <= 25) {
        return 'Com base no seu último teste (' + latestResult + ' segundos), sua resistência ao CO2 é relativamente boa.<br><br>'
             + 'Provavelmente você está respirando principalmente pelo nariz na maior parte do tempo e desfrutando de um sono tranquilo. Seus níveis de energia e concentração são geralmente satisfatórios.<br><br>'
             + 'É recomendado que você estabeleça uma rotina do Programa Briza para melhorar a eficiência da sua respiração e obter melhores resultados.';
      } else {
        return 'Com base no seu último teste (' + latestResult + ' segundos), sua resistência ao CO2 é excelente.<br><br>'
             + 'Você provavelmente está experimentando os benefícios de uma respiração eficiente, incluindo sono restaurador, altos níveis de energia e boa concentração.<br><br>'
             + 'É recomendado que você estabeleça uma rotina do Programa Briza para alcançar resultados ainda melhores e se sentir ilimitado.';
      }
    } else {
      if (latestResult <= 15) {
        return 'Based on your latest test (' + latestResult + ' seconds), it seems that your resilience to CO2 is very low.<br><br>'
             + 'You may experience difficulties getting a good night\'s sleep, frequent mouth breathing, waking up with a dry mouth, frequent yawning, and low energy levels during the day.<br><br>'
             + 'It is recommended that you focus on establishing a Briza Program routine to improve your fitness and well-being.';
      } else if (latestResult <= 25) {
        return 'Based on your latest test (' + latestResult + ' seconds), your resilience to CO2 is relatively good.<br><br>'
             + 'You are likely breathing through your nose most of the time and enjoying restful sleep. Your energy levels and concentration are generally satisfactory.<br><br>'
             + 'It is recommended that you establish a Briza Program routine to improve your breathing efficiency and gain better results.';
      } else {
        return 'Based on your latest test (' + latestResult + ' seconds), your resilience to CO2 is excellent.<br><br>'
             + 'You are likely experiencing the benefits of efficient breathing, including restorative sleep, high energy levels, and good focus.<br><br>'
             + 'It is recommended that you establish a Briza Program routine to achieve even better results and feel limitless.';
      }
    }
  }

  initializeChart(): void {
    const context = this.chartCanvas.nativeElement.getContext('2d');
    if (context) {
      this.BRTchart = new Chart(context, {
        type: 'bar',
        data: {
          labels: this.BRTselectedDataDates,
          datasets: [
            {
              backgroundColor: '#49B79D',
              data: this.BRTchartData,
              barPercentage: 0.6,
              categoryPercentage: 0.8,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: this.getChartTitle(),
              font: { size: 14 },
              color: '#0661AA'
            },
            tooltip: {
              displayColors: false,
              callbacks: {
                title: () => (this.isPortuguese ? 'Média do dia' : 'Average Score on'),
                label: (tooltipItem: any) =>
                  `${this.BRTselectedDataDates[tooltipItem.dataIndex]}: ${this.BRTchartData[tooltipItem.dataIndex].toFixed(0)} seconds`
              }
            },
          },
          scales: {
            x: { ticks: { color: '#0661AA' }, grid: { display: false } },
            y: { beginAtZero: true, max: this.BRTmaxYValue, ticks: { stepSize: 5, color: '#0661AA' } }
          }
        }
      });
      this.updateChart(this.BRTstartDate, this.BRTendDate);
    } else {
      console.error('Failed to acquire 2D context for the chart');
    }
  }

  BRTupdateChartData(BRTstartDate: Date, BRTendDate: Date): { BRTchartData: number[], BRTmaxYValue: number, BRTselectedDataDates: string[] } {
    const BRTdateRange: Date[] = [];
    let BRTcurrentDate = new Date(BRTstartDate);

    while (BRTcurrentDate <= BRTendDate) {
      BRTdateRange.push(new Date(BRTcurrentDate));
      BRTcurrentDate.setDate(BRTcurrentDate.getDate() + 1);
    }

    const BRTaggregatedData: { [key: string]: { BRTtotalValue: number, count: number } } = {};
    this.BRTdataArray.forEach(BRTresultData => {
      const BRTresultDate = new Date(BRTresultData.date);
      if (BRTresultDate < BRTstartDate || BRTresultDate > BRTendDate) return;

      const BRTseconds = BRTresultData.result || 0;
      const BRTformattedDate = this.formatDate(BRTresultDate);

      if (!BRTaggregatedData[BRTformattedDate]) {
        BRTaggregatedData[BRTformattedDate] = { BRTtotalValue: BRTseconds, count: 1 };
      } else {
        BRTaggregatedData[BRTformattedDate].BRTtotalValue += BRTseconds;
        BRTaggregatedData[BRTformattedDate].count++;
      }
    });

    const BRTchartData = BRTdateRange.map(date => {
      const BRTformattedDate = this.formatDate(date);
      const aggregatedDatum = BRTaggregatedData[BRTformattedDate];
      return aggregatedDatum ? aggregatedDatum.BRTtotalValue / aggregatedDatum.count : 0;
    });

    const BRTmaxYValue = Math.max(...BRTchartData) > 2 
    ? Math.ceil(Math.max(...BRTchartData) / 10) * 10 
    : 10;
    const BRTselectedDataDates = BRTdateRange.map(date => this.formatDate(date));

    return { BRTchartData, BRTmaxYValue, BRTselectedDataDates };
  }

  updateChart(BRTstartDate: Date, BRTendDate: Date): void {
    const { BRTchartData, BRTmaxYValue, BRTselectedDataDates } = this.BRTupdateChartData(BRTstartDate, BRTendDate);
    this.BRTselectedDataDates = BRTselectedDataDates;
    this.BRTchartData = BRTchartData;
    this.BRTmaxYValue = BRTmaxYValue;
    this.BRTchart.data.labels = this.BRTselectedDataDates;
    this.BRTchart.data.datasets[0].data = this.BRTchartData;
    this.BRTchart.options.scales.y.max = this.BRTmaxYValue;
    this.BRTchart.options.plugins.title.text = this.getChartTitle();
    this.BRTchart.update();
  }

  getChartTitle(): string {
    const year = this.BRTendDate.getFullYear();
    return this.isPortuguese
      ? `Seus resultados de TRB em segundos (${year})`
      : `Your BRT results in seconds (${year})`;
  }

  setupScrolling(): void {
    let lastScrollX = 0;

    this.chartCanvas.nativeElement.addEventListener('touchstart', (event: TouchEvent) => {
      lastScrollX = event.touches[0].clientX;
    });

    this.chartCanvas.nativeElement.addEventListener('touchmove', (event: TouchEvent) => {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - lastScrollX;
      this.handleScroll(-deltaX);
      lastScrollX = event.touches[0].clientX;
    });

    this.chartCanvas.nativeElement.addEventListener('wheel', (event: WheelEvent) => {
      this.handleScroll(-event.deltaX);
    });
  }

  handleScroll(deltaX: number): void {
    const scrollSpeedFactor = 5;
    const dayShift = deltaX / scrollSpeedFactor;

    if (dayShift < -0.5 && this.BRTstartDate > this.BRTdataArray[0]?.date) {
        this.BRTendDate = new Date(this.BRTendDate.setDate(this.BRTendDate.getDate() - 1));
        this.BRTstartDate = new Date(this.BRTstartDate.setDate(this.BRTstartDate.getDate() - 1));
    } else if (dayShift > 0.5 && this.BRTendDate < this.fixedLatestDate) {
        this.BRTendDate = new Date(this.BRTendDate.setDate(this.BRTendDate.getDate() + 1));
        this.BRTstartDate = new Date(this.BRTstartDate.setDate(this.BRTstartDate.getDate() + 1));
    }

    this.updateChart(this.BRTstartDate, this.BRTendDate);
  }

  formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
    return date.toLocaleDateString(this.isPortuguese ? 'pt-PT' : 'en-GB', options);
  }

  goBack(): void {
    this.navCtrl.back();
  }
}
