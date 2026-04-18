#!/usr/bin/env node

/**
 * Plaid Casino Telegram Bot
 * Minimal bot - only /start command
 */

require('dotenv').config({ path: '.env.local' });

const TelegramBot = require('node-telegram-bot-api');

// Bot configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'plaid_casino_bot';
const CASINO_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://plaidcas.live';
const CASINO_NAME = process.env.CASINO_NAME || 'Plaid Casino';

// Admin settings
const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [];
const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS ? process.env.SUPER_ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [];

// Casino settings
const MIN_BET = parseInt(process.env.MIN_BET) || 10;
const MAX_BET = parseInt(process.env.MAX_BET) || 500000;

// Feature flags
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';

if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env.local');
    process.exit(1);
}

// Create bot instance
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Plaid Casino Telegram Bot starting...');
console.log('🌐 Casino URL:', CASINO_URL);

// Helper functions
const isAdmin = (userId) => ADMIN_IDS.includes(userId) || SUPER_ADMIN_IDS.includes(userId);

// Maintenance mode check
const checkMaintenance = (msg) => {
    if (MAINTENANCE_MODE && !isAdmin(msg.from.id)) {
        bot.sendMessage(msg.chat.id, '🔧 Казино временно на техническом обслуживании. Попробуйте позже.');
        return true;
    }
    return false;
};

// Start command - the only command in the bot
bot.onText(/\/start/, (msg) => {
    if (checkMaintenance(msg)) return;
    
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'Игрок';
    const userId = msg.from.id;
    
    const isUserAdmin = isAdmin(userId);
    const adminBadge = isUserAdmin ? ' 👑' : '';
    
    const welcomeMessage = `🎰 Добро пожаловать в ${CASINO_NAME}, ${firstName}!${adminBadge}

🎮 **Доступные игры:**
• 🎲 Dice - Классические кости
• 🃏 Blackjack - Карточная игра 21  
• 🎯 Roulette - Европейская рулетка
• 💎 Mines - Сапёр с выигрышами
• 🎪 Plinko - Шарики и призы
• 🎡 Wheel - Колесо фортуны
• ✈️ Aviatrix - Краш-игра

💰 **Ставки:** от ${MIN_BET}₽ до ${MAX_BET}₽

👇 **Нажмите кнопку чтобы начать:**`;

    const keyboard = [
        [
            {
                text: '🎰 Играть в казино',
                web_app: { url: CASINO_URL }
            }
        ]
    ];

    const options = {
        reply_markup: {
            inline_keyboard: keyboard
        },
        parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, welcomeMessage, options);
});

// Error handling
bot.on('error', (error) => {
    console.error('❌ Bot error:', error);
});

bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Bot shutting down...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Bot shutting down...');
    bot.stopPolling();
    process.exit(0);
});

console.log('✅ Plaid Casino Telegram Bot is running!');
console.log('📱 Users can now interact with @' + BOT_USERNAME);
