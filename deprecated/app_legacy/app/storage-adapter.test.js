/**
 * Property-Based Tests for LocalStorage Adapter
 * Feature: photo-posting-speedup
 * 
 * Tests the round-trip consistency of storage operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  storageSet,
  storageGet,
  storageRemove,
  storageClear,
  storageHas,
  storageKeys,
  storageCheckQuota
} from './storage-adapter.js';

describe('LocalStorage Adapter', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve strings', () => {
      const key = 'test-key';
      const value = 'test-value';
      
      expect(storageSet(key, value)).toBe(true);
      expect(storageGet(key)).toBe(value);
    });

    it('should store and retrieve objects', () => {
      const key = 'test-obj';
      const value = { name: 'John', age: 30 };
      
      expect(storageSet(key, value)).toBe(true);
      expect(storageGet(key)).toEqual(value);
    });

    it('should return default value for non-existent keys', () => {
      const defaultValue = { default: true };
      expect(storageGet('non-existent', defaultValue)).toEqual(defaultValue);
    });

    it('should remove items', () => {
      const key = 'test-remove';
      storageSet(key, 'value');
      
      expect(storageRemove(key)).toBe(true);
      expect(storageGet(key)).toBe(null);
    });

    it('should check if key exists', () => {
      const key = 'test-has';
      expect(storageHas(key)).toBe(false);
      
      storageSet(key, 'value');
      expect(storageHas(key)).toBe(true);
    });

    it('should clear all storage', () => {
      storageSet('key1', 'value1');
      storageSet('key2', 'value2');
      
      expect(storageClear()).toBe(true);
      expect(storageGet('key1')).toBe(null);
      expect(storageGet('key2')).toBe(null);
    });

    it('should get all keys', () => {
      storageSet('key1', 'value1');
      storageSet('key2', 'value2');
      
      const keys = storageKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('Property 2: Person Database Persistence (Foundation)', () => {
    /**
     * Feature: photo-posting-speedup, Property 2: Person Database Persistence
     * Validates: Requirements 4.4, 11.1
     * 
     * For any valid data structure, saving it to storage and then retrieving it
     * SHALL return an equivalent value (round-trip consistency)
     */
    it('should maintain round-trip consistency for arbitrary data', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // key
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            // Use fc.double() but filter out -0 since JSON doesn't preserve it
            fc.double().filter(n => !Object.is(n, -0)),
            fc.array(fc.string()),
            fc.record({
              id: fc.string(),
              name: fc.string(),
              account: fc.string(),
              role: fc.string(),
              lastUsed: fc.integer({ min: 0 }),
              useCount: fc.integer({ min: 0 })
            })
          ), // value
          (key, value) => {
            // Save the value
            const saveResult = storageSet(key, value);
            expect(saveResult).toBe(true);
            
            // Retrieve the value
            const retrieved = storageGet(key);
            
            // Should be deeply equal
            expect(retrieved).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle PersonRecord-like objects with round-trip consistency', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 })
            .filter(key => !['__proto__', 'constructor', 'prototype'].includes(key)), // Filter out special JS properties
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            account: fc.string({ minLength: 1, maxLength: 50 }),
            role: fc.constantFrom('モデル', 'RQ', 'コンパニオン', 'コスプレイヤー'),
            lastUsed: fc.integer({ min: 0, max: Date.now() }),
            useCount: fc.integer({ min: 0, max: 1000 }),
            events: fc.array(fc.uuid(), { maxLength: 10 })
          }),
          (key, personRecord) => {
            // Save the person record
            const saveResult = storageSet(key, personRecord);
            expect(saveResult).toBe(true);
            
            // Retrieve the person record
            const retrieved = storageGet(key);
            
            // Should match exactly
            expect(retrieved).toEqual(personRecord);
            expect(retrieved.id).toBe(personRecord.id);
            expect(retrieved.name).toBe(personRecord.name);
            expect(retrieved.account).toBe(personRecord.account);
            expect(retrieved.role).toBe(personRecord.role);
            expect(retrieved.lastUsed).toBe(personRecord.lastUsed);
            expect(retrieved.useCount).toBe(personRecord.useCount);
            expect(retrieved.events).toEqual(personRecord.events);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle arrays of records with round-trip consistency', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // key
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              account: fc.string({ minLength: 1, maxLength: 50 }),
              role: fc.string(),
              lastUsed: fc.integer({ min: 0 }),
              useCount: fc.integer({ min: 0 })
            }),
            { maxLength: 100 }
          ),
          (key, records) => {
            // Save the array
            const saveResult = storageSet(key, records);
            expect(saveResult).toBe(true);
            
            // Retrieve the array
            const retrieved = storageGet(key);
            
            // Should be deeply equal
            expect(retrieved).toEqual(records);
            expect(retrieved.length).toBe(records.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle nested objects with round-trip consistency', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 })
            .filter(key => !['__proto__', 'constructor', 'prototype'].includes(key)), // Filter out special JS properties
          fc.record({
            eventInfo: fc.record({
              id: fc.uuid(),
              eventEn: fc.string(),
              eventJp: fc.string(),
              date: fc.string(),
              venue: fc.string(),
              category: fc.string(),
              hashtags: fc.string()
            }),
            postQueue: fc.array(
              fc.record({
                id: fc.uuid(),
                boothName: fc.string(),
                personName: fc.string(),
                status: fc.constantFrom('draft', 'ready', 'sent', 'failed')
              }),
              { maxLength: 10 }
            )
          }),
          (key, appState) => {
            // Save the nested structure
            const saveResult = storageSet(key, appState);
            expect(saveResult).toBe(true);
            
            // Retrieve the nested structure
            const retrieved = storageGet(key);
            
            // Should be deeply equal
            expect(retrieved).toEqual(appState);
            expect(retrieved.eventInfo).toEqual(appState.eventInfo);
            expect(retrieved.postQueue).toEqual(appState.postQueue);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', () => {
      // Manually set invalid JSON
      localStorage.setItem('invalid-json', '{invalid json}');
      
      const result = storageGet('invalid-json', 'default');
      expect(result).toBe('default');
    });

    it('should return false when setting fails', () => {
      // Mock a failure by making JSON.stringify throw
      const circularRef = {};
      circularRef.self = circularRef;
      
      const result = storageSet('circular', circularRef);
      expect(result).toBe(false);
    });
  });

  describe('Quota Check', () => {
    it('should check storage quota', () => {
      const quota = storageCheckQuota();
      
      expect(quota).toHaveProperty('available');
      expect(quota).toHaveProperty('used');
      expect(quota).toHaveProperty('total');
      expect(quota).toHaveProperty('percentage');
      expect(typeof quota.available).toBe('boolean');
      expect(typeof quota.used).toBe('number');
      expect(typeof quota.total).toBe('number');
    });
  });
});
