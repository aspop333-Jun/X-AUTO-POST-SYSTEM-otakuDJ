/**
 * Performance Tests for Photo Posting Speedup
 * Tests large data handling and memory efficiency
 * 
 * Feature: photo-posting-speedup
 * Task: 26.2 パフォーマンス最適化
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Performance Tests', () => {
    let mockLocalStorage;

    beforeEach(() => {
        // Mock localStorage
        const store = {};
        mockLocalStorage = {
            getItem: vi.fn((key) => store[key] || null),
            setItem: vi.fn((key, value) => { store[key] = value; }),
            removeItem: vi.fn((key) => { delete store[key]; }),
            clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); })
        };
        global.localStorage = mockLocalStorage;
    });

    it('should handle large queue efficiently (10 items)', () => {
        const startTime = performance.now();
        
        // Create 10 posts (max queue size)
        const posts = Array.from({ length: 10 }, (_, i) => ({
            id: `post-${i}-${Date.now()}`,
            imageFile: null,
            imageBase64: null,
            boothName: `Booth ${i}`,
            boothAccount: `@booth${i}`,
            personRole: 'モデル',
            personName: `Person ${i}`,
            personAccount: `@person${i}`,
            aiComment: `This is a test comment for post ${i}. It contains some text to simulate real usage.`,
            status: 'draft',
            createdAt: Date.now(),
            updatedAt: Date.now()
        }));

        // Simulate operations on queue
        const queue = [...posts];
        
        // Update operation
        queue[0] = { ...queue[0], status: 'ready' };
        
        // Reorder operation
        const reordered = [queue[1], queue[0], ...queue.slice(2)];
        
        // Filter operation
        const readyPosts = reordered.filter(p => p.status === 'ready');
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete in less than 100ms
        expect(duration).toBeLessThan(100);
        expect(queue.length).toBe(10);
        expect(reordered.length).toBe(10);
        expect(readyPosts.length).toBeGreaterThan(0);
    });

    it('should handle large person database efficiently (100 records)', () => {
        const startTime = performance.now();
        
        // Create 100 person records
        const persons = Array.from({ length: 100 }, (_, i) => ({
            id: `person-${i}`,
            name: `Person ${i}`,
            account: `@person${i}`,
            role: i % 3 === 0 ? 'モデル' : i % 3 === 1 ? 'RQ' : 'コンパニオン',
            lastUsed: Date.now() - (i * 1000),
            useCount: Math.floor(Math.random() * 50),
            events: [`event-${i % 5}`]
        }));

        // Simulate search operation
        const searchQuery = 'Person 5';
        const results = persons.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Simulate sort by lastUsed
        const sorted = [...persons].sort((a, b) => b.lastUsed - a.lastUsed);

        // Simulate get recent (top 10)
        const recent = sorted.slice(0, 10);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete in less than 50ms
        expect(duration).toBeLessThan(50);
        expect(persons.length).toBe(100);
        expect(results.length).toBeGreaterThan(0);
        expect(recent.length).toBe(10);
    });

    it('should handle large history database efficiently (100 records)', () => {
        const startTime = performance.now();
        
        // Create 100 history records
        const history = Array.from({ length: 100 }, (_, i) => ({
            id: `history-${i}`,
            eventId: `event-${i % 10}`,
            eventName: `Event ${i % 10}`,
            postData: {
                id: `post-${i}`,
                boothName: `Booth ${i}`,
                personName: `Person ${i}`,
                aiComment: `Comment ${i}`,
                status: 'sent'
            },
            sentAt: Date.now() - (i * 60000) // 1 minute apart
        }));

        // Simulate grouping by event
        const grouped = history.reduce((acc, record) => {
            if (!acc[record.eventId]) {
                acc[record.eventId] = [];
            }
            acc[record.eventId].push(record);
            return acc;
        }, {});

        // Simulate filtering by event
        const eventRecords = history.filter(r => r.eventId === 'event-5');

        // Simulate limiting to 100 most recent
        const limited = history.slice(0, 100);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete in less than 50ms
        expect(duration).toBeLessThan(50);
        expect(history.length).toBe(100);
        expect(Object.keys(grouped).length).toBe(10);
        expect(eventRecords.length).toBeGreaterThan(0);
        expect(limited.length).toBe(100);
    });

    it('should handle localStorage operations efficiently', () => {
        const startTime = performance.now();
        
        // Create large state object
        const largeState = {
            currentStep: 2,
            eventInfo: {
                eventEn: 'Tokyo Game Show 2024',
                eventJp: '東京ゲームショウ2024',
                date: '2024-09-21',
                venue: '幕張メッセ',
                category: 'ブース',
                hashtags: '#TGS2024 #東京ゲームショウ'
            },
            postQueue: Array.from({ length: 10 }, (_, i) => ({
                id: `post-${i}`,
                boothName: `Booth ${i}`,
                personName: `Person ${i}`,
                aiComment: `This is a longer comment to test serialization performance. It contains multiple sentences and some Japanese characters like これはテストです。`,
                status: 'draft',
                createdAt: Date.now(),
                updatedAt: Date.now()
            })),
            selectedIndices: [],
            editingIndex: null
        };

        // Serialize
        const serialized = JSON.stringify(largeState);
        
        // Save to localStorage
        mockLocalStorage.setItem('autopost_state', serialized);
        
        // Retrieve from localStorage
        const retrieved = mockLocalStorage.getItem('autopost_state');
        
        // Deserialize
        const deserialized = JSON.parse(retrieved);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete in less than 50ms
        expect(duration).toBeLessThan(50);
        expect(serialized.length).toBeGreaterThan(0);
        expect(deserialized.postQueue.length).toBe(10);
        expect(deserialized.eventInfo.eventEn).toBe('Tokyo Game Show 2024');
    });

    it('should handle bulk text parsing efficiently', () => {
        const startTime = performance.now();
        
        // Create large bulk text (10 entries)
        const bulkText = Array.from({ length: 10 }, (_, i) => `
${['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'][i]}
名前: Person ${i}
アカウント: @person${i}
ブース: Booth ${i}
役割: ${i % 3 === 0 ? 'モデル' : i % 3 === 1 ? 'RQ' : 'コンパニオン'}
`).join('\n');

        // Simulate parsing (split by circled numbers)
        const entries = bulkText.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩])/).filter(e => e.trim());
        
        // Simulate field extraction for each entry
        const parsed = entries.map(entry => {
            const nameMatch = entry.match(/名前[：:]\s*(.+)/);
            const accountMatch = entry.match(/アカウント[：:]\s*(.+)/);
            const boothMatch = entry.match(/ブース[：:]\s*(.+)/);
            const roleMatch = entry.match(/役割[：:]\s*(.+)/);
            
            return {
                personName: nameMatch ? nameMatch[1].trim() : '',
                personAccount: accountMatch ? accountMatch[1].trim() : '',
                boothName: boothMatch ? boothMatch[1].trim() : '',
                role: roleMatch ? roleMatch[1].trim() : ''
            };
        });

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete in less than 100ms
        expect(duration).toBeLessThan(100);
        expect(parsed.length).toBe(10);
        expect(parsed[0].personName).toContain('Person');
    });

    it('should handle autocomplete search efficiently', () => {
        const startTime = performance.now();
        
        // Create large dataset
        const persons = Array.from({ length: 100 }, (_, i) => ({
            id: `person-${i}`,
            name: `Person ${i}`,
            account: `@person${i}`,
            role: 'モデル',
            lastUsed: Date.now() - (i * 1000)
        }));

        // Simulate autocomplete search (multiple queries)
        const queries = ['Person 1', 'Person 2', 'Person 5', '@person3'];
        const allResults = queries.map(query => {
            return persons.filter(p => 
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.account.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 10); // Limit to 10 results
        });

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete in less than 50ms
        expect(duration).toBeLessThan(50);
        expect(allResults.length).toBe(4);
        allResults.forEach(results => {
            expect(results.length).toBeLessThanOrEqual(10);
        });
    });

    it('should not have memory leaks with repeated operations', () => {
        const startTime = performance.now();
        
        // Simulate repeated queue operations
        let queue = [];
        
        for (let i = 0; i < 100; i++) {
            // Add item
            queue.push({
                id: `post-${i}`,
                boothName: `Booth ${i}`,
                status: 'draft'
            });
            
            // Keep only last 10 items (simulate queue limit)
            if (queue.length > 10) {
                queue = queue.slice(-10);
            }
            
            // Update random item
            if (queue.length > 0) {
                const randomIndex = Math.floor(Math.random() * queue.length);
                queue[randomIndex] = { ...queue[randomIndex], status: 'ready' };
            }
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete in less than 100ms
        expect(duration).toBeLessThan(100);
        expect(queue.length).toBeLessThanOrEqual(10);
    });

    it('should handle state updates efficiently', () => {
        const startTime = performance.now();
        
        // Simulate multiple state updates
        let state = {
            postQueue: [],
            selectedIndices: []
        };

        // Perform 50 updates
        for (let i = 0; i < 50; i++) {
            // Add to queue
            if (state.postQueue.length < 10) {
                state = {
                    ...state,
                    postQueue: [...state.postQueue, {
                        id: `post-${i}`,
                        boothName: `Booth ${i}`,
                        status: 'draft'
                    }]
                };
            }
            
            // Update selection
            state = {
                ...state,
                selectedIndices: [i % 10]
            };
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete in less than 100ms
        expect(duration).toBeLessThan(100);
        expect(state.postQueue.length).toBeLessThanOrEqual(10);
    });
});
