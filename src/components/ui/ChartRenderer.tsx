"use client";

import { useEffect, useRef } from "react";

interface ChartRendererProps {
  data: any;
  type: string;
  title?: string;
  className?: string;
}

export default function ChartRenderer({ data, type, title, className = "" }: ChartRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    // Clear previous content
    chartRef.current.innerHTML = "";

    try {
      // Create a simple chart based on the data
      if (type === "bar" || type === "column") {
        createBarChart(data, chartRef.current);
      } else if (type === "line") {
        createLineChart(data, chartRef.current);
      } else if (type === "pie") {
        createPieChart(data, chartRef.current);
      } else if (type === "area") {
        createAreaChart(data, chartRef.current);
      } else {
        // Default to table view
        createTable(data, chartRef.current);
      }
    } catch (error) {
      console.error("Error rendering chart:", error);
      chartRef.current.innerHTML = `<div class="text-center text-neutral-400 p-4">Error rendering chart</div>`;
    }
  }, [data, type]);

  return (
    <div className={`w-full h-full ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-white mb-4 text-center">{title}</h3>
      )}
      <div ref={chartRef} className="w-full h-full min-h-[200px]" />
    </div>
  );
}

function createBarChart(data: any, container: HTMLElement) {
  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div class="text-center text-neutral-400 p-4">No data available</div>';
    return;
  }

  const maxValue = Math.max(...data.map((item: any) => item.value || item.count || 0));
  const chartHeight = 200;
  const barWidth = Math.max(20, (container.clientWidth - 40) / data.length - 4);

  let html = '<div class="flex items-end justify-center gap-1 h-48" style="height: 200px;">';
  
  data.forEach((item: any, index: number) => {
    const value = item.value || item.count || 0;
    const height = (value / maxValue) * chartHeight;
    const label = item.label || item.name || `Item ${index + 1}`;
    
    html += `
      <div class="flex flex-col items-center group">
        <div 
          class="bg-gradient-to-t from-primary to-accent rounded-t transition-all duration-300 hover:from-primary-dark hover:to-accent-light cursor-pointer"
          style="width: ${barWidth}px; height: ${height}px; min-height: 4px;"
          title="${label}: ${value}"
        ></div>
        <div class="text-xs text-neutral-400 mt-2 text-center max-w-16 truncate" title="${label}">
          ${label}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function createLineChart(data: any, container: HTMLElement) {
  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div class="text-center text-neutral-400 p-4">No data available</div>';
    return;
  }

  const maxValue = Math.max(...data.map((item: any) => item.value || item.count || 0));
  const minValue = Math.min(...data.map((item: any) => item.value || item.count || 0));
  const chartHeight = 200;
  const chartWidth = container.clientWidth - 40;
  const stepX = chartWidth / (data.length - 1);

  let pathData = '';
  data.forEach((item: any, index: number) => {
    const value = item.value || item.count || 0;
    const x = index * stepX;
    const y = chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
    pathData += `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  });

  let html = `
    <div class="relative" style="height: ${chartHeight}px;">
      <svg width="100%" height="100%" class="overflow-visible">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color: #00d4ff; stop-opacity: 0.8" />
            <stop offset="100%" style="stop-color: #0066ff; stop-opacity: 0.2" />
          </linearGradient>
        </defs>
        <path d="${pathData}" stroke="url(#lineGradient)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <path d="${pathData} L ${(data.length - 1) * stepX} ${chartHeight} L 0 ${chartHeight} Z" fill="url(#lineGradient)" opacity="0.1" />
      </svg>
      <div class="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-neutral-400">
        ${data.map((item: any, index: number) => 
          `<span class="text-center" style="width: ${stepX}px;">${item.label || item.name || index + 1}</span>`
        ).join('')}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

function createPieChart(data: any, container: HTMLElement) {
  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div class="text-center text-neutral-400 p-4">No data available</div>';
    return;
  }

  const total = data.reduce((sum: number, item: any) => sum + (item.value || item.count || 0), 0);
  const centerX = 100;
  const centerY = 100;
  const radius = 80;
  
  let currentAngle = 0;
  const colors = ['#00d4ff', '#0066ff', '#00ff88', '#ffaa00', '#ff4444', '#9f7aea', '#ed8936'];
  
  let html = `
    <div class="flex items-center justify-center">
      <svg width="200" height="200" class="transform -rotate-90">
        ${data.map((item: any, index: number) => {
          const value = item.value || item.count || 0;
          const percentage = value / total;
          const angle = percentage * 360;
          const endAngle = currentAngle + angle;
          
          const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180);
          const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180);
          const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
          const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
          
          const largeArcFlag = angle > 180 ? 1 : 0;
          const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
          
          const color = colors[index % colors.length];
          currentAngle = endAngle;
          
          return `<path d="${pathData}" fill="${color}" stroke="#1a1a1a" stroke-width="2" />`;
        }).join('')}
      </svg>
      <div class="ml-6 space-y-2">
        ${data.map((item: any, index: number) => {
          const value = item.value || item.count || 0;
          const percentage = ((value / total) * 100).toFixed(1);
          const color = colors[index % colors.length];
          const label = item.label || item.name || `Item ${index + 1}`;
          
          return `
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div>
              <span class="text-sm text-neutral-300">${label}</span>
              <span class="text-sm text-neutral-400">${percentage}%</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

function createAreaChart(data: any, container: HTMLElement) {
  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div class="text-center text-neutral-400 p-4">No data available</div>';
    return;
  }

  const maxValue = Math.max(...data.map((item: any) => item.value || item.count || 0));
  const minValue = Math.min(...data.map((item: any) => item.value || item.count || 0));
  const chartHeight = 200;
  const chartWidth = container.clientWidth - 40;
  const stepX = chartWidth / (data.length - 1);

  let pathData = '';
  data.forEach((item: any, index: number) => {
    const value = item.value || item.count || 0;
    const x = index * stepX;
    const y = chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
    pathData += `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  });

  let html = `
    <div class="relative" style="height: ${chartHeight}px;">
      <svg width="100%" height="100%" class="overflow-visible">
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color: #00d4ff; stop-opacity: 0.8" />
            <stop offset="100%" style="stop-color: #0066ff; stop-opacity: 0.1" />
          </linearGradient>
        </defs>
        <path d="${pathData} L ${(data.length - 1) * stepX} ${chartHeight} L 0 ${chartHeight} Z" fill="url(#areaGradient)" />
        <path d="${pathData}" stroke="#00d4ff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div class="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-neutral-400">
        ${data.map((item: any, index: number) => 
          `<span class="text-center" style="width: ${stepX}px;">${item.label || item.name || index + 1}</span>`
        ).join('')}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

function createTable(data: any, container: HTMLElement) {
  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = '<div class="text-center text-neutral-400 p-4">No data available</div>';
    return;
  }

  const headers = Object.keys(data[0] || {});
  
  let html = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-white/10">
            ${headers.map(header => `<th class="text-left py-2 px-3 text-neutral-300 font-medium">${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.slice(0, 10).map((row: any, index: number) => 
            `<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
              ${headers.map(header => `<td class="py-2 px-3 text-neutral-400">${row[header] || '-'}</td>`).join('')}
            </tr>`
          ).join('')}
        </tbody>
      </table>
      ${data.length > 10 ? `<div class="text-center text-xs text-neutral-500 mt-2">Showing 10 of ${data.length} rows</div>` : ''}
    </div>
  `;
  
  container.innerHTML = html;
}
