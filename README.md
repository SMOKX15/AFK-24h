# 🎤 Discord Self-Bot: Stay in Voice Channel 24/7 and Animate Your Status! ✨

Welcome to the **Discord Self-Bot**! This script allows you to remain in a voice channel 24/7 while automatically changing your Discord status periodically. Perfect for keeping your presence active and fun! 

## 📦 Features

- **24/7 Voice Channel Connection**: Automatically joins and remains in your designated voice channel.
- **Dynamic Status Updates**: Change your Discord status with custom messages and emojis every few seconds.
- **Easy Configuration**: Simple configuration setup to get you started quickly.

## 🚀 Getting Started

### 1. Prerequisites

Before using the self-bot, ensure you have the following installed:

- [Node.js](https://nodejs.org/en/) (v16.6.0 or higher)
- npm (Node Package Manager)

### 2. Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/hakuryuujs/discord-selfbot
   cd discord-selfbot
   ```

2. **Install dependencies**:

   ```bash
   npm i
   ```

3. **Modify configuration file**:

   Modify `config.json` file in the root directory of the selfbot with the following structure:

   ```json
   {
       "Token": "YOUR_DISCORD_TOKEN",
       "Guild": "YOUR_GUILD_ID",
       "Channel": "YOUR_VOICE_CHANNEL_ID"
   }
   ```

   > **Note**: Make sure to replace `YOUR_DISCORD_TOKEN`, `YOUR_GUILD_ID`, and `YOUR_VOICE_CHANNEL_ID` with your actual Discord token and channel IDs. You can find these IDs by enabling Developer Mode in Discord settings.

4. **Modify the text file for statuses**:

   Modfy `text.txt` file to store your custom statuses. Each status should be on a new line. To add an emoji, use the format:  
   `Status message emoji:emoji_name:emoji_id`

   Example:

   ```
   Playing a game emoji:game:123456789012345678
   Listening to music emoji:music:123456789012345678
   ```

### 3. Run the Script

Once everything is set up, run the script with:

```bash
node index.js
```

### 4. Enjoy! 🎉

Your self-bot will now connect to the specified voice channel and update your status every 2.5 seconds!

---

## ⚠️ Important Notes

- **Self-Bots**: Be aware that self-bots are against Discord's Terms of Service. Use this script responsibly and at your own risk.
- **Token Security**: Never share your Discord token with people. Keep it secure.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙌 Support

If you encounter any issues or have questions, feel free to open an issue in the repository!
