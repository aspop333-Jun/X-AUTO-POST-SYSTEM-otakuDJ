export interface PersonRecord {
    id: string;
    name: string;
    account: string;
    role: string;
    lastUsed: number;
    useCount: number;
    events: string[];
}

const STORAGE_KEY = 'autopost_persons';
const MAX_RECORDS = 500;

export class PersonDatabase {
    private records: PersonRecord[];

    constructor() {
        this.records = this.loadRecords();
    }

    private loadRecords(): PersonRecord[] {
        if (typeof window === 'undefined') return [];
        try {
            const item = localStorage.getItem(STORAGE_KEY);
            return item ? JSON.parse(item) : [];
        } catch (e) {
            console.warn('Failed to load person records', e);
            return [];
        }
    }

    private saveRecords(): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
        } catch (e) {
            console.warn('Failed to save person records', e);
        }
    }

    private generateId(): string {
        return `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    search(query: string, limit = 10): PersonRecord[] {
        if (!query) return [];
        const normalized = query.toLowerCase().trim();
        const matches = this.records.filter(r =>
            r.name.toLowerCase().includes(normalized) ||
            r.account.toLowerCase().includes(normalized)
        );
        return matches.sort((a, b) => b.lastUsed - a.lastUsed).slice(0, limit);
    }

    add(person: { name: string; account: string; role?: string; events?: string[] }): PersonRecord {
        const existing = this.records.find(
            r => r.name === person.name && r.account === person.account
        );

        if (existing) {
            existing.role = person.role || existing.role;
            existing.lastUsed = Date.now();
            existing.useCount += 1;
            if (person.events) {
                person.events.forEach(e => {
                    if (!existing.events.includes(e)) existing.events.push(e);
                });
            }
            this.saveRecords();
            return existing;
        }

        const newRecord: PersonRecord = {
            id: this.generateId(),
            name: person.name,
            account: person.account,
            role: person.role || '',
            lastUsed: Date.now(),
            useCount: 1,
            events: person.events || []
        };

        this.records.push(newRecord);

        if (this.records.length > MAX_RECORDS) {
            this.records.sort((a, b) => {
                const scoreA = a.useCount * 0.3 + (a.lastUsed / 1000000) * 0.7;
                const scoreB = b.useCount * 0.3 + (b.lastUsed / 1000000) * 0.7;
                return scoreA - scoreB;
            });
            this.records.shift();
        }

        this.saveRecords();
        return newRecord;
    }

    getRecent(limit = 10): PersonRecord[] {
        return [...this.records].sort((a, b) => b.lastUsed - a.lastUsed).slice(0, limit);
    }
}

export const personDb = new PersonDatabase();
