import { PostItem } from '@/store/useAppStore';

// Type definitions for the payload
interface WebhookPayload {
    timestamp: string;
    event: {
        eventEn: string;
        eventJp: string;
        date: string;
        venue: string;
        category: string;
        hashtags: string;
    };
    photo: {
        base64: string | null;
        filename?: string;
    };
    person: {
        name: string;
        role: string;
        account: string;
    };
    booth: {
        name: string;
        account: string;
    };
    posts: {
        // These will be generated on the server side (Make.com) or here?
        // Legacy code generated templates, let's keep it simple and just send raw data
        // unless we want to replicate the 'x1', 'x2', 'instagram' text generation.
        // For now, let's assume Make.com handles the text generation or we send a default.
        x1: string; // Placeholder or generated text
        x2: string;
        instagram: string;
    };
    settings?: {
        aiModel: string;
    };
}

export class WebhookService {
    private webhookUrl: string;

    constructor(url: string) {
        this.webhookUrl = url;
    }

    private generatePayload(post: PostItem): WebhookPayload {
        // Simple template generation (port from legacy if needed, or keep simple)
        const eventName = post.eventInfo.eventJp || post.eventInfo.eventEn || '';
        const personName = post.personName;
        const boothName = post.boothName;

        // Basic template
        const baseText = `${eventName}\n${boothName}ブース\n${personName}さん (@${post.personAccount})\n\n#${post.eventInfo.hashtags.trim().replace(/\s+/g, ' #')}`;

        return {
            timestamp: new Date().toISOString(),
            event: {
                eventEn: post.eventInfo.eventEn,
                eventJp: post.eventInfo.eventJp,
                date: post.eventInfo.date,
                venue: post.eventInfo.venue,
                category: post.eventInfo.category,
                hashtags: post.eventInfo.hashtags
            },
            photo: {
                base64: post.imageBase64
            },
            person: {
                name: post.personName,
                role: post.personRole,
                account: post.personAccount
            },
            booth: {
                name: post.boothName,
                account: post.boothAccount
            },
            posts: {
                x1: post.aiComment || baseText,
                x2: post.aiComment || baseText,
                instagram: post.aiComment || baseText
            },
            settings: {
                aiModel: 'gpt-4o' // Default or from store
            }
        };
    }

    async sendPost(post: PostItem): Promise<boolean> {
        if (!this.webhookUrl) throw new Error("Webhook URL is not set");

        const payload = this.generatePayload(post);

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error(`Webhook failed: ${response.status} ${response.statusText}`);
                return false;
            }
            return true;
        } catch (error) {
            console.error("Webhook error:", error);
            return false;
        }
    }
}
