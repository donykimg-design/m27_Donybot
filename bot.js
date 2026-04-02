require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const app = express();

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const PORT = process.env.PORT || 3000;

// --- SERVER NI UYG'OQ TUTISH ---
app.get('/', (req, res) => res.send('m27_YordamchiBot: Database Persistence Active! 🚀'));
app.listen(PORT, () => console.log(`Server is running on ${PORT}`));

// Self-ping mexanizmi (Serverni uyg'oq tutish uchun)
// Render linkini olganingizdan so'ng, uni shu yerga almashtiring
const RENDER_URL = `https://m27-donybot.onrender.com`; 

setInterval(async () => {
    try {
        await axios.get(RENDER_URL);
        console.log('✅ Bot uyg\'oq saqlanmoqda...');
    } catch (e) {
        console.log('⚠️ Ping yuborishda xato...');
    }
}, 10 * 60 * 1000); 

if (!TOKEN || !ADMIN_ID) {
    console.error('❌ BOT_TOKEN yoki ADMIN_ID topilmadi! Iltimos, .env faylini tekshiring.');
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// Admin va Foydalanuvchi holatlarini saqlash
const userStates = {};
const adminStates = {};

// Asosiy menyu
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ['👨‍💻 Men haqimda', '💼 Loyihalarim'],
            ['✅ Bog\'lanish', '📝 Murojaat yo\'llash']
        ],
        resize_keyboard: true
    }
};

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `👋 Assalomu alaykum, <b>${msg.from.first_name}</b>!\n\nBu m27_Dony ning rasmiy yordamchi boti. Quyidagi tugmalar orqali ma'lumot olishingiz yoki menga murojaat qoldirishingiz mumkin.`, { parse_mode: 'HTML', ...mainKeyboard });
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    // --- ADMIN UCHUN: JAVOB BERISH JARAYONI ---
    if (chatId === ADMIN_ID && adminStates[chatId] && adminStates[chatId].status === 'replying') {
        const targetUserId = adminStates[chatId].targetUserId;
        try {
            await bot.sendMessage(targetUserId, `💬 <b>m27 dan javob keldi:</b>\n\n${text}`, { parse_mode: 'HTML' });
            await bot.sendMessage(ADMIN_ID, `✅ Javobingiz foydalanuvchiga muvaffaqiyatli yetkazildi.`);
            delete adminStates[chatId];
        } catch (e) {
            bot.sendMessage(ADMIN_ID, `❌ Javob yuborishda xatolik! (Foydalanuvchi botni bloklagan bo'lishi mumkin).`);
        }
        return;
    }

    // --- ASOSIY MENYU TUGMALARI ---
    if (text === '👨‍💻 Men haqimda') {
        bot.sendMessage(chatId, 
            `👨‍💻 <b>Ismim Dostonbek</b>\n\n` +
            `🎓 Texnikum 1/2 talabasi\n` +
            `🚀 AI developer va bo'lajak Dasturchi`, 
            { parse_mode: 'HTML' });
    } 
    else if (text === '💼 Loyihalarim') {
        bot.sendMessage(chatId, `💼 <b>Mening loyihalarim:</b>\n\n1. @m27_AnonimBot\n2. soon...`, { parse_mode: 'HTML' });
    } 
    else if (text === '✅ Bog\'lanish') {
        bot.sendMessage(chatId, `✅ <b>Men bilan bog'lanish:</b>\n\nTelegram: @m27_Dony✅\n\nYana quyidagi tugma orqali murojaat qoldirishingiz ham mumkin ↓`, { parse_mode: 'HTML' });
    } 
    else if (text === '📝 Murojaat yo\'llash') {
        userStates[chatId] = 'waiting_feedback';
        
        const contactKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: "📞 Raqamimni yuborish", request_contact: true }],
                    ['⬅️ Ortga']
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };

        bot.sendMessage(chatId, `✍️ <b>Xabaringizni yozib qoldiring.</b>\nAgar sizga qo'ng'iroq qilishimni istasangiz, pastdagi tugma orqali raqamingizni yuborishingiz mumkin:`, { parse_mode: 'HTML', ...contactKeyboard });
    } 
    else if (text === '⬅️ Ortga') {
        delete userStates[chatId];
        bot.sendMessage(chatId, `Asosiy menyu:`, mainKeyboard);
    }

    // --- FOYDALANUVCHIDAN MUROJAAT QABUL QILISH ---
    else if (userStates[chatId] === 'waiting_feedback' && text) {
        sendFeedbackToAdmin(msg, text);
        bot.sendMessage(chatId, `✅ <b>Murojaatingiz qabul qilindi!</b>\nMen buni ko'rib, tez orada sizga bot orqali javob beraman.`, { parse_mode: 'HTML', ...mainKeyboard });
        delete userStates[chatId];
    }
});

