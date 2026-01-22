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
    const latestResult = this.latestTest.result; // seconds as number

    if (this.isPortuguese) {
      if (latestResult <= 15) {
        return `Com base no seu último teste (${latestResult} segundos), sua tolerância ao CO₂ está muito baixa<br><br>
        Possíveis efeitos: respiração pela boca, sono leve ou fragmentado, bocejos frequentes e queda de energia e foco ao longo do dia<br><br>
        Abra o Programa Briza no app e siga a rotina de hoje para aumentar sua tolerância com segurança`;
      } else if (latestResult <= 25) {
        return `Com base no seu último teste (${latestResult} segundos), sua tolerância ao CO₂ é moderada<br><br>
        Você pode alternar entre respiração nasal e bucal, às vezes desfrutando de um sono reparador e outras vezes acordando menos descansado. Energia e concentração ao longo do dia podem ser estáveis em alguns momentos, mas ainda variar em outros<br><br>
        Siga o Programa Briza projetado para seu nível para melhorar resultados, aumentar seus níveis de energia, melhor qualidade de sono e muito mais`;      } else if (latestResult <= 35) {
        return `Com base no seu último teste (${latestResult} segundos), sua tolerância ao CO₂ é boa<br><br>
        Benefícios comuns incluem sono mais reparador, energia estável e foco claro<br><br>
        Siga o Programa Briza no app para consolidar os ganhos e continuar progredindo`;
      } else {
        return `Excelente! Seu último teste (${latestResult} segundos) indica tolerância ao CO₂ muito boa<br><br>
        Isso costuma vir com recuperação eficiente, sono restaurador e alto nível de foco<br><br>
        Continue com o Programa Briza no aplicativo para melhorar resultados e atingir níveis imagináveis`;       
      }
    } else {
      if (latestResult <= 15) {
        return `Based on your latest test (${latestResult} seconds), your CO₂ tolerance is very low<br><br>
        You may notice mouth breathing, light or fragmented sleep, frequent yawning, and dips in daytime energy and focus<br><br>
        Open the Briza Program in the app and follow today's routine to build tolerance safely`;
      } else if (latestResult <= 25) {
        return `Based on your latest test (${latestResult} seconds), your CO₂ tolerance is moderate<br><br>
        You may alternate between mouth and nasal breathing, sometimes experiencing restful sleep and other times waking less refreshed. Energy and focus during the day can feel steady at times but may still fluctuate<br><br>
        Follow the Briza Program designed for your level to improve results, boost your energy levels, better quality of sleep and more`;
      }else if (latestResult <= 35) {
        return `Based on your latest test (${latestResult} seconds), your CO₂ tolerance is good<br><br>
        Common benefits include more restorative sleep, stable energy, and clear focus<br><br>
        Keep following the Briza Program in the app to consolidate gains and continue progressing`;
      } else {
        return `Excellent! Your latest test (${latestResult} seconds) indicates very good CO₂ tolerance<br><br>
        This often aligns with efficient recovery, restorative sleep, and strong focus<br><br>
        Continue with the Briza Program in the app to improve results and reach imaginable levels`;
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
