import makeWASocket, { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    isJidBroadcast,
    proto
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import express from 'express';
import axios from 'axios';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const logger = pino({ level: 'info' });
const app = express();
app.use(express.json());

const PORT = 3001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://api:8000/api/v1/webhooks/whatsapp';
const AUTH_PATH = './sessions';

if (!fs.existsSync(AUTH_PATH)) {
    fs.mkdirSync(AUTH_PATH, { recursive: true });
}

let sock: any = null;
let qrCode: string | null = null;
let connectionState: 'connecting' | 'open' | 'close' | 'refused' = 'close';

async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
        const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

        sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            generateHighQualityQR: true,
            browser: ['Ubuntu', 'Chrome', '20.0.04']
        });

        sock.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                qrCode = await QRCode.toDataURL(qr);
                logger.info('New QR code generated');
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const errorMsg = lastDisconnect?.error?.message || 'Unknown Error';
                
                logger.info({ statusCode, errorMsg }, `Connection closed`);

                connectionState = 'close';
                qrCode = null;

                // Logic to determine if we should reconnect or clear session
                let shouldReconnect = true;
                let shouldClearSession = false;

                if (statusCode === DisconnectReason.loggedOut) {
                    logger.error('Logged out from device. Will not reconnect automatically.');
                    shouldReconnect = false;
                    shouldClearSession = true; // Clear session so we can get a new QR
                } else if (statusCode === DisconnectReason.badSession || statusCode === 401) {
                    logger.error('Bad session or Unauthorized. Clearing session...');
                    shouldClearSession = true;
                } else if (errorMsg.includes('Connection Failure') || statusCode === DisconnectReason.connectionClosed) {
                    logger.warn('Transient connection failure. Retrying in 5s...');
                    setTimeout(() => connectToWhatsApp(), 5000);
                    return;
                }

                if (shouldClearSession) {
                    if (fs.existsSync(AUTH_PATH)) {
                        fs.rmSync(AUTH_PATH, { recursive: true, force: true });
                        fs.mkdirSync(AUTH_PATH, { recursive: true });
                    }
                }

                if (shouldReconnect) {
                    logger.info('Attempting to reconnect...');
                    connectToWhatsApp();
                }
            } else if (connection === 'open') {
                logger.info('WhatsApp connection opened');
                qrCode = null;
                connectionState = 'open';
            } else if (connection === 'connecting') {
                connectionState = 'connecting';
                logger.info('WhatsApp connecting...');
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async (m: any) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    if (!msg.key.fromMe && !isJidBroadcast(msg.key.remoteJid)) {
                        logger.info(`Received WhatsApp message from: ${msg.key.remoteJid}`);
                        
                        // Prepare simplified payload for backend
                        const payload = {
                            remoteJid: msg.key.remoteJid,
                            pushName: msg.pushName || 'WhatsApp User',
                            message: {
                                text: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
                                type: msg.message?.imageMessage ? 'image' : msg.message?.videoMessage ? 'video' : 'text',
                                timestamp: msg.messageTimestamp,
                                id: msg.key.id
                            },
                            raw: msg
                        };

                        try {
                            await axios.post(BACKEND_URL, payload);
                        } catch (err) {
                            logger.error(`Failed to relay message to backend: ${err}`);
                        }
                    }
                }
            }
        });
    } catch (err) {
        logger.error(`Failed to connect to WhatsApp: ${err}`);
        // Retry in 10s if initialization fails
        setTimeout(() => connectToWhatsApp(), 10000);
    }
}

// API Endpoints
app.get('/status', (req, res) => {
    res.json({ state: connectionState, authenticated: connectionState === 'open' });
});

app.get('/qr', (req, res) => {
    if (connectionState === 'open') {
        return res.json({ status: 'authenticated' });
    }
    if (qrCode) {
        res.json({ status: 'qr', qr: qrCode });
    } else {
        res.json({ status: 'waiting', message: 'Generating QR code...' });
    }
});

app.post('/send', async (req, res) => {
    const { to, text, type } = req.body;
    if (!sock || connectionState !== 'open') {
        return res.status(500).json({ error: 'WhatsApp not connected' });
    }

    try {
        const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text });
        res.json({ success: true });
    } catch (err) {
        logger.error(`Failed to send message: ${err}`);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

app.post('/logout', async (req, res) => {
    if (sock) {
        await sock.logout().catch(() => {});
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Not connected' });
    }
});

app.post('/clear-session', async (req, res) => {
    try {
        if (sock) {
            await sock.logout().catch(() => {});
            sock = null;
        }
        // Delete session files
        if (fs.existsSync(AUTH_PATH)) {
            fs.rmSync(AUTH_PATH, { recursive: true, force: true });
            fs.mkdirSync(AUTH_PATH, { recursive: true });
        }
        qrCode = null;
        connectionState = 'close';
        
        // Re-initialize
        connectToWhatsApp();
        
        res.json({ success: true });
    } catch (err) {
        logger.error(`Failed to clear session: ${err}`);
        res.status(500).json({ error: 'Failed to clear session' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', connection: connectionState });
});

app.listen(PORT, () => {
    logger.info(`WhatsApp bridge listening on port ${PORT}`);
    connectToWhatsApp();
});
