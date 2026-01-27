import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OHLCV, IndicatorConfig, BollingerBands, IchimokuCloud } from '../models';
import { AnalysisService } from '../services/analysis.service';

declare var Chart: any;

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-96 bg-slate-800 rounded-lg p-4 shadow-inner border border-slate-700">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`:host { display: block; }`],
  encapsulation: ViewEncapsulation.None
})
export class ChartComponent implements OnChanges {
  @Input() data: OHLCV[] = [];
  @Input() symbol: string = '';
  @Input() config!: IndicatorConfig;
  
  @ViewChild('chartCanvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  
  private chartInstance: any;
  private analysisService = inject(AnalysisService);

  ngOnChanges(changes: SimpleChanges): void {
    // Only re-render if data or config changes and config exists
    if ((changes['data'] || changes['config']) && this.config && this.data.length > 0) {
      this.renderChart();
    }
  }

  private renderChart() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet');
      return;
    }

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const ctx = this.canvas.nativeElement.getContext('2d');
    
    const labels = this.data.map(d => new Date(d.time).toLocaleDateString() + ' ' + new Date(d.time).getHours() + ':00');
    const closeData = this.data.map(d => d.close);
    
    const datasets: any[] = [
      {
        label: `${this.symbol} Price`,
        data: closeData,
        borderColor: '#38bdf8', // sky-400
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.1,
        order: 1,
        yAxisID: 'y'
      }
    ];

    // SMA Overlay
    if (this.config.showSMA) {
       const sma20 = this.analysisService.calculateSMA(this.data, 20);
       datasets.push({
         label: 'SMA 20',
         data: sma20,
         borderColor: '#facc15', // yellow-400
         borderWidth: 1,
         pointRadius: 0,
         fill: false,
         order: 2,
         yAxisID: 'y'
      });
    }

    // Bollinger Bands
    if (this.config.showBollinger) {
      const bb = this.analysisService.calculateBollingerBands(this.data, this.config.bbPeriod, this.config.bbStdDev);
      
      datasets.push({
        label: `BB Upper (${this.config.bbPeriod}, ${this.config.bbStdDev})`,
        data: bb.upper,
        borderColor: 'rgba(167, 243, 208, 0.5)', // emerald-200
        backgroundColor: 'rgba(167, 243, 208, 0.1)',
        borderWidth: 0,
        pointRadius: 0,
        fill: '+1', // Fill to next dataset (Lower)
        order: 3,
        yAxisID: 'y'
      });
      datasets.push({
        label: `BB Lower (${this.config.bbPeriod}, ${this.config.bbStdDev})`,
        data: bb.lower,
        borderColor: 'rgba(167, 243, 208, 0.5)',
        borderWidth: 0,
        pointRadius: 0,
        fill: false,
        order: 3,
        yAxisID: 'y'
      });
    }

    // Ichimoku
    if (this.config.showIchimoku) {
      const ichi = this.analysisService.calculateIchimoku(
        this.data, 
        this.config.ichiTenkan, 
        this.config.ichiKijun, 
        this.config.ichiSenkouB
      );
      
      const ichiLabel = `(T:${this.config.ichiTenkan}, K:${this.config.ichiKijun}, SB:${this.config.ichiSenkouB})`;

      datasets.push({
        label: `Tenkan ${ichiLabel}`,
        data: ichi.tenkan,
        borderColor: '#f472b6', // pink-400
        borderWidth: 1,
        pointRadius: 0,
        order: 4,
        yAxisID: 'y'
      });
      datasets.push({
        label: `Kijun ${ichiLabel}`,
        data: ichi.kijun,
        borderColor: '#818cf8', // indigo-400
        borderWidth: 1,
        pointRadius: 0,
        order: 4,
        yAxisID: 'y'
      });
      datasets.push({
        label: `Senkou A ${ichiLabel}`,
        data: ichi.senkouA,
        borderColor: 'rgba(52, 211, 153, 0.5)',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        fill: '+1',
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        order: 5,
        yAxisID: 'y'
      });
      datasets.push({
         label: `Senkou B ${ichiLabel}`,
         data: ichi.senkouB,
         borderColor: 'rgba(248, 113, 113, 0.5)',
         borderDash: [5, 5],
         borderWidth: 1,
         pointRadius: 0,
         order: 5,
        yAxisID: 'y'
      });
    }

    // Stochastic Oscillator
    if (this.config.showStochastic) {
      const stoch = this.analysisService.calculateStochastic(this.data, this.config.stochK, this.config.stochD);
      const stochLabel = `(%K: ${this.config.stochK}, %D: ${this.config.stochD})`;

      datasets.push({
        label: `Stoch %K ${stochLabel}`,
        data: stoch.k,
        borderColor: '#a3e635', // lime-400
        borderWidth: 1.5,
        pointRadius: 0,
        order: 6,
        yAxisID: 'y1'
      });
      datasets.push({
        label: `Stoch %D ${stochLabel}`,
        data: stoch.d,
        borderColor: '#fb923c', // orange-400
        borderWidth: 1.5,
        borderDash: [3, 3],
        pointRadius: 0,
        order: 6,
        yAxisID: 'y1'
      });
    }

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 }, // Disable animation for performance on updates
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            labels: { color: '#cbd5e1' }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            borderColor: '#475569',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            display: true,
            grid: { color: '#334155' },
            ticks: { color: '#94a3b8', maxTicksLimit: 8 }
          },
          y: {
            display: true,
            type: 'linear',
            position: 'left',
            grid: { color: '#334155' },
            ticks: { color: '#94a3b8' }
          },
          y1: {
             display: this.config.showStochastic,
             type: 'linear',
             position: 'right',
             min: 0,
             max: 100,
             grid: { 
               drawOnChartArea: false, // Don't draw grid for this axis
               color: '#334155' 
             }, 
             ticks: { color: '#a3e635' } // Lime color to match K line
          }
        }
      }
    });
  }
}