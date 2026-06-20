/**
 * JSON Connector — reads ERP data from JSON arrays.
 * Useful for REST API responses or JSON exports.
 */

import type { Connector, RawRecord } from "../engine";

export class JsonConnector implements Connector {
  name = "json";

  private products: RawRecord[] = [];
  private categories: RawRecord[] = [];
  private stock: RawRecord[] = [];

  loadProducts(data: RawRecord[]): void {
    this.products = data;
  }

  loadCategories(data: RawRecord[]): void {
    this.categories = data;
  }

  loadStock(data: RawRecord[]): void {
    this.stock = data;
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
}
