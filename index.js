const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require("@discordjs/voice");
const request = require('request');
const fs = require('fs');
const { api } = require('selfcord-js-v14');
const express = require('express');

const client = new Client({ checkUpdate: false });
const config = require(`${process.cwd()}/config.json`);

// متغيرات التحكم في AFK
let isAFKActive = false;
let statusInterval = null;
let currentStatusIndex = 0;
let statusesList = [];

// إعداد Express للتحكم عبر الويب
const app = express();
const port = 3000;

// خدمة الملفات الثابتة
app.use(express.json());
app.use(express.static('public'));

// API Routes للتحكم
app.post('/api/start', (req, res) => {
    if (!isAFKActive) {
        startAFKMode();
        res.json({ success: true, message: 'AFK mode started', status: 'active' });
    } else {
        res.json({ success: false, message: 'AFK mode already active', status: 'active' });
    }
});

app.post('/api/stop', (req, res) => {
    if (isAFKActive) {
        stopAFKMode();
        res.json({ success: true, message: 'AFK mode stopped', status: 'inactive' });
    } else {
        res.json({ success: false, message: 'AFK mode already inactive', status: 'inactive' });
    }
});

app.get('/api/status', (req, res) => {
    res.json({ 
        active: isAFKActive,
        statusesCount: statusesList.length,
        currentIndex: currentStatusIndex
    });
});

// صفحة التحكم الرئيسية
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Discord AFK Control Panel</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                
                .container {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    max-width: 500px;
                    width: 100%;
                    text-align: center;
                }
                
                h1 {
                    color: #333;
                    margin-bottom: 10px;
                    font-size: 2em;
                }
                
                .subtitle {
                    color: #666;
                    margin-bottom: 30px;
                }
                
                .status-card {
                    background: #f5f5f5;
                    border-radius: 15px;
                    padding: 20px;
                    margin-bottom: 30px;
                }
                
                .status-indicator {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    margin-right: 10px;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                .status-active {
                    background: #10b981;
                    box-shadow: 0 0 10px #10b981;
                }
                
                .status-inactive {
                    background: #ef4444;
                }
                
                .status-text {
                    font-size: 1.2em;
                    font-weight: bold;
                    color: #333;
                }
                
                .button-group {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                
                button {
                    padding: 12px 30px;
                    font-size: 1.1em;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    font-weight: bold;
                }
                
                button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }
                
                button:active {
                    transform: translateY(0);
                }
                
                .btn-start {
                    background: #10b981;
                    color: white;
                }
                
                .btn-stop {
                    background: #ef4444;
                    color: white;
                }
                
                .info {
                    background: #e0e7ff;
                    padding: 15px;
                    border-radius: 10px;
                    margin-top: 20px;
                    font-size: 0.9em;
                    color: #4338ca;
                }
                
                .log {
                    background: #1e1e1e;
                    color: #00ff00;
                    padding: 15px;
                    border-radius: 10px;
                    margin-top: 20px;
                    text-align: left;
                    font-family: monospace;
                    font-size: 0.85em;
                    max-height: 200px;
                    overflow-y: auto;
                }
                
                .log-title {
                    color: #fff;
                    margin-bottom: 10px;
                    font-weight: bold;
                }
                
                @media (max-width: 600px) {
                    .container {
                        padding: 20px;
                    }
                    
                    button {
                        padding: 10px 20px;
                        font-size: 1em;
                    }
                    
                    .button-group {
                        flex-direction: column;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎮 Discord AFK Controller</h1>
                <p class="subtitle">تحكم في وضع AFK بضغطة زر</p>
                
                <div class="status-card">
                    <div class="status-text">
                        <span id="statusIndicator" class="status-indicator status-inactive"></span>
                        <span id="statusLabel">غير نشط</span>
                    </div>
                </div>
                
                <div class="button-group">
                    <button class="btn-start" onclick="startAFK()">▶ تشغيل AFK</button>
                    <button class="btn-stop" onclick="stopAFK()">⏹ إيقاف AFK</button>
                </div>
                
                <div class="info">
                    📊 الحالات المحملة: <strong id="statusCount">0</strong>
                </div>
                
                <div class="log">
                    <div class="log-title">📝 سجل الأحداث:</div>
                    <div id="logContent">جاهز للاستخدام...</div>
                </div>
            </div>
            
            <script>
                function addLog(message) {
                    const logDiv = document.getElementById('logContent');
                    const timestamp = new Date().toLocaleTimeString();
                    logDiv.innerHTML = \`[\${timestamp}] \${message}<br>\${logDiv.innerHTML}\`;
                    if (logDiv.children.length > 50) {
                        logDiv.removeChild(logDiv.lastChild);
                    }
                }
                
                async function startAFK() {
                    addLog('🔄 جاري تشغيل وضع AFK...');
                    try {
                        const response = await fetch('/api/start', { method: 'POST' });
                        const data = await response.json();
                        if (data.success) {
                            addLog('✅ ' + data.message);
                            updateStatus(true);
                        } else {
                            addLog('⚠️ ' + data.message);
                        }
                    } catch (error) {
                        addLog('❌ خطأ: ' + error.message);
                    }
                }
                
                async function stopAFK() {
                    addLog('🔄 جاري إيقاف وضع AFK...');
                    try {
                        const response = await fetch('/api/stop', { method: 'POST' });
                        const data = await response.json();
                        if (data.success) {
                            addLog('✅ ' + data.message);
                            updateStatus(false);
                        } else {
                            addLog('⚠️ ' + data.message);
                        }
                    } catch (error) {
                        addLog('❌ خطأ: ' + error.message);
                    }
                }
                
                async function updateStatus(isActive) {
                    const indicator = document.getElementById('statusIndicator');
                    const label = document.getElementById('statusLabel');
                    
                    if (isActive) {
                        indicator.className = 'status-indicator status-active';
                        label.textContent = 'نشط 🟢';
                        label.style.color = '#10b981';
                    } else {
                        indicator.className = 'status-indicator status-inactive';
                        label.textContent = 'غير نشط 🔴';
                        label.style.color = '#ef4444';
                    }
                }
                
                async function getStatus() {
                    try {
                        const response = await fetch('/api/status');
                        const data = await response.json();
                        document.getElementById('statusCount').textContent = data.statusesCount;
                        updateStatus(data.active);
                    } catch (error) {
                        console.error('Error fetching status:', error);
                    }
                }
                
                // تحديث الحالة كل 3 ثواني
                getStatus();
                setInterval(getStatus, 3000);
            </script>
        </body>
        </html>
    `);
});

// بدء الخادم
app.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Web control panel: http://localhost:${port}`);
    console.log(`📱 Open in browser: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
});

client.on('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log('=================================');
    console.log('🎮 AFK Bot is ready!');
    console.log('=================================');
    
    // تحميل الحالات من الملف
    try {
        statusesList = readStatusesFromFile('text.txt');
        console.log(`📝 Loaded ${statusesList.length} statuses from text.txt`);
    } catch (error) {
        console.error('Error loading statuses:', error);
        statusesList = ['AFK Mode'];
    }
    
    await api();
    
    if (config.Guild && config.Channel) {
        await joinVC(client, config);
    } else {
        console.log('⚠️ No voice channel configured');
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const oldVoice = oldState.channelId;
    const newVoice = newState.channelId;

    if (oldVoice !== newVoice) {
        if (!oldVoice) {
            // Joined a voice channel
        } else if (!newVoice) {
            // Left a voice channel
            if (oldState.member.id !== client.user.id) return;
            if (config.Guild && config.Channel) {
                await joinVC(client, config);
            }
        } else {
            // Switched voice channels
            if (oldState.member.id !== client.user.id) return;
            if (newVoice !== config.Channel) {
                if (config.Guild && config.Channel) {
                    await joinVC(client, config);
                }
            }
        }
    }
});

client.login(config.Token);

// دوال التحكم
function startAFKMode() {
    if (isAFKActive) return;
    
    isAFKActive = true;
    currentStatusIndex = 0;
    
    console.log('🟢 Starting AFK mode...');
    changeStatusImmediately();
    
    statusInterval = setInterval(() => {
        if (isAFKActive) {
            changeStatusImmediately();
        }
    }, 2500);
}

function stopAFKMode() {
    if (!isAFKActive) return;
    
    console.log('🔴 Stopping AFK mode...');
    
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
    
    isAFKActive = false;
    clearCustomStatus();
}

function changeStatusImmediately() {
    if (!statusesList.length) return;
    
    let status = statusesList[currentStatusIndex];
    let emoji_name = '';
    let emoji_id = null;

    if (status.includes('emoji:')) {
        const emojiDefinition = status.split('emoji:')[1].trim();
        const emojiParts = emojiDefinition.split(':');
        emoji_name = emojiParts[0];
        emoji_id = emojiParts[1] || null;
        status = status.split('emoji:')[0].trim();
    }

    change_status(config.Token, status, emoji_name, emoji_id);
    currentStatusIndex = (currentStatusIndex + 1) % statusesList.length;
}

function clearCustomStatus() {
    const options = {
        url: "https://discord.com/api/v10/users/@me/settings",
        headers: { 'Authorization': config.Token },
        json: true,
        body: { custom_status: null }
    };

    request.patch(options, (error, response, body) => {
        if (!error) console.log('✨ Custom status cleared');
    });
}

function change_status(token, status, emoji_name = '', emoji_id = null) {
    const options = {
        url: "https://discord.com/api/v10/users/@me/settings",
        headers: { 'Authorization': token },
        json: true,
        body: {
            custom_status: {
                text: status,
                emoji_name: emoji_name,
                emoji_id: emoji_id
            }
        }
    };

    request.patch(options, (error, response, body) => {
        if (error) {
            console.error('Error:', error);
        } else {
            console.log(`🔄 Status: ${status}`);
        }
    });
}

function readStatusesFromFile(filePath) {
    const statuses = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    return statuses;
}

async function joinVC(client, config) {
    const guild = client.guilds.cache.get(config.Guild);
    if (!guild) return;

    const voiceChannel = guild.channels.cache.get(config.Channel);
    if (!voiceChannel) return;

    joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true
    });
}