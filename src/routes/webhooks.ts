import { Router } from 'express';
import { voiceCallbackHandler } from '../services/voice-service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route POST /api/webhooks/voice
 * @desc Handles incoming webhook callbacks from Africa's Talking API when a call connects
 */
router.post('/voice', (req, res) => {
    try {
        // Voice callback handler returns the XML response that tells the dialer what to play
        const xmlResponse = voiceCallbackHandler(req.body);

        // Africa's Talking expects content type to be text/plain or application/xml
        res.set('Content-Type', 'text/plain');
        res.status(200).send(xmlResponse);
    } catch (error) {
        logger.error('Error handling voice webhook:', error);
        // Even on error, it's best to return a generic fallback XML to avoid silent call failures
        res.set('Content-Type', 'text/plain');
        res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>`);
    }
});

export default router;
