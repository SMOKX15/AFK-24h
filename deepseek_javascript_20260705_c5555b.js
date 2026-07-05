const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==========================================
// CARICA CONFIGURAZIONE
// ==========================================
let config = {};
try {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    console.log('✅ Config caricata');
} catch (e) {
    console.log('⚠️ config.json non trovato, creo default');
    config = { guildId: "", channelId: "" };
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
}

// ==========================================
// CARICA TOKEN
// ==========================================
function loadTokens() {
    try {
        return JSON.parse(fs.readFileSync('./tokens.json', 'utf8'));
    } catch (e) {
        return { accounts: [] };
    }
}

function saveTokens(data) {
    fs.writeFileSync('./tokens.json', JSON.stringify(data, null, 2));
}

// ==========================================
// API: CONFIGURAZIONE
// ==========================================
app.get('/api/config', (req, res) => {
    res.json(config);
});

app.post('/api/config', (req, res) => {
    const { guildId, channelId } = req.body;
    if (!guildId || !channelId) {
        return res.status(400).json({ error: 'Guild ID e Channel ID obbligatori' });
    }
    config.guildId = guildId;
    config.channelId = channelId;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
    res.json({ success: true, message: 'Configurazione salvata!' });
});

// ==========================================
// API: TOKEN
// ==========================================
app.get('/api/tokens', (req, res) => {
    const data = loadTokens();
    res.json(data.accounts);
});

app.post('/api/tokens', (req, res) => {
    const { name, token, isCentral } = req.body;
    if (!name || !token) {
        return res.status(400).json({ error: 'Nome e token obbligatori' });
    }

    const data = loadTokens();
    if (data.accounts.find(a => a.name === name)) {
        return res.status(400).json({ error: 'Nome già esistente' });
    }

    data.accounts.push({ name, token, isCentral: isCentral || false });
    saveTokens(data);
    res.json({ success: true, message: `Account ${name} aggiunto!` });
});

app.delete('/api/tokens/:name', (req, res) => {
    const name = req.params.name;
    const data = loadTokens();
    data.accounts = data.accounts.filter(a => a.name !== name);
    saveTokens(data);
    res.json({ success: true, message: `Account ${name} rimosso` });
});

