/**
 * Property-Based Tests for Bulk Text Parser
 * Feature: photo-posting-speedup
 * Property 1: Text Parsing Round-Trip Consistency
 * Validates: Requirements 1.1, 1.2, 1.3, 1.8
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parse, detectFormat, extractFields, validateAccount, splitIntoBlocks } from './bulk-text-parser.js';

describe('Bulk Text Parser - Property-Based Tests', () => {
    /**
     * Property 1: Text Parsing Round-Trip Consistency
     * For any valid structured text input containing person names and accounts,
     * parsing the text and then reconstructing it from parsed entries SHALL
     * produce entries that contain all original @accounts.
     * 
     * Validates: Requirements 1.1, 1.2, 1.3, 1.8
     */
    it('Property 1: Text Parsing Round-Trip Consistency - all @accounts are preserved', () => {
        // Generator for valid Twitter accounts
        const accountArb = fc.stringMatching(/^[a-zA-Z0-9_]{1,15}$/);

        // Generator for person names (Japanese or English)
        const nameArb = fc.oneof(
            fc.stringMatching(/^[ぁ-んァ-ヶー一-龯]{2,10}$/),
            fc.stringMatching(/^[A-Za-z]{2,15}$/)
        );

        // Generator for booth names
        const boothArb = fc.oneof(
            fc.constant('SEGA'),
            fc.constant('Nintendo'),
            fc.constant('Sony'),
            fc.constant('Capcom'),
            fc.stringMatching(/^[A-Za-z0-9]{3,10}$/)
        );

        // Generator for roles
        const roleArb = fc.constantFrom('モデル', 'RQ', 'レースクイーン', 'コンパニオン', 'コスプレイヤー', 'アンバサダー');

        // Generator for a single entry
        const entryArb = fc.record({
            name: nameArb,
            account: accountArb,
            booth: boothArb,
            role: roleArb
        });

        // Generator for multiple entries (1-5 entries)
        const entriesArb = fc.array(entryArb, { minLength: 1, maxLength: 5 });

        // Generator for format types
        const formatArb = fc.constantFrom('circled', 'numbered', 'separated', 'paragraph', 'bullet');

        fc.assert(
            fc.property(entriesArb, formatArb, (entries, format) => {
                // Construct text based on format
                const text = constructTextFromEntries(entries, format);

                // Parse the text
                const result = parse(text);

                // Extract all accounts from original entries
                const originalAccounts = entries.map(e => e.account.toLowerCase());

                // Extract all accounts from parsed entries
                const parsedAccounts = result.entries
                    .map(e => e.personAccount.toLowerCase())
                    .filter(a => a.length > 0);

                // Check that all original accounts are present in parsed results
                const allAccountsPreserved = originalAccounts.every(account => 
                    parsedAccounts.includes(account)
                );

                // The property: all @accounts must be preserved
                expect(allAccountsPreserved).toBe(true);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Helper: Constructs text from entries based on format
     */
    function constructTextFromEntries(entries, format) {
        const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

        switch (format) {
            case 'circled':
                return entries.map((entry, i) => 
                    `${circledNumbers[i] || '①'}\n名前: ${entry.name}\n@${entry.account}\nブース: ${entry.booth}\n役割: ${entry.role}`
                ).join('\n\n');

            case 'numbered':
                return entries.map((entry, i) => 
                    `${i + 1}. 名前: ${entry.name}\n@${entry.account}\nブース: ${entry.booth}\n役割: ${entry.role}`
                ).join('\n\n');

            case 'separated':
                return entries.map(entry => 
                    `名前: ${entry.name}\n@${entry.account}\nブース: ${entry.booth}\n役割: ${entry.role}`
                ).join('\n---\n');

            case 'paragraph':
                return entries.map(entry => 
                    `名前: ${entry.name}\n@${entry.account}\nブース: ${entry.booth}\n役割: ${entry.role}`
                ).join('\n\n\n');

            case 'bullet':
                return entries.map(entry => 
                    `・ 名前: ${entry.name}\n@${entry.account}\nブース: ${entry.booth}\n役割: ${entry.role}`
                ).join('\n\n');

            default:
                return entries.map(entry => 
                    `名前: ${entry.name}\n@${entry.account}\nブース: ${entry.booth}\n役割: ${entry.role}`
                ).join('\n\n');
        }
    }

    /**
     * Additional property test: Format detection is consistent
     */
    it('Property: Format detection is deterministic and consistent', () => {
        const textArb = fc.string({ minLength: 10, maxLength: 500 });

        fc.assert(
            fc.property(textArb, (text) => {
                const format1 = detectFormat(text);
                const format2 = detectFormat(text);

                // Format detection should be deterministic
                expect(format1).toBe(format2);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property test: Account validation is correct
     */
    it('Property: Account validation correctly identifies valid Twitter accounts', () => {
        // Valid account generator
        const validAccountArb = fc.stringMatching(/^[a-zA-Z0-9_]{1,15}$/);

        fc.assert(
            fc.property(validAccountArb, (account) => {
                expect(validateAccount(account)).toBe(true);
                expect(validateAccount('@' + account)).toBe(true);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property test: Invalid accounts are rejected
     */
    it('Property: Account validation rejects invalid accounts', () => {
        // Invalid account generators
        const invalidAccountArb = fc.oneof(
            fc.string({ minLength: 16, maxLength: 30 }), // Too long
            fc.constant(''), // Empty
            fc.stringMatching(/^[a-zA-Z0-9_]{1,15}[^a-zA-Z0-9_]+$/), // Invalid characters
            fc.stringMatching(/^.{1,15}[@#$%].*$/) // Special characters
        );

        fc.assert(
            fc.property(invalidAccountArb, (account) => {
                if (account.length === 0 || account.length > 15 || /[^a-zA-Z0-9_]/.test(account.replace(/^@/, ''))) {
                    expect(validateAccount(account)).toBe(false);
                }
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property test: Parsing never crashes
     */
    it('Property: Parser handles any input without crashing', () => {
        const anyTextArb = fc.string({ maxLength: 1000 });

        fc.assert(
            fc.property(anyTextArb, (text) => {
                // Should not throw
                const result = parse(text);

                // Result should have expected structure
                expect(result).toHaveProperty('entries');
                expect(result).toHaveProperty('format');
                expect(result).toHaveProperty('warnings');
                expect(Array.isArray(result.entries)).toBe(true);
                expect(Array.isArray(result.warnings)).toBe(true);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property test: Confidence scores are in valid range
     */
    it('Property: Confidence scores are always between 0 and 100', () => {
        const anyTextArb = fc.string({ minLength: 10, maxLength: 500 });

        fc.assert(
            fc.property(anyTextArb, (text) => {
                const result = parse(text);

                result.entries.forEach(entry => {
                    expect(entry.confidence).toBeGreaterThanOrEqual(0);
                    expect(entry.confidence).toBeLessThanOrEqual(100);
                });
            }),
            { numRuns: 100 }
        );
    });
});

describe('Bulk Text Parser - Unit Tests', () => {
    /**
     * Unit test: Circled number format detection
     */
    it('detects circled number format', () => {
        const text = '①\n名前: 田中\n@tanaka\n\n②\n名前: 佐藤\n@sato';
        expect(detectFormat(text)).toBe('circled');
    });

    /**
     * Unit test: Numbered list format detection
     */
    it('detects numbered list format', () => {
        const text = '1. 名前: 田中\n@tanaka\n\n2. 名前: 佐藤\n@sato';
        expect(detectFormat(text)).toBe('numbered');
    });

    /**
     * Unit test: Separator format detection
     */
    it('detects separator format', () => {
        const text = '名前: 田中\n@tanaka\n---\n名前: 佐藤\n@sato';
        expect(detectFormat(text)).toBe('separated');
    });

    /**
     * Unit test: Paragraph format detection
     */
    it('detects paragraph format', () => {
        const text = '名前: 田中\n@tanaka\n\n\n名前: 佐藤\n@sato';
        expect(detectFormat(text)).toBe('paragraph');
    });

    /**
     * Unit test: Bullet format detection
     */
    it('detects bullet format', () => {
        const text = '・ 名前: 田中\n@tanaka\n\n・ 名前: 佐藤\n@sato';
        expect(detectFormat(text)).toBe('bullet');
    });

    /**
     * Unit test: Field extraction
     */
    it('extracts fields correctly', () => {
        const text = '名前: 田中花子\n@tanaka_hanako\nブース: SEGA\n役割: モデル';
        const result = extractFields(text);

        expect(result.personName).toBe('田中花子');
        expect(result.personAccount).toBe('tanaka_hanako');
        expect(result.boothName).toBe('SEGA');
        expect(result.role).toBe('モデル');
    });

    /**
     * Unit test: Account validation
     */
    it('validates Twitter accounts correctly', () => {
        expect(validateAccount('valid_user123')).toBe(true);
        expect(validateAccount('@valid_user123')).toBe(true);
        expect(validateAccount('a')).toBe(true);
        expect(validateAccount('1234567890123456')).toBe(false); // Too long
        expect(validateAccount('invalid-user')).toBe(false); // Invalid character
        expect(validateAccount('')).toBe(false); // Empty
    });

    /**
     * Unit test: Empty input handling
     */
    it('handles empty input gracefully', () => {
        const result = parse('');
        expect(result.entries).toEqual([]);
        expect(result.format).toBe('unknown');
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    /**
     * Unit test: Multiple entries parsing
     */
    it('parses multiple entries correctly', () => {
        const text = `①
名前: 田中花子
@tanaka_hanako
ブース: SEGA

②
名前: 佐藤太郎
@sato_taro
ブース: Nintendo`;

        const result = parse(text);
        expect(result.entries.length).toBe(2);
        expect(result.entries[0].personName).toBe('田中花子');
        expect(result.entries[1].personName).toBe('佐藤太郎');
    });
});
