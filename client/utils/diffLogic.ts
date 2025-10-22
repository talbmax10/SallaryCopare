/**
 * Represents a single difference in a row
 */
export interface RowDifference {
  type: 'added' | 'removed' | 'changed';
  keyValue: unknown;
  keyField: string;
  data1: Record<string, unknown>;
  data2?: Record<string, unknown>;
  differences?: Record<string, { before: unknown; after: unknown }>;
}

/**
 * Comparison result summary
 */
export interface ComparisonResult {
  added: RowDifference[];
  removed: RowDifference[];
  changed: RowDifference[];
  total: number;
}

/**
 * Main comparison function that detects Added, Removed, and Changed rows
 * Uses O(n) operations for optimal performance with large datasets
 * 
 * @param data1 - First dataset (month 1)
 * @param data2 - Second dataset (month 2)
 * @param keyField - The field used to match rows between datasets
 * @param excludedColumns - Columns to ignore in comparison
 * @returns ComparisonResult with categorized differences
 */
export function compareDatasets(
  data1: Record<string, unknown>[],
  data2: Record<string, unknown>[],
  keyField: string,
  excludedColumns: Set<string> = new Set()
): ComparisonResult {
  const added: RowDifference[] = [];
  const removed: RowDifference[] = [];
  const changed: RowDifference[] = [];

  // Build maps for O(1) lookup
  const map1 = buildKeyMap(data1, keyField);
  const map2 = buildKeyMap(data2, keyField);

  // Find removed and changed rows
  map1.forEach((row1, key) => {
    const row2 = map2.get(key);

    if (!row2) {
      // Row exists in data1 but not in data2 = Removed
      removed.push({
        type: 'removed',
        keyValue: key,
        keyField,
        data1: row1,
      });
    } else {
      // Row exists in both, check for changes
      const differences = findFieldDifferences(
        row1,
        row2,
        excludedColumns
      );

      if (Object.keys(differences).length > 0) {
        // There are changes
        changed.push({
          type: 'changed',
          keyValue: key,
          keyField,
          data1: row1,
          data2: row2,
          differences,
        });
      }
    }
  });

  // Find added rows (in data2 but not in data1)
  map2.forEach((row2, key) => {
    if (!map1.has(key)) {
      added.push({
        type: 'added',
        keyValue: key,
        keyField,
        data1: {},
        data2: row2,
      });
    }
  });

  return {
    added,
    removed,
    changed,
    total: added.length + removed.length + changed.length,
  };
}

/**
 * Builds a map of rows indexed by key field for O(1) lookup
 * @param data - Array of row objects
 * @param keyField - The field to use as key
 * @returns Map with key values as keys and rows as values
 */
function buildKeyMap(
  data: Record<string, unknown>[],
  keyField: string
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();

  data.forEach((row) => {
    const keyValue = String(row[keyField] || '');
    if (keyValue) {
      map.set(keyValue, row);
    }
  });

  return map;
}

/**
 * Finds field-level differences between two rows
 * @param row1 - First row
 * @param row2 - Second row
 * @param excludedColumns - Columns to skip in comparison
 * @returns Object with field names as keys and {before, after} as values
 */
function findFieldDifferences(
  row1: Record<string, unknown>,
  row2: Record<string, unknown>,
  excludedColumns: Set<string> = new Set()
): Record<string, { before: unknown; after: unknown }> {
  const differences: Record<string, { before: unknown; after: unknown }> = {};

  // Get all unique field names
  const allFields = new Set([
    ...Object.keys(row1),
    ...Object.keys(row2),
  ]);

  allFields.forEach((field) => {
    if (excludedColumns.has(field)) return;

    const value1 = row1[field];
    const value2 = row2[field];

    // Normalize values for comparison (trim whitespace, convert to string)
    const normalized1 = normalizeValue(value1);
    const normalized2 = normalizeValue(value2);

    if (normalized1 !== normalized2) {
      differences[field] = {
        before: value1,
        after: value2,
      };
    }
  });

  return differences;
}

/**
 * Normalizes a value for comparison
 * @param value - The value to normalize
 * @returns Normalized string value
 */
function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return String(value).trim();
}

/**
 * Filters comparison results based on search term
 * Searches in key values and all row data
 * @param results - The comparison results to filter
 * @param searchTerm - The search term
 * @returns Filtered results
 */
export function filterResultsBySearch(
  results: ComparisonResult,
  searchTerm: string
): ComparisonResult {
  const lowerSearch = searchTerm.toLowerCase().trim();

  if (!lowerSearch) {
    return results;
  }

  const filterRow = (diff: RowDifference) => {
    // Search in key value
    if (String(diff.keyValue).toLowerCase().includes(lowerSearch)) {
      return true;
    }

    // Search in data1
    for (const value of Object.values(diff.data1)) {
      if (String(value).toLowerCase().includes(lowerSearch)) {
        return true;
      }
    }

    // Search in data2
    if (diff.data2) {
      for (const value of Object.values(diff.data2)) {
        if (String(value).toLowerCase().includes(lowerSearch)) {
          return true;
        }
      }
    }

    return false;
  };

  return {
    added: results.added.filter(filterRow),
    removed: results.removed.filter(filterRow),
    changed: results.changed.filter(filterRow),
    total: 0, // Will be calculated by component
  };
}

/**
 * Sorts an array of RowDifference objects by specified field
 * @param differences - Array to sort
 * @param sortField - Field to sort by
 * @param ascending - Sort direction
 * @returns Sorted array
 */
export function sortDifferences(
  differences: RowDifference[],
  sortField: string,
  ascending: boolean = true
): RowDifference[] {
  return [...differences].sort((a, b) => {
    let valueA = a.data1[sortField] || a.data2?.[sortField] || '';
    let valueB = b.data1[sortField] || b.data2?.[sortField] || '';

    // Convert to comparable values
    valueA = String(valueA).toLowerCase();
    valueB = String(valueB).toLowerCase();

    if (valueA < valueB) {
      return ascending ? -1 : 1;
    }
    if (valueA > valueB) {
      return ascending ? 1 : -1;
    }
    return 0;
  });
}
