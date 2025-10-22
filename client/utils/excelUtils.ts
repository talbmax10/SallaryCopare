import * as XLSX from 'xlsx';

/**
 * Parses an Excel file and extracts sheet data
 * @param file - The Excel file to parse
 * @returns Promise with sheets data and available columns
 */
export async function parseExcelFile(
  file: File
): Promise<{
  sheets: Record<string, unknown[][]>;
  columns: string[];
  sheetNames: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const sheets: Record<string, unknown[][]> = {};
        const allColumns = new Set<string>();
        const sheetNames = workbook.SheetNames;

        sheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          sheets[sheetName] = jsonData as unknown[][];

          // Extract column headers from first row
          if (jsonData.length > 0) {
            const headers = jsonData[0];
            if (Array.isArray(headers)) {
              headers.forEach((header, index) => {
                // Use header value if available, otherwise use column letter
                const headerStr = header ? String(header).trim() : `Column ${index + 1}`;
                if (headerStr) allColumns.add(headerStr);
              });
            }
          }
        });

        const columns = Array.from(allColumns);
        console.log('Parsed columns:', columns);
        resolve({ sheets, columns, sheetNames });
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Converts raw Excel rows to JSON objects using headers
 * @param rows - Raw rows from Excel (first row should be headers)
 * @returns Array of objects with column names as keys
 */
export function convertRowsToJSON(rows: unknown[][]): Record<string, unknown>[] {
  if (rows.length === 0) return [];

  const headers = rows[0];
  if (!Array.isArray(headers)) return [];

  const headerStrings = headers.map((h) => String(h || ''));

  return rows.slice(1).map((row) => {
    if (!Array.isArray(row)) return {};

    const obj: Record<string, unknown> = {};
    headerStrings.forEach((header, index) => {
      obj[header] = row[index] !== undefined ? row[index] : '';
    });
    return obj;
  });
}

/**
 * Exports comparison results to an Excel file with formatting
 * @param results - The comparison results to export
 * @param keyField - The key field name
 * @param filename - Name of the output file
 */
export function exportToExcel(
  results: Array<{
    type: 'added' | 'removed' | 'changed';
    keyValue: unknown;
    data: Record<string, unknown>;
    differences?: Record<string, { before: unknown; after: unknown }>;
  }>,
  keyField: string = 'Key',
  filename: string = 'comparison-results.xlsx'
) {
  const worksheetData: unknown[][] = [];

  // Add headers
  if (results.length > 0) {
    const firstResult = results[0];
    const headers = [
      'الحالة',
      keyField,
      ...Object.keys(firstResult.data).filter((key) => key !== keyField),
    ];
    worksheetData.push(headers);

    // Add data rows with details about changes
    results.forEach((result) => {
      const statusArabic =
        result.type === 'added'
          ? 'مضافة'
          : result.type === 'removed'
          ? 'محذوفة'
          : 'متغيرة';

      const dataKeys = Object.keys(firstResult.data).filter(
        (key) => key !== keyField
      );
      const row = [
        statusArabic,
        result.keyValue,
        ...dataKeys.map((key) => result.data[key]),
      ];
      worksheetData.push(row);

      // Add difference details for changed rows
      if (result.differences && Object.keys(result.differences).length > 0) {
        const differenceRow = ['تفاصيل التغييرات', ''];
        dataKeys.forEach((key) => {
          if (result.differences?.[key]) {
            differenceRow.push(
              `من: ${result.differences[key].before} → إلى: ${result.differences[key].after}`
            );
          } else {
            differenceRow.push('');
          }
        });
        worksheetData.push(differenceRow);
      }
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for better readability
  const maxColWidth = 30;
  worksheet['!cols'] = Array(worksheetData[0]?.length || 1).fill({
    wch: maxColWidth,
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
  XLSX.writeFile(workbook, filename);
}

/**
 * Gets all unique column names from parsed Excel data
 * @param rows - Raw rows from Excel
 * @returns Array of column names
 */
export function getColumnHeaders(rows: unknown[][]): string[] {
  if (rows.length === 0) return [];
  
  const headers = rows[0];
  if (!Array.isArray(headers)) return [];
  
  return headers.map((h) => String(h || ''));
}