// ==========================================
// API: AVVIA SELFBOT
// ==========================================
app.post('/api/start', (req, res) => {
    const data = loadTokens();

    if (!config.guildId || !config.channelId) {
        return res.status(400).json({ error: 'Configura prima Guild ID e Channel ID' });
    }

    if (data.accounts.length === 0) {
        return res.status(400).json({ error: 'Nessun account salvato' });
    }

    if (!fs.existsSync('./selfbot')) {
        fs.mkdirSync('./selfbot');
    }

    const selfbotCode = generateSelfbotCode(config, data.accounts);
    fs.writeFileSync('./selfbot/index.js', selfbotCode);

    const packageJson = {
        name: "selfbot-afk",
        version: "1.0.0",
        scripts: { start: "node index.js" },
        dependencies: {
            "discord.js-selfbot-v13": "3.6.0",
            "@discordjs/opus": "^0.9.0",
            "ffmpeg-static": "^5.2.0"
        }
    };
    fs.writeFileSync('./selfbot/package.json', JSON.stringify(packageJson, null, 2));

    try {
        const install = spawn('npm', ['install'], { cwd: './selfbot' });
        install.on('close', () => {
            const selfbot = spawn('npm', ['start'], {
                cwd: './selfbot',
                detached: true,
                stdio: 'ignore'
            });
            selfbot.unref();
            console.log('🚀 Selfbot avviato!');
        });
        res.json({ success: true, message: 'Selfbot in avvio! Controlla i log.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// API: FERMA SELFBOT
// ==========================================
app.post('/api/stop', (req, res) => {
    try {
        const { exec } = require('child_process');
        exec('pkill -f "node.*selfbot"', (err) => {
            if (err) {
                return res.json({ success: true, message: 'Nessun selfbot in esecuzione' });
            }
            console.log('🛑 Selfbot fermato');
            res.json({ success: true, message: 'Selfbot fermato' });
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ==========================================
// GENERA CODICE SELFBOT
// ==========================================
function generateSelfbotCode(config, accounts) {
    const central = accounts.find(a => a.isCentral) || accounts[0];
    
    return `
const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');

process.env.NODE_OPTIONS = '--max-old-space-size=512';

const CENTRAL_NAME = '${central.name}';
const AFK_COMMAND = 'khali account afk';
const GUILD_ID = '${config.guildId}';
const TARGET_CHANNEL = '${config.channelId}';

const allClients = [];

function randomDelay(min, max) {
    return (min + Math.random() * (max - min)) * 1000;
}

async function joinAfkChannel(client) {
    if (!client || !client.user) return false;
    const tag = client.user.tag;
    try {
        const channel = client.channels.cache.get(TARGET_CHANNEL);
        if (!channel) {
            console.log(\`❌ \${tag}: Canale non trovato\`);
            return false;
        }
        if (!channel.isVoice()) {
            console.log(\`❌ \${tag}: Non è un canale vocale\`);
            return false;
        }
        const voiceState = channel.guild.voiceStates.cache.get(client.user.id);
        if (voiceState && voiceState.channelId === TARGET_CHANNEL) {
            console.log(\`ℹ️ \${tag}: già nel canale AFK\`);
            return true;
        }
        console.log(\`🎤 \${tag}: entro in \${channel.name}...\`);
        await client.voice.joinChannel(channel, { selfMute: true, selfDeaf: true });
        console.log(\`✅ \${tag}: CONNESSO a \${channel.name}\`);
        return true;
    } catch (e) {
        console.log(\`❌ \${tag}: errore: \${e.message}\`);
        return false;
    }
}

async function handleDM(client, message) {
    if (!client || !client.user) return;
    if (message.guild) return;
    const content = message.content.toLowerCase().trim();
    if (!content.includes(AFK_COMMAND)) return;
    const centralClient = allClients.find(c => c.isCentral === true);
    if (!centralClient || message.author.id !== centralClient.user?.id) return;
    if (client.isCentral === true) return;
    console.log(\`📨 Comando DM da \${message.author.tag} per \${client.user.tag}\`);
    await joinAfkChannel(client);
}

function createAccount(acc) {
    const client = new Client({ checkUpdate: false });
    client.isCentral = acc.isCentral || false;
    client.on('ready', () => {
        console.log(\`✅ \${client.user.tag}: connesso!\`);
        client.on('messageCreate', async (message) => {
            await handleDM(client, message);
        });
    });
    client.on('voiceStateUpdate', (oldState, newState) => {
        if (!client || !client.user) return;
        if (!newState || !newState.member) return;
        if (newState.member.id !== client.user.id) return;
        const oldChannelId = oldState?.channelId || null;
        const newChannelId = newState?.channelId || null;
        const tag = client.user.tag;
        if (newChannelId === TARGET_CHANNEL) {
            console.log(\`✅ \${tag}: entrato nel target AFK\`);
            return;
        }
        if (oldChannelId === TARGET_CHANNEL && newChannelId !== TARGET_CHANNEL) {
            console.log(\`ℹ️ \${tag}: uscito dal target, NON tornerà\`);
            return;
        }
        if (oldChannelId && !newChannelId) {
            const delay = randomDelay(30, 60);
            const seconds = Math.round(delay / 1000);
            console.log(\`⏳ \${tag}: uscito da tutti i canali, AFK tra \${seconds} secondi...\`);
            setTimeout(async () => {
                const guild = client.guilds.cache.get(GUILD_ID);
                if (guild) {
                    const voiceState = guild.voiceStates.cache.get(client.user.id);
                    if (!voiceState || !voiceState.channelId) {
                        console.log(\`🎯 \${tag}: timer scaduto, entro in AFK\`);
                        await joinAfkChannel(client);
                    }
                }
            }, delay);
        }
    });
    client.on('error', (err) => {
        console.log(\`❌ \${client.user?.tag || acc.name}: errore: \${err.message}\`);
    });
    client.login(acc.token).catch(err => {
        console.log(\`❌ Login fallito per \${acc.name}: \${err.message}\`);
    });
    allClients.push(client);
    return client;
}

console.log('🚀 Selfbot avviato');
console.log(\`📋 Caricamento \${${accounts.length}} account\`);

${accounts.map(a => `createAccount({ name: '${a.name}', token: '${a.token}', isCentral: ${a.isCentral || false} });`).join('\n')}

console.log('✅ Selfbot pronto');
`;
}

// ==========================================
// PING PER MANTENERE ATTIVO
// ==========================================
setInterval(() => {
    console.log(`💓 Ping: ${new Date().toLocaleTimeString()}`);
}, 60000);

// ==========================================
// AVVIA SERVER
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 IL TUO SITO È ONLINE!`);
    console.log(`📲 Accedi a: https://tuo-progetto.railway.app`);
    console.log(`📋 Usa il pannello per gestire i tuoi account Discord\n`);
});