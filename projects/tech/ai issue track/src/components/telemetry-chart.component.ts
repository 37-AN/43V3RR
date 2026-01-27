import { Component, ElementRef, input, effect, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricPoint } from '../services/telemetry.service';

declare const d3: any;

@Component({
  selector: 'app-telemetry-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-full flex flex-col">
      <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{{ title() }}</h3>
      <div #chartContainer class="flex-grow w-full min-h-[150px]"></div>
    </div>
  `
})
export class TelemetryChartComponent {
  title = input.required<string>();
  color = input<string>('#3b82f6'); // Tailwind blue-500
  data = input.required<MetricPoint[]>();

  @ViewChild('chartContainer') chartContainer!: ElementRef;

  constructor() {
    effect(() => {
      const dataPoints = this.data();
      if (this.chartContainer && dataPoints.length > 0) {
        this.renderChart(dataPoints);
      }
    });
  }

  renderChart(data: MetricPoint[]) {
    const el = this.chartContainer.nativeElement;
    el.innerHTML = ''; // Clear previous

    const margin = { top: 10, right: 10, bottom: 20, left: 30 };
    const width = el.clientWidth - margin.left - margin.right;
    const height = el.clientHeight - margin.top - margin.bottom;

    if (width <= 0 || height <= 0) return;

    const svg = d3.select(el)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale
    const x = d3.scaleTime()
      .domain(d3.extent(data, (d: any) => d.time))
      .range([0, width]);

    // Y Scale
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d: any) => d.value) * 1.1])
      .range([height, 0]);

    // Line
    const line = d3.line()
      .curve(d3.curveMonotoneX)
      .x((d: any) => x(d.time))
      .y((d: any) => y(d.value));

    // Area (Gradient)
    const area = d3.area()
      .curve(d3.curveMonotoneX)
      .x((d: any) => x(d.time))
      .y0(height)
      .y1((d: any) => y(d.value));

    // Gradient Defs
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'area-gradient-' + this.title())
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    
    gradient.append('stop').attr('offset', '0%').attr('stop-color', this.color()).attr('stop-opacity', 0.4);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', this.color()).attr('stop-opacity', 0);

    // Draw Area
    svg.append('path')
      .datum(data)
      .attr('fill', `url(#area-gradient-${this.title()})`)
      .attr('d', area);

    // Draw Line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', this.color())
      .attr('stroke-width', 2)
      .attr('d', line);

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat('%H:%M:%S')))
      .attr('color', '#6b7280')
      .style('font-size', '8px');

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .attr('color', '#6b7280')
      .style('font-size', '8px');
  }
}