// TEL RAQAM KELGANDA
bot.on('contact', (msg) => {
    const chatId = msg.chat.id.toString();
    if (userStates[chatId] === 'waiting_feedback') {
        const phone = msg.contact.phone_number;
        sendFeedbackToAdmin(msg, `[Foydalanuvchi telefon raqamini yubordi]`, phone);
        bot.sendMessage(chatId, `✅ <b>Raqamingiz qabul qilindi!</b>`, { parse_mode: 'HTML', ...mainKeyboard });
        delete userStates[chatId];
    }
});

// ADMINGA CHIROYLI REPORT YUBORISH FUNKSIYASI
async function sendFeedbackToAdmin(msg, content, phone = 'Yuborilmagan') {
    const user = msg.from;
    const report = 
        `📣 <b>Yangi murojaat!</b>\n\n` +
        `🆔 <b>ID:</b> <code>${user.id}</code>\n` +
        `👤 <b>Ismi:</b> ${user.first_name} ${user.last_name || ''}\n` +
        `📞 <b>Tel:</b> ${phone}\n` +
        `🌐 <b>Username:</b> @${user.username || 'yo\'q'}\n\n` +
        `🔗 <b>Profil:</b> <a href="tg://user?id=${user.id}">Akkauntga kirish</a>\n\n` +
        `📝 <b>Xabar matni:</b>\n<i>${content}</i>`;

    const replyBtn = {
        reply_markup: {
            inline_keyboard: [[{ text: "💬 Javob berish", callback_data: `reply_${user.id}` }]]
        }
    };

    try {
        await bot.sendMessage(ADMIN_ID, report, { parse_mode: 'HTML', ...replyBtn });
    } catch (e) {
        console.error('Adminga xabar yuborishda xato:', e);
    }
}

// ADMIN JAVOB BERISH TUGMASINI BOSGANDA
bot.on('callback_query', (query) => {
    const data = query.data;
    if (data.startsWith('reply_')) {
        const targetUserId = data.split('_')[1];
        adminStates[ADMIN_ID] = { status: 'replying', targetUserId: targetUserId };
        bot.sendMessage(ADMIN_ID, `✍️ <b>Foydalanuvchi uchun javobingizni yozib yuboring:</b>`, { parse_mode: 'HTML' });
        bot.answerCallbackQuery(query.id);
    }
});

// ASOSIY ERROR HANDLING (BOT HAR DOIM UYG'OQ TURISHI UCHUN)
bot.on('polling_error', (error) => {
    console.log('🤖 Polling error:', error.message);
});

bot.on('error', (error) => {
    console.log('🤖 General error:', error.message);
});

// KUTILMAGAN XATOLARDA TO'XTAB QOLMASLIGI UCHUN
process.on('uncaughtException', (error) => {
    console.log('🤖 Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('🤖 Unhandled Rejection:', reason);
});

console.log("🚀 m27 Rasmiy Yordamchi Boti muvaffaqiyatli ishga tushdi!");
