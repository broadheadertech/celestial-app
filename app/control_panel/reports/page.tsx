'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  TrendingUp,
  Download,
  Calendar,
  RefreshCw,
  ArrowLeft,
  Printer,
} from 'lucide-react';
import ControlPanelNav from '@/components/ControlPanelNav';
import Button from '@/components/ui/Button';

export default function ReportsPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState('2023');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Financial data aligned with aquarium business model
  const financialData = {
    accounts: [
      {
        category: 'Sales',
        items: [
          {
            name: 'Fish Sales - Tropical',
            jan: 85420000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 12840000, aug: 15680000, sep: 18950000, oct: 14680000, nov: 16750000, dec: 13890000
          },
          {
            name: 'Fish Sales - Marine',
            jan: 64320000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 8950000, aug: 11420000, sep: 13670000, oct: 9840000, nov: 12560000, dec: 10840000
          },
          {
            name: 'Tank Sales',
            jan: 45680000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 6840000, aug: 8950000, sep: 12460000, oct: 8760000, nov: 9840000, dec: 11230000
          },
          {
            name: 'Equipment & Accessories',
            jan: 32840000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 4820000, aug: 6150000, sep: 8940000, oct: 6420000, nov: 7680000, dec: 8460000
          },
          {
            name: 'Food & Supplements',
            jan: 18640000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 2840000, aug: 3650000, sep: 4920000, oct: 3680000, nov: 4120000, dec: 3890000
          }
        ]
      },
      {
        category: 'Cost of Goods Sold',
        items: [
          {
            name: 'Fish Procurement',
            jan: 89420000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 14680000, aug: 18420000, sep: 21840000, oct: 16420000, nov: 19680000, dec: 17350000
          },
          {
            name: 'Tank Manufacturing Cost',
            jan: 28450000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 4260000, aug: 5580000, sep: 7760000, oct: 5460000, nov: 6130000, dec: 7000000
          },
          {
            name: 'Equipment Wholesale Cost',
            jan: 21630000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 3180000, aug: 4050000, sep: 5890000, oct: 4230000, nov: 5060000, dec: 5570000
          },
          {
            name: 'Food & Supplement Cost',
            jan: 9320000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 1420000, aug: 1830000, sep: 2460000, oct: 1840000, nov: 2060000, dec: 1950000
          }
        ]
      },
      {
        category: 'Operating Expenses',
        items: [
          {
            name: 'Staff Salaries',
            jan: 18500000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 2650000, aug: 2650000, sep: 2650000, oct: 2650000, nov: 2650000, dec: 2650000
          },
          {
            name: 'Store Rent & Utilities',
            jan: 12600000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 1800000, aug: 1800000, sep: 1800000, oct: 1800000, nov: 1800000, dec: 1800000
          },
          {
            name: 'Tank Maintenance',
            jan: 8940000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 1280000, aug: 1280000, sep: 1280000, oct: 1280000, nov: 1280000, dec: 1280000
          },
          {
            name: 'Fish Care & Veterinary',
            jan: 5680000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 810000, aug: 810000, sep: 810000, oct: 810000, nov: 810000, dec: 810000
          },
          {
            name: 'Marketing & Advertising',
            jan: 4520000, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
            jul: 650000, aug: 650000, sep: 650000, oct: 650000, nov: 650000, dec: 650000
          }
        ]
      },
      {
        category: 'Delivery & Logistics',
        items: [
          {
            name: 'Fish Transport (Live)',
            jan: 8940000, feb: 0, mar: 0, apr: 0, may: 115671, jun: 0,
            jul: 1280000, aug: 1450000, sep: 1820000, oct: 1340000, nov: 1560000, dec: 1680000
          },
          {
            name: 'Tank Delivery',
            jan: 6450000, feb: 0, mar: 0, apr: 0, may: 89000, jun: 0,
            jul: 920000, aug: 1150000, sep: 1480000, oct: 1060000, nov: 1280000, dec: 1320000
          },
          {
            name: 'Packaging & Insulation',
            jan: 2840000, feb: 0, mar: 0, apr: 0, may: 42000, jun: 0,
            jul: 410000, aug: 520000, sep: 680000, oct: 480000, nov: 590000, dec: 620000
          },
          {
            name: 'Insurance & Permits',
            jan: 1680000, feb: 0, mar: 0, apr: 0, may: 24000, jun: 0,
            jul: 240000, aug: 240000, sep: 240000, oct: 240000, nov: 240000, dec: 240000
          }
        ]
      }
    ]
  };

  const calculateRowTotal = (item: any) => {
    return item.jan + item.feb + item.mar + item.apr + item.may + item.jun +
           item.jul + item.aug + item.sep + item.oct + item.nov + item.dec;
  };

  const calculateCategoryTotal = (category: any) => {
    return category.items.reduce((sum: number, item: any) => sum + calculateRowTotal(item), 0);
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    return amount.toLocaleString('en-PH');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Sales':
        return 'bg-green-500/15 text-green-300 font-semibold';
      case 'Cost of Goods Sold':
        return 'bg-red-500/15 text-red-300 font-semibold';
      case 'Operating Expenses':
        return 'bg-yellow-500/15 text-yellow-300 font-semibold';
      case 'Delivery & Logistics':
        return 'bg-blue-500/15 text-blue-300 font-semibold';
      default:
        return 'bg-gray-500/15 text-gray-300 font-semibold';
    }
  };

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Navigation Sidebar */}
      <ControlPanelNav />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="text-white/60 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white">Financial Reports</h1>
                    <p className="text-xs text-white/60">Business performance analytics</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-secondary/60 border border-white/10 rounded-md px-3 py-1.5 text-white text-sm focus:border-primary/50 focus:outline-none"
                >
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                  <option value="2021">2021</option>
                </select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border border-white/10 px-3"
                >
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

                <Button size="sm" className="bg-primary/90 hover:bg-primary px-3">
                  <Download className="w-4 h-4 mr-1.5" />
                  Export
                </Button>

                <Button variant="outline" size="sm" className="px-3">
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {/* Report Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Celestial Drakon Aquatics</h2>
            <p className="text-white/60 text-sm">Financial Performance Report</p>
            <p className="text-white/40 text-xs">(All amounts are in Philippine Peso)</p>
          </div>

          {/* Main Report Table */}
          <div className="bg-secondary/15 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {/* Table Header */}
                <thead>
                  <tr className="bg-secondary/30 border-b border-white/10">
                    <th className="text-left p-3 text-white font-semibold w-72">Accounts</th>
                    <th className="text-center p-3 text-white font-semibold w-24 text-xs">{selectedYear}</th>
                    {months.map((month) => (
                      <th key={month} className="text-center p-3 text-white font-semibold w-20 text-xs">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {financialData.accounts.map((category, categoryIndex) => (
                    <React.Fragment key={categoryIndex}>
                      {/* Category Header */}
                      <tr className={`${getCategoryColor(category.category)} border-b border-white/5`}>
                        <td className="p-2.5 text-xs uppercase tracking-wide">{category.category}</td>
                        <td className="text-center p-2.5"></td>
                        {months.map((month) => (
                          <td key={month} className="text-center p-2.5"></td>
                        ))}
                      </tr>

                      {/* Category Items */}
                      {category.items.map((item, itemIndex) => (
                        <tr key={itemIndex} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-2.5 text-white/85 text-xs pl-6">{item.name}</td>
                          <td className="text-center p-2.5 text-white/60 text-xs font-medium">
                            {formatCurrency(calculateRowTotal(item))}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.jan)}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.feb)}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.mar)}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.apr)}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.may)}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.jun)}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.jul)}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.aug)}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.sep)}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.oct)}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.nov)}
                          </td>
                          <td className="text-center p-2.5 text-white text-xs">
                            {formatCurrency(item.dec)}
                          </td>
                        </tr>
                      ))}

                      {/* Category Total */}
                      <tr className={`${getCategoryColor(category.category)} border-b-2 border-white/15`}>
                        <td className="p-2.5 font-bold text-xs pl-4 uppercase tracking-wide">
                          Total {category.category}
                        </td>
                        <td className="text-center p-2.5 font-bold text-xs">
                          {formatCurrency(calculateCategoryTotal(category))}
                        </td>
                        {months.map((month, monthIndex) => {
                          const monthTotal = category.items.reduce((sum, item) => {
                            const monthKey = month.toLowerCase() as keyof typeof item;
                            return sum + (item[monthKey] as number);
                          }, 0);
                          return (
                            <td key={month} className="text-center p-2.5 font-bold text-xs">
                              {formatCurrency(monthTotal)}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Spacing between categories */}
                      <tr><td colSpan={14} className="h-1"></td></tr>
                    </React.Fragment>
                  ))}

                  {/* Summary Rows */}
                  <tr className="bg-green-500/20 border-t-2 border-green-500/30">
                    <td className="p-2.5 font-bold text-white text-xs uppercase tracking-wide">Net Sales</td>
                    <td className="text-center p-2.5 font-bold text-white text-xs">
                      {formatCurrency(calculateCategoryTotal(financialData.accounts[0]))}
                    </td>
                    {months.map((month, monthIndex) => {
                      const salesTotal = financialData.accounts[0].items.reduce((sum, item) => {
                        const monthKey = month.toLowerCase() as keyof typeof item;
                        return sum + (item[monthKey] as number);
                      }, 0);
                      return (
                        <td key={month} className="text-center p-2.5 font-bold text-white text-xs">
                          {formatCurrency(salesTotal)}
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="bg-red-500/20">
                    <td className="p-2.5 font-bold text-white text-xs uppercase tracking-wide">Total COGS</td>
                    <td className="text-center p-2.5 font-bold text-white text-xs">
                      {formatCurrency(calculateCategoryTotal(financialData.accounts[1]))}
                    </td>
                    {months.map((month, monthIndex) => {
                      const cogsTotal = financialData.accounts[1].items.reduce((sum, item) => {
                        const monthKey = month.toLowerCase() as keyof typeof item;
                        return sum + (item[monthKey] as number);
                      }, 0);
                      return (
                        <td key={month} className="text-center p-2.5 font-bold text-white text-xs">
                          {formatCurrency(cogsTotal)}
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="bg-yellow-500/20">
                    <td className="p-2.5 font-bold text-white text-xs uppercase tracking-wide">Total Operating Expenses</td>
                    <td className="text-center p-2.5 font-bold text-white text-xs">
                      {formatCurrency(calculateCategoryTotal(financialData.accounts[2]))}
                    </td>
                    {months.map((month, monthIndex) => {
                      const operatingTotal = financialData.accounts[2].items.reduce((sum, item) => {
                        const monthKey = month.toLowerCase() as keyof typeof item;
                        return sum + (item[monthKey] as number);
                      }, 0);
                      return (
                        <td key={month} className="text-center p-2.5 font-bold text-white text-xs">
                          {formatCurrency(operatingTotal)}
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="bg-blue-500/20">
                    <td className="p-2.5 font-bold text-white text-xs uppercase tracking-wide">Total Delivery Expenses</td>
                    <td className="text-center p-2.5 font-bold text-white text-xs">
                      {formatCurrency(calculateCategoryTotal(financialData.accounts[3]))}
                    </td>
                    {months.map((month, monthIndex) => {
                      const deliveryTotal = financialData.accounts[3].items.reduce((sum, item) => {
                        const monthKey = month.toLowerCase() as keyof typeof item;
                        return sum + (item[monthKey] as number);
                      }, 0);
                      return (
                        <td key={month} className="text-center p-2.5 font-bold text-white text-xs">
                          {formatCurrency(deliveryTotal)}
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="bg-primary/25 border-t-2 border-primary/40">
                    <td className="p-2.5 font-bold text-white text-xs uppercase tracking-wide">Gross Profit</td>
                    <td className="text-center p-2.5 font-bold text-white text-xs">
                      {formatCurrency(
                        calculateCategoryTotal(financialData.accounts[0]) -
                        calculateCategoryTotal(financialData.accounts[1]) -
                        calculateCategoryTotal(financialData.accounts[2]) -
                        calculateCategoryTotal(financialData.accounts[3])
                      )}
                    </td>
                    {months.map((month, monthIndex) => {
                      const salesTotal = financialData.accounts[0].items.reduce((sum, item) => {
                        const monthKey = month.toLowerCase() as keyof typeof item;
                        return sum + (item[monthKey] as number);
                      }, 0);
                      const cogsTotal = financialData.accounts[1].items.reduce((sum, item) => {
                        const monthKey = month.toLowerCase() as keyof typeof item;
                        return sum + (item[monthKey] as number);
                      }, 0);
                      const operatingTotal = financialData.accounts[2].items.reduce((sum, item) => {
                        const monthKey = month.toLowerCase() as keyof typeof item;
                        return sum + (item[monthKey] as number);
                      }, 0);
                      const deliveryTotal = financialData.accounts[3].items.reduce((sum, item) => {
                        const monthKey = month.toLowerCase() as keyof typeof item;
                        return sum + (item[monthKey] as number);
                      }, 0);
                      return (
                        <td key={month} className="text-center p-2.5 font-bold text-white text-xs">
                          {formatCurrency(salesTotal - cogsTotal - operatingTotal - deliveryTotal)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Compact Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-green-500/10 backdrop-blur-sm rounded-lg p-4 border border-green-500/20">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h3 className="text-sm font-bold text-green-400">Total Revenue</h3>
              </div>
              <p className="text-lg font-bold text-white">
                ₱{formatCurrency(calculateCategoryTotal(financialData.accounts[0]))}
              </p>
              <p className="text-green-400/70 text-xs mt-1">Year to date</p>
            </div>

            <div className="bg-red-500/10 backdrop-blur-sm rounded-lg p-4 border border-red-500/20">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold text-red-400">Total COGS</h3>
              </div>
              <p className="text-lg font-bold text-white">
                ₱{formatCurrency(calculateCategoryTotal(financialData.accounts[1]))}
              </p>
              <p className="text-red-400/70 text-xs mt-1">Cost of goods</p>
            </div>

            <div className="bg-blue-500/10 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-blue-400">Total Expenses</h3>
              </div>
              <p className="text-lg font-bold text-white">
                ₱{formatCurrency(
                  calculateCategoryTotal(financialData.accounts[2]) +
                  calculateCategoryTotal(financialData.accounts[3])
                )}
              </p>
              <p className="text-blue-400/70 text-xs mt-1">Operations + Delivery</p>
            </div>

            <div className="bg-primary/10 backdrop-blur-sm rounded-lg p-4 border border-primary/20">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-primary">Net Profit</h3>
              </div>
              <p className="text-lg font-bold text-white">
                ₱{formatCurrency(
                  calculateCategoryTotal(financialData.accounts[0]) -
                  calculateCategoryTotal(financialData.accounts[1]) -
                  calculateCategoryTotal(financialData.accounts[2]) -
                  calculateCategoryTotal(financialData.accounts[3])
                )}
              </p>
              <p className="text-primary/70 text-xs mt-1">After all expenses</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-white/30 text-xs">
            <p>Generated on {new Date().toLocaleDateString('en-PH')} | Celestial Drakon Aquatics Control Panel</p>
          </div>
        </div>
      </div>
    </div>
  );
}