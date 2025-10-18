"use client";

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface ChartRendererProps {
  data: any;
  type: string;
  title?: string;
  className?: string;
  graph_type?: string;
}

export default function ChartRenderer({ data, type, title, className = "", graph_type }: ChartRendererProps) {
  const { theme } = useTheme();

  // Get theme-specific colors
  const getThemeColors = () => {
    if (theme === 'dark') {
      return {
        background: '#1a1a1a',
        text: '#ffffff',
        grid: '#374151',
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1']
      };
    } else {
      return {
        background: '#ffffff',
        text: '#1f2937',
        grid: '#e5e7eb',
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1']
      };
    }
  };

  const themeColors = getThemeColors();

  // Helper function to get X-axis key from data
  const getXAxisKey = (data: any[]) => {
    if (!data || data.length === 0) return 'name';
    const firstItem = data[0];
    const possibleKeys = ['sales_month', 'item_name', 'category_name', 'name', 'label', 'x', 'date', 'month', 'year', 'category', 'product', 'employee', 'department'];
    const foundKey = possibleKeys.find(key => firstItem.hasOwnProperty(key)) || 'name';
    console.log('🔍 X-axis key detection:', { firstItem, possibleKeys, foundKey });
    return foundKey;
  };

  // Helper function to get Y-axis key from data
  const getYAxisKey = (data: any[]) => {
    if (!data || data.length === 0) return 'value';
    const firstItem = data[0];
    const possibleKeys = ['total_sales', 'value', 'y', 'count', 'amount', 'quantity', 'revenue', 'sales', 'price', 'cost', 'profit'];
    const foundKey = possibleKeys.find(key => firstItem.hasOwnProperty(key)) || 'value';
    console.log('🔍 Y-axis key detection:', { firstItem, possibleKeys, foundKey });
    return foundKey;
  };

  const renderChart = () => {
    console.log('🎨 ChartRenderer renderChart called:', { data, type, graph_type, title });
    console.log('🔍 Data type check:', { 
      dataType: typeof data, 
      isArray: Array.isArray(data), 
      dataLength: data?.length,
      firstItem: data?.[0],
      dataKeys: data?.[0] ? Object.keys(data[0]) : []
    });
    
    if (!data || !Array.isArray(data)) {
      console.log('❌ No data or not array:', { data, isArray: Array.isArray(data) });
      return (
        <div className="flex items-center justify-center h-full text-neutral-400">
          No data available
        </div>
      );
    }

    if (data.length === 0) {
      console.log('❌ Empty data array');
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-xl font-semibold text-gray-300 mb-2">No Data Available</div>
          <div className="text-sm text-gray-500 text-center max-w-xs">
            The chart is ready to display your data. Ask a question to generate visualizations.
          </div>
        </div>
      );
    }

    const xAxisKey = getXAxisKey(data);
    const yAxisKey = getYAxisKey(data);
    const chartType = graph_type || type;

    console.log('📊 Chart configuration:', { xAxisKey, yAxisKey, chartType, dataLength: data.length });
    console.log('📊 Sample data item:', data[0]);
    
    // TEST: Create a simple test chart to verify rendering
    if (data.length > 0 && data[0][xAxisKey] && data[0][yAxisKey]) {
      console.log('✅ Data validation passed - should render chart');
    } else {
      console.log('❌ Data validation failed:', { 
        hasXKey: data[0][xAxisKey], 
        hasYKey: data[0][yAxisKey], 
        xAxisKey, 
        yAxisKey 
      });
      
      // EMERGENCY FALLBACK: Create test data to verify chart rendering
      console.log('🚨 Creating test data to verify chart rendering');
      const testData = [
        { name: 'Test 1', value: 100 },
        { name: 'Test 2', value: 200 },
        { name: 'Test 3', value: 150 }
      ];
      
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={testData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
            <XAxis dataKey="name" tick={{ fill: themeColors.text }} />
            <YAxis tick={{ fill: themeColors.text }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: themeColors.background, 
                border: `1px solid ${themeColors.grid}`,
                color: themeColors.text,
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="value" fill={themeColors.colors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    switch (chartType.toLowerCase()) {
      case 'bar':
      case 'barchart':
      case 'column':
      case 'groupedbarchart':
      case 'grouped_bar':
      case 'grouped_bar_chart':
        console.log('📊 Rendering Animated BarChart with:', { data, xAxisKey, yAxisKey, themeColors });
        console.log('🔍 BarChart data sample:', data.slice(0, 3));
        console.log('🔍 BarChart keys:', { xAxisKey, yAxisKey });
        
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} opacity={0.3} />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                tickLine={{ stroke: themeColors.grid }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                tickLine={{ stroke: themeColors.grid }}
                tickFormatter={(value) => `₹${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: themeColors.background, 
                  border: `1px solid ${themeColors.grid}`,
                  color: themeColors.text,
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  fontSize: '14px'
                }}
                animationDuration={200}
                formatter={(value, name) => [`₹${Number(value).toLocaleString()}`, name]}
              />
              <Legend />
              <Bar 
                dataKey={yAxisKey} 
                fill={themeColors.colors[0]}
                radius={[8, 8, 0, 0]}
                animationBegin={0}
                animationDuration={1500}
                animationEasing="ease-out"
                stroke={themeColors.colors[0]}
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
      case 'linechart':
      case 'line_chart':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} opacity={0.3} />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                tickLine={{ stroke: themeColors.grid }}
              />
              <YAxis 
                tick={{ fill: themeColors.text, fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: themeColors.grid, strokeWidth: 2 }}
                tickLine={{ stroke: themeColors.grid }}
                tickFormatter={(value) => `₹${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: themeColors.background, 
                  border: `1px solid ${themeColors.grid}`,
                  color: themeColors.text,
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  fontSize: '14px'
                }}
                animationDuration={200}
                formatter={(value, name) => [`₹${Number(value).toLocaleString()}`, name]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={yAxisKey} 
                stroke={`url(#lineGradient-${yAxisKey})`}
                strokeWidth={4}
                dot={{ fill: themeColors.colors[0], strokeWidth: 3, r: 6 }}
                activeDot={{ r: 8, stroke: themeColors.colors[0], strokeWidth: 3, fill: '#fff' }}
                animationBegin={0}
                animationDuration={2000}
                animationEasing="ease-out"
              />
              <defs>
                <linearGradient id={`lineGradient-${yAxisKey}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={themeColors.colors[0]} stopOpacity={0.8}/>
                  <stop offset="50%" stopColor={themeColors.colors[1] || themeColors.colors[0]} stopOpacity={0.9}/>
                  <stop offset="100%" stopColor={themeColors.colors[2] || themeColors.colors[0]} stopOpacity={0.8}/>
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'piechart':
      case 'pie_chart':
      case 'donut':
      case 'donutchart':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                innerRadius={chartType.toLowerCase().includes('donut') ? 40 : 0}
                fill="#8884d8"
                dataKey={yAxisKey}
                animationBegin={0}
                animationDuration={2000}
                animationEasing="ease-out"
                paddingAngle={2}
                cornerRadius={8}
              >
                {data.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#pieGradient-${index})`}
                    stroke={themeColors.background}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: themeColors.background, 
                  border: `1px solid ${themeColors.grid}`,
                  color: themeColors.text,
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  fontSize: '14px'
                }}
                animationDuration={200}
                formatter={(value, name) => [`₹${Number(value).toLocaleString()}`, name]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', fontWeight: 500 }}
              />
              <defs>
                {data.map((entry: any, index: number) => (
                  <linearGradient key={`pieGradient-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={themeColors.colors[index % themeColors.colors.length]} stopOpacity={0.9}/>
                    <stop offset="100%" stopColor={themeColors.colors[index % themeColors.colors.length]} stopOpacity={0.6}/>
                  </linearGradient>
                ))}
              </defs>
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
      case 'areachart':
      case 'area_chart':
      case 'stackedarea':
      case 'stacked_area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fill: themeColors.text }}
                axisLine={{ stroke: themeColors.grid }}
              />
              <YAxis 
                tick={{ fill: themeColors.text }}
                axisLine={{ stroke: themeColors.grid }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: themeColors.background, 
                  border: `1px solid ${themeColors.grid}`,
                  color: themeColors.text,
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey={yAxisKey} 
                stroke={themeColors.colors[0]} 
                fill={themeColors.colors[0]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'summary_card':
      case 'summary':
        // For summary cards, show a beautiful animated single value or bar chart
        if (data.length === 1) {
          const value = data[0][yAxisKey];
          const label = data[0][xAxisKey];
          return (
            <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
              <div className="relative">
                <div className="text-8xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-4 animate-pulse">
                  {typeof value === 'number' ? `₹${value.toLocaleString()}` : value}
                </div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
              </div>
              <div className="text-2xl text-gray-300 capitalize font-medium animate-slide-up">
                {label || 'Value'}
              </div>
              <div className="mt-4 w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
            </div>
          );
        } else {
          // For multiple data points, use an animated bar chart
          console.log('📊 Rendering Summary Card as Animated BarChart with:', { data, xAxisKey, yAxisKey, themeColors });
          return (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} opacity={0.3} />
                <XAxis 
                  dataKey={xAxisKey} 
                  tick={{ fill: themeColors.text, fontSize: 12 }}
                  axisLine={{ stroke: themeColors.grid }}
                  tickLine={{ stroke: themeColors.grid }}
                />
                <YAxis 
                  tick={{ fill: themeColors.text, fontSize: 12 }}
                  axisLine={{ stroke: themeColors.grid }}
                  tickLine={{ stroke: themeColors.grid }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: themeColors.background, 
                    border: `1px solid ${themeColors.grid}`,
                    color: themeColors.text,
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                  }}
                  animationDuration={200}
                />
                <Legend />
                <Bar 
                  dataKey={yAxisKey} 
                  fill={`url(#gradient-${yAxisKey})`} 
                  radius={[8, 8, 0, 0]}
                  animationBegin={0}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
                <defs>
                  <linearGradient id={`gradient-${yAxisKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={themeColors.colors[0]} stopOpacity={0.8}/>
                    <stop offset="100%" stopColor={themeColors.colors[0]} stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          );
        }

      default:
        console.log('⚠️ Unsupported chart type, falling back to bar chart:', chartType);
        console.log('🔍 Fallback data:', { data, xAxisKey, yAxisKey });
        
        // Simple fallback that will definitely render
        if (data.length === 0) {
          return (
            <div className="flex items-center justify-center h-full text-red-400">
              No data to display
            </div>
          );
        }
        
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fill: themeColors.text }}
                axisLine={{ stroke: themeColors.grid }}
              />
              <YAxis 
                tick={{ fill: themeColors.text }}
                axisLine={{ stroke: themeColors.grid }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: themeColors.background, 
                  border: `1px solid ${themeColors.grid}`,
                  color: themeColors.text,
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey={yAxisKey} fill={themeColors.colors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 1s ease-out 0.3s both;
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-ping {
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .chart-container {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
      `}</style>
      {title && (
        <h3 className="text-lg font-semibold text-white mb-4 text-center dark:text-white light:text-gray-800 animate-fade-in">
          {title}
        </h3>
      )}
      <div className="w-full h-full min-h-[200px] chart-container">
        {renderChart()}
      </div>
      {/* DEBUG INFO - Remove this in production */}
      <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-300">
        <div>Data: {JSON.stringify(data?.slice(0, 2))}</div>
        <div>Type: {type} | Graph Type: {graph_type}</div>
      </div>
    </div>
  );
}