/**
 * Test setup file
 * Configures the test environment
 */

// Mock localStorage for tests
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
  
  // Add hasOwnProperty for proper key enumeration
  hasOwnProperty(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key);
  }
}

global.localStorage = new LocalStorageMock();
