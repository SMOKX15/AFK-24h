const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require("@discordjs/voice");
const request = require('request');
const fs = require('fs');
const { api } = require('selfcord-js-v14');

const client = new Client({ checkUpdate: false });
const config = require(`${process.cwd()}/config.json`);

// Variabile per tenere traccia se siamo già in coda per entrare
let isJoining = false;

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const token = config.Token;
    changeStatusesPeriodically(token);

    await api();

    // Controlla se l'account è già in un canale vocale
    const voiceState = client.user.voice;
    if (!voiceState.channelId) {
        // Non è in nessun canale vocale → entra
        if (config.Guild && config.Channel) {
            console.log('Account non in vocale, entro nel canale...');
            await joinVC(client, config);
        } else {
            console.error('No Guild or Channel specified in config.');
        }
    } else {
        console.log(`Account già in vocale: ${voiceState.channelId}`);
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    // Ignora eventi che non coinvolgono il nostro account
    if (oldState.member.id !== client.user.id) return;

    const wasInVoice = oldState.channelId !== null;
    const isNowInVoice = newState.channelId !== null;

    if (wasInVoice && !isNowInVoice) {
        // L'account è stato rimosso dal canale vocale (disconnesso o uscito)
        console.log('Account uscito dal canale vocale. Rientro...');
        
        // Evita tentativi multipli simultanei
        if (!isJoining && config.Guild && config.Channel) {
            isJoining = true;
            await joinVC(client, config);
            isJoining = false;
        }
    }
    // Non faccio NULLA se cambia canale o se entra da solo
});

client.login(config.Token);

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

    // Controlla di nuovo se è già in vocale prima di entrare
    if (client.user.voice.channelId) {
        console.log('Account già in un canale vocale, non entro.');
        return;
    }

    console.log(`Entro nel canale vocale: ${voiceChannel.name}`);
    
    joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true
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
            console.error('Error al cambiar el estado:', error);
        } else {
            console.log('Estado cambiado a:', status);
        }
    });
}

function readStatusesFromFile(filePath) {
    const statuses = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    return statuses;
}

async function changeStatusesPeriodically(token) {
    const statuses = readStatusesFromFile('text.txt');
    let index = 0;

    while (true) {
        let status = statuses[index];
        let emoji_name = '';
        let emoji_id = null;

        if (status.includes('emoji:')) {
            const emojiDefinition = status.split('emoji:')[1].trim();
            const emojiParts = emojiDefinition.split(':');
            emoji_name = emojiParts[0];
            emoji_id = emojiParts[1] || null;

            status = status.split('emoji:')[0].trim();
        }

        change_status(token, status, emoji_name, emoji_id);

        index = (index + 1) % statuses.length;

        await new Promise(resolve => setTimeout(resolve, 2500));
    }
}
