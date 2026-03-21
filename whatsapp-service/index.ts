import makeWASocket, { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    isJidBroadcast,
    proto,
    downloadMediaMessage
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

const UPLOADS_PATH = '/app/uploads';
if (!fs.existsSync(UPLOADS_PATH)) {
    fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}

const BASE_URL = process.env.BASE_URL || 'https://xentraldesk.com';

async function downloadAndSaveMedia(message: proto.IMessage) {
    const type = Object.keys(message)[0];
    const mimeType = (message as any)[type]?.mimetype || '';
    const extension = mimeType.split('/')[1]?.split(';')[0] || 'bin';
    const filename = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${extension}`;
    const localPath = path.join(UPLOADS_PATH, filename);

    try {
        const buffer = await downloadMediaMessage(
            { message } as any,
            'buffer',
            {},
            { 
                logger,
                reuploadRequest: sock.updateMediaMessage
            }
        );
        fs.writeFileSync(localPath, buffer);
        return `${BASE_URL}/uploads/${filename}`;
    } catch (err) {
        logger.error(`Failed to download media: ${err}`);
        return null;
    }
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
                    logger.warn('Logged out from device. Clearing session and preparing for new QR...');
                    shouldClearSession = true;
                    shouldReconnect = true; 
                } else if (statusCode === DisconnectReason.badSession || statusCode === 401) {
                    logger.error('Bad session or Unauthorized. Clearing session and retrying...');
                    shouldClearSession = true;
                    shouldReconnect = true;
                } else if (errorMsg.includes('Connection Failure') || statusCode === DisconnectReason.connectionClosed) {
                    logger.warn('Transient connection failure. Retrying in 5s...');
                    setTimeout(() => connectToWhatsApp(), 5000);
                    return;
                }

                if (shouldClearSession) {
                    if (fs.existsSync(AUTH_PATH)) {
                        logger.warn('Clearing sessions directory contents...');
                        try {
                            const files = fs.readdirSync(AUTH_PATH);
                            for (const file of files) {
                                fs.rmSync(path.join(AUTH_PATH, file), { recursive: true, force: true });
                            }
                        } catch (err) {
                            logger.error(`Error clearing sessions contents: ${err}`);
                        }
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
                        
                        const msgContent = msg.message;
                        if (!msgContent) continue;

                        let text = msgContent.conversation || msgContent.extendedTextMessage?.text || '';
                        let type = 'text';
                        let mediaUrl = null;

                        if (msgContent.imageMessage) {
                            type = 'image';
                            mediaUrl = await downloadAndSaveMedia(msgContent);
                        } else if (msgContent.videoMessage) {
                            type = 'video';
                            mediaUrl = await downloadAndSaveMedia(msgContent);
                        } else if (msgContent.audioMessage) {
                            type = 'audio';
                            mediaUrl = await downloadAndSaveMedia(msgContent);
                        } else if (msgContent.documentMessage) {
                            type = 'file';
                            mediaUrl = await downloadAndSaveMedia(msgContent);
                        }

                        // Prepare simplified payload for backend
                        const payload = {
                            remoteJid: msg.key.remoteJid,
                            pushName: msg.pushName || 'WhatsApp User',
                            message: {
                                text: mediaUrl || text,
                                type: type,
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
    const { to, text, type, mediaUrl } = req.body;
    if (!sock || connectionState !== 'open') {
        return res.status(500).json({ error: 'WhatsApp not connected' });
    }

    try {
        const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
        
        if (type === 'image' && mediaUrl) {
            await sock.sendMessage(jid, { image: { url: mediaUrl }, caption: text });
        } else if (type === 'video' && mediaUrl) {
            await sock.sendMessage(jid, { video: { url: mediaUrl }, caption: text });
        } else if ((type === 'audio' || type === 'voice') && mediaUrl) {
            await sock.sendMessage(jid, { audio: { url: mediaUrl }, ptt: true });
        } else if (type === 'file' && mediaUrl) {
            await sock.sendMessage(jid, { document: { url: mediaUrl }, fileName: 'file' });
        } else {
            await sock.sendMessage(jid, { text });
        }
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
        // Delete session contents safely
        if (fs.existsSync(AUTH_PATH)) {
            const files = fs.readdirSync(AUTH_PATH);
            for (const file of files) {
                fs.rmSync(path.join(AUTH_PATH, file), { recursive: true, force: true });
            }
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
