/**
 * CSV Connector — reads ERP data from CSV files.
 * Useful for initial migration or when ERP exports CSV.
 */

import type { Connector, RawRecord } from "../engine";

export class CsvConnector implements Connector {
  name = "csv";

  private products: RawRecord[] = [];
  private categories: RawRecord[] = [];
  private stock: RawRecord[] = [];

  /**
   * Loads CSV data from a string (tab or comma separated).
   */
  loadProducts(csvContent: string, delimiter = "\t"): void {
    this.products = this.parseCsv(csvContent, delimiter);
  }

  loadCategories(csvContent: string, delimiter = "\t"): void {
    this.categories = this.parseCsv(csvContent, delimiter);
  }

  loadStock(csvContent: string, delimiter = "\t"): void {
    this.stock = this.parseCsv(csvContent, delimiter);
  }

  async fetchProducts(): Promise<RawRecord[]> {
    return this.products;
  }

  async fetchCategories(): Promise<RawRecord[]> {
    return this.categories;
  }

  async fetchStock(): Promise<RawRecord[]> {
    return this.stock;
  }

  private parseCsv(content: string, delimiter: string): RawRecord[] {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""));
    const records: RawRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ""));
      const record: RawRecord = {};
      headers.forEach((header, idx) => {
        const val = values[idx] ?? "";
        // Auto-detect numbers
        record[header] = /^\d+(\.\d+)?$/.test(val) ? Number(val) : val;
      });
      records.push(record);
    }

    return records;
  }
}
