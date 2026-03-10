import AfricasTalking from 'africastalking';
import { logger } from '../utils/logger';

// Initialize SDK
const credentials = {
    apiKey: process.env.AT_API_KEY || 'sandbox',      // Use your sandbox/production key
    username: process.env.AT_USERNAME || 'sandbox'    // e.g., 'vaxcess-app'
};

const AT = AfricasTalking(credentials);
const voiceClient = AT.VOICE;

const LANGUAGE_AUDIO_MAP: Record<string, string> = {
    'Twi': 'https://vaxcess-audio-bucket.s3.amazonaws.com/reminders/twi_penta1.mp3',
    'Dagbani': 'https://vaxcess-audio-bucket.s3.amazonaws.com/reminders/dagbani_penta1.mp3',
    'Hausa': 'https://vaxcess-audio-bucket.s3.amazonaws.com/reminders/hausa_penta1.mp3',
    'English': 'https://vaxcess-audio-bucket.s3.amazonaws.com/reminders/en_penta1.mp3'
};

/**
 * Triggers a voice call to the Caregiver in their preferred language
 */
export async function scheduleVoiceReminder(caregiverPhone: string, language: string, vaccineType: string) {
    // Fallback to Twi or English if the language is missing/unsupported
    const audioUrl = LANGUAGE_AUDIO_MAP[language] || LANGUAGE_AUDIO_MAP['Twi'];

    try {
        const callResponse = await voiceClient.call({
            callFrom: process.env.AT_VIRTUAL_NUMBER || '+233000000000', // Your registered Africa's Talking number
            callTo: [caregiverPhone],
            // Not native to the SDK method above, you typically configure a callback URL 
            // in your AT Dashboard that responds with the XML below when the call connects.
        });

        logger.info("Call queued successfully:", callResponse);
        return callResponse;
    } catch (error) {
        logger.error("Failed to trigger Voice API:", error);
    }
}

/**
 * Example webhook handler snippet (Express.js)
 * When the call connects, AT sends a POST request here to figure out what to say/play.
 */
export function voiceCallbackHandler(reqBody: any): string {
    const { isActive, callerNumber } = reqBody;

    if (isActive === '1') {
        // Look up the user's language based on callerNumber
        // Build the XML response using `<Play>` tag to stream pre-recorded audio
        return `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Play url="https://vaxcess-audio-bucket.s3.amazonaws.com/reminders/twi_penta1.mp3" />
            </Response>`;
    } else {
        return 'Call complete';
    }
}
