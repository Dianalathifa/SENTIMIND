// src/sections/overview/utils/utils.ts

import type { Order } from 'src/types/table'; // Pastikan Anda memiliki tipe Order yang didefinisikan (biasanya 'asc' | 'desc')

// Fungsi pembantu untuk descending order
function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

// Fungsi getComparator yang generik
export function getComparator<T>(order: Order, orderBy: keyof T): (a: T, b: T) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// Interface untuk applyFilter yang generik
interface ApplyFilterProps<T> {
  inputData: T[];
  comparator: (a: T, b: T) => number;
  filterName: string;
  // Menambahkan filterKeys untuk menentukan kolom mana yang akan difilter
  filterKeys?: Array<keyof T>;
}

// Fungsi applyFilter yang generik
export function applyFilter<T>({
  inputData,
  comparator,
  filterName,
  // Default filterKeys untuk data Tweet jika tidak diberikan
  filterKeys = ['username', 'tweet'] as Array<keyof T>, // Pastikan 'username' dan 'tweet' ada di tipe T
}: ApplyFilterProps<T>): T[] {
  const stabilizedThis = inputData.map((el, index) => [el, index] as [T, number]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (filterName) {
    inputData = inputData.filter((item) =>
      filterKeys.some((key) =>
        String(item[key])
          .toLowerCase()
          .includes(filterName.toLowerCase())
      )
    );
  }

  return inputData;
}

// Fungsi emptyRows tidak perlu generik
export function emptyRows(page: number, rowsPerPage: number, count: number) {
  return page > 0 ? Math.max(0, (1 + page) * rowsPerPage - count) : 0;
}