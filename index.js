const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require("@discordjs/voice");
const request = require('request');
const fs = require('fs');
const { api } = require('selfcord-js-v14');
const readline = require('readline');

const client = new Client({ checkUpdate: false });
const config = require(`${process.cwd()}/config.json`);

// متغيرات التحكم في AFK
let isAFKActive = false;
let statusInterval = null;
let currentStatusIndex = 0;
let statusesList = [];

// إعداد readline للتحكم من الطرفية
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('\n=================================');
    console.log('✅ Bot is ready!');
    console.log('=================================');
    console.log('Commands:');
    console.log('  • Type "start" to start AFK mode');
    console.log('  • Type "stop" to stop AFK mode');
    console.log('  • Type "exit" to quit the bot');
    console.log('=================================\n');

    const token = config.Token;
    
    // تحميل الحالات من الملف مرة واحدة
    statusesList = readStatusesFromFile('text.txt');
    console.log(`📝 Loaded ${statusesList.length} statuses from text.txt`);

    await api(); 

    if (config.Guild && config.Channel) {
        await joinVC(client, config);
    } else {
        console.error('No Guild or Channel specified in config.');
    }

    // بدء الاستماع لأوامر المستخدم
    listenForCommands();
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

// دالة الاستماع للأوامر من الطرفية
function listenForCommands() {
    rl.on('line', (input) => {
        const command = input.trim().toLowerCase();
        
        if (command === 'start') {
            startAFKMode();
        } else if (command === 'stop') {
            stopAFKMode();
        } else if (command === 'exit') {
            console.log('👋 Shutting down bot...');
            stopAFKMode();
            setTimeout(() => {
                client.destroy();
                rl.close();
                process.exit(0);
            }, 1000);
        } else if (command === 'status') {
            console.log(`AFK Mode is ${isAFKActive ? 'ACTIVE 🟢' : 'INACTIVE 🔴'}`);
        } else {
            console.log('❌ Unknown command. Available: start, stop, status, exit');
        }
    });
}

// دالة تشغيل وضع AFK
function startAFKMode() {
    if (isAFKActive) {
        console.log('⚠️ AFK mode is already active!');
        return;
    }
    
    isAFKActive = true;
    currentStatusIndex = 0;
    
    console.log('🟢 Starting AFK mode...');
    
    // تغيير الحالة فوراً
    changeStatusImmediately();
    
    // بدء المؤقت لتغيير الحالات بشكل دوري
    statusInterval = setInterval(() => {
        if (isAFKActive) {
            changeStatusImmediately();
        }
    }, 2500);
    
    console.log('✅ AFK mode is now ACTIVE');
    console.log(`📝 Cycling through ${statusesList.length} statuses every 2.5 seconds`);
}

// دالة إيقاف وضع AFK
function stopAFKMode() {
    if (!isAFKActive) {
        console.log('⚠️ AFK mode is already inactive!');
        return;
    }
    
    console.log('🔴 Stopping AFK mode...');
    
    // إيقاف المؤقت
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
    
    isAFKActive = false;
    
    // حذف الحالة المخصصة (custom status)
    clearCustomStatus();
    
    console.log('✅ AFK mode is now INACTIVE');
    console.log('💬 Custom status has been cleared');
}

// دالة تغيير الحالة مباشرة
function changeStatusImmediately() {
    if (!statusesList.length) {
        console.error('❌ No statuses found in text.txt');
        return;
    }
    
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
    
    // التالي للحالة القادمة
    currentStatusIndex = (currentStatusIndex + 1) % statusesList.length;
}

// دالة مسح الحالة المخصصة
function clearCustomStatus() {
    const options = {
        url: "https://discord.com/api/v10/users/@me/settings",
        headers: {
            'Authorization': config.Token
        },
        json: true,
        body: {
            custom_status: null
        }
    };

    request.patch(options, (error, response, body) => {
        if (error) {
            console.error('Error clearing status:', error);
        } else {
            console.log('✨ Custom status cleared successfully');
        }
    });
}

function change_status(token, status, emoji_name = '', emoji_id = null) {
    const options = {
        url: "https://discord.com/api/v10/users/@me/settings",
        headers: {
            'Authorization': token
        },
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
            console.error('Error changing status:', error);
        } else {
            console.log(`🔄 Status changed to: ${status} ${emoji_name ? '[' + emoji_name + ']' : ''}`);
        }
    });
}

function readStatusesFromFile(filePath) {
    try {
        const statuses = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
        return statuses;
    } catch (error) {
        console.error('Error reading statuses file:', error);
        return ['AFK Mode'];
    }
}

async function joinVC(client, config) {
    const guild = client.guilds.cache.get(config.Guild);
    if (!guild) {
        console.error('Guild not found in cache.');
        return;
    }

    const voiceChannel = guild.channels.cache.get(config.Channel);
    if (!voiceChannel) {
        console.error('Voice channel not found in guild.');
        return;
    }

    joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true
    });
}

// معالجة إغلاق البرنامج بشكل نظيف
process.on('SIGINT', () => {
    console.log('\n\n⚠️ Received SIGINT. Shutting down...');
    stopAFKMode();
    setTimeout(() => {
        client.destroy();
        rl.close();
        process.exit(0);
    }, 1000);
});