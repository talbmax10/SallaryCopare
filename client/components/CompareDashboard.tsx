import { useState, useMemo } from 'react';
import { Download, Upload, Search, Filter } from 'lucide-react';
import {
  parseExcelFile,
  convertRowsToJSON,
  getColumnHeaders,
  exportToExcel,
} from '@/utils/excelUtils';
import {
  compareDatasets,
  filterResultsBySearch,
  sortDifferences,
  type ComparisonResult,
  type RowDifference,
} from '@/utils/diffLogic';
import { cn } from '@/lib/utils';

export default function CompareDashboard() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [columns1, setColumns1] = useState<string[]>([]);
  const [columns2, setColumns2] = useState<string[]>([]);
  const [data1, setData1] = useState<Record<string, unknown>[]>([]);
  const [data2, setData2] = useState<Record<string, unknown>[]>([]);
  const [keyField, setKeyField] = useState<string>('');
  const [excludedColumns, setExcludedColumns] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ComparisonResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortAscending, setSortAscending] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get available columns from both files
  const availableColumns = useMemo(() => {
    const combined = new Set([...columns1, ...columns2]);
    return Array.from(combined).sort();
  }, [columns1, columns2]);

  // Handle file upload
  const handleFileUpload = async (
    file: File,
    isFirstFile: boolean
  ) => {
    try {
      setError('');
      const parsed = await parseExcelFile(file);
      const sheetName = parsed.sheetNames[0];
      const rows = parsed.sheets[sheetName];

      if (!rows || rows.length < 2) {
        setError('الملف يجب أن يحتوي على رأس صفوف وبيانات على الأقل');
        return;
      }

      const headers = getColumnHeaders(rows);
      const jsonData = convertRowsToJSON(rows);

      if (isFirstFile) {
        setFile1(file);
        setColumns1(headers);
        setData1(jsonData);
      } else {
        setFile2(file);
        setColumns2(headers);
        setData2(jsonData);
      }
    } catch (err) {
      setError(`خطأ في تحميل الملف: ${err}`);
    }
  };

  // Handle column exclusion toggle
  const toggleExcludedColumn = (column: string) => {
    const newExcluded = new Set(excludedColumns);
    if (newExcluded.has(column)) {
      newExcluded.delete(column);
    } else {
      newExcluded.add(column);
    }
    setExcludedColumns(newExcluded);
  };

  // Run comparison
  const handleCompare = () => {
    if (!file1 || !file2) {
      setError('يجب تحميل الملفين');
      return;
    }

    if (!keyField) {
      setError('يجب اختيار مفتاح الربط');
      return;
    }

    if (data1.length === 0 || data2.length === 0) {
      setError('أحد الملفات فارغ');
      return;
    }

    setLoading(true);
    try {
      const comparisonResults = compareDatasets(
        data1,
        data2,
        keyField,
        excludedColumns
      );
      setResults(comparisonResults);
      setError('');
    } catch (err) {
      setError(`خطأ في المقارنة: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Get filtered and sorted results
  const displayResults = useMemo(() => {
    if (!results) return null;

    let filtered = filterResultsBySearch(results, searchTerm);

    if (sortField) {
      const allDiffs = [
        ...filtered.added,
        ...filtered.removed,
        ...filtered.changed,
      ];
      const sorted = sortDifferences(allDiffs, sortField, sortAscending);

      return {
        ...filtered,
        allDiffs: sorted,
      };
    }

    return {
      ...filtered,
      allDiffs: [
        ...filtered.added,
        ...filtered.removed,
        ...filtered.changed,
      ],
    };
  }, [results, searchTerm, sortField, sortAscending]);

  // Export results
  const handleExport = () => {
    if (!displayResults || !displayResults.allDiffs) {
      setError('لا توجد نتائج للتصدير');
      return;
    }

    try {
      const exportData = displayResults.allDiffs.map((diff) => ({
        type: diff.type,
        keyValue: diff.keyValue,
        data: diff.data2 || diff.data1,
        differences: diff.differences,
      }));

      exportToExcel(exportData, `comparison-${new Date().getTime()}.xlsx`);
    } catch (err) {
      setError(`خطأ في التصدير: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            مقارن الرواتب
          </h1>
          <p className="text-slate-600">
            قارن البيانات بين ملفي Excel واكتشف التغييرات والإضافات والحذف
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg border border-red-300">
            {error}
          </div>
        )}

        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* File 1 Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              ملف الشهر الأول
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) handleFileUpload(file, true);
              }}
              className="block w-full text-sm text-slate-500
                file:me-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
            {file1 && (
              <p className="mt-2 text-sm text-green-600">✓ {file1.name}</p>
            )}
          </div>

          {/* File 2 Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              ملف الشهر الثاني
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) handleFileUpload(file, false);
              }}
              className="block w-full text-sm text-slate-500
                file:me-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
            {file2 && (
              <p className="mt-2 text-sm text-green-600">✓ {file2.name}</p>
            )}
          </div>
        </div>

        {/* Configuration Section */}
        {file1 && file2 && availableColumns.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            {/* Key Field Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                مفتاح الربط (المفتاح الأساسي)
              </label>
              <select
                value={keyField}
                onChange={(e) => setKeyField(e.target.value)}
                className="w-full md:w-96 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر مفتاح الربط...</option>
                {availableColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {/* Excluded Columns */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                الأعمدة المستثناة من المقارنة
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableColumns.map((col) => (
                  <label key={col} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={excludedColumns.has(col)}
                      onChange={() => toggleExcludedColumn(col)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{col}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-4 mt-8">
              <button
                onClick={handleCompare}
                disabled={loading || !keyField}
                className={cn(
                  'flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors',
                  loading || !keyField
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                <span>تنفيذ المقارنة</span>
              </button>

              {displayResults && displayResults.allDiffs.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <Download size={18} />
                  <span>تصدير النتائج</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results Section */}
        {displayResults && (
          <div className="bg-white rounded-lg shadow p-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">المجموع</p>
                <p className="text-2xl font-bold text-blue-600">
                  {displayResults.allDiffs.length}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">مضافة</p>
                <p className="text-2xl font-bold text-green-600">
                  {displayResults.added.length}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">محذوفة</p>
                <p className="text-2xl font-bold text-red-600">
                  {displayResults.removed.length}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">متغيرة</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {displayResults.changed.length}
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute right-3 top-3 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="ابحث ع�� موظف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Results Table */}
            {displayResults.allDiffs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-300">
                      <th className="px-4 py-3 text-right text-slate-600 font-semibold">الحالة</th>
                      <th
                        className="px-4 py-3 text-right text-slate-600 font-semibold cursor-pointer hover:text-blue-600"
                        onClick={() => {
                          if (sortField === keyField) {
                            setSortAscending(!sortAscending);
                          } else {
                            setSortField(keyField);
                            setSortAscending(true);
                          }
                        }}
                      >
                        {keyField}
                        {sortField === keyField && (
                          <span className="mr-2">
                            {sortAscending ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      {availableColumns
                        .filter((col) => !excludedColumns.has(col) && col !== keyField)
                        .map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-right text-slate-600 font-semibold cursor-pointer hover:text-blue-600"
                            onClick={() => {
                              if (sortField === col) {
                                setSortAscending(!sortAscending);
                              } else {
                                setSortField(col);
                                setSortAscending(true);
                              }
                            }}
                          >
                            {col}
                            {sortField === col && (
                              <span className="mr-2">
                                {sortAscending ? '↑' : '↓'}
                              </span>
                            )}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayResults.allDiffs.map((diff, index) => {
                      const bgColor =
                        diff.type === 'added'
                          ? 'bg-green-100'
                          : diff.type === 'removed'
                          ? 'bg-red-100'
                          : 'bg-yellow-100';

                      const statusLabel =
                        diff.type === 'added'
                          ? 'مضافة'
                          : diff.type === 'removed'
                          ? 'محذوفة'
                          : 'متغيرة';

                      const dataToShow = diff.data2 || diff.data1;

                      return (
                        <tr key={index} className={cn('border-b border-slate-200 hover:bg-opacity-75', bgColor)}>
                          <td className="px-4 py-3 font-semibold">
                            <span
                              className={cn(
                                'px-3 py-1 rounded text-xs font-bold',
                                diff.type === 'added'
                                  ? 'bg-green-200 text-green-800'
                                  : diff.type === 'removed'
                                  ? 'bg-red-200 text-red-800'
                                  : 'bg-yellow-200 text-yellow-800'
                              )}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {diff.keyValue}
                          </td>
                          {availableColumns
                            .filter((col) => !excludedColumns.has(col) && col !== keyField)
                            .map((col) => (
                              <td
                                key={col}
                                className={cn(
                                  'px-4 py-3',
                                  diff.differences?.[col] && 'bg-opacity-50 font-semibold'
                                )}
                              >
                                <div>
                                  <div>
                                    {String(dataToShow[col] || '-')}
                                  </div>
                                  {diff.differences?.[col] && (
                                    <div className="text-xs text-slate-500 mt-1">
                                      من: {String(diff.differences[col].before)}
                                    </div>
                                  )}
                                </div>
                              </td>
                            ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                لا توجد نتائج تطابق البحث
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
