const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const cron = require("node-cron");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1476694169240993793";
const NEWS_API = process.env.NEWS_API;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// 🔎 Fonction récupération news macro
async function getMacroNews() {
  try {
    const url = `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=5&apiKey=${process.env.NEWS_API}`;
    const res = await axios.get(url);

    return res.data.articles.map(a => ({
      title: a.title,
      source: a.source.name
    }));
  } catch (err) {
    console.log("Erreur API news:", err.message);
    return [];
  }
}

// 📊 Génération biais simple (placeholder intelligent)
function generateBias(news) {
  let bullish = 0;
  let bearish = 0;

  news.forEach(n => {
    const text = n.title.toLowerCase();

    if (text.includes("inflation") || text.includes("rate") || text.includes("hike")) {
      bearish++;
    }

    if (text.includes("cut") || text.includes("dovish") || text.includes("growth")) {
      bullish++;
    }
  });

  if (bullish > bearish) return "Bullish (Risk-On)";
  if (bearish > bullish) return "Bearish (Risk-Off)";
  return "Neutral / Indecision";
}

// 🧾 Format message pro pour élèves
function formatMessage(news, bias) {
  let msg = `📊 **Daily Macro Briefing**\n\n`;

  msg += `📌 **Market Bias (Global)**:\n`;
  msg += `➡️ ${bias}\n\n`;

  msg += `🗞️ **Macro News**:\n`;

  news.forEach((n, i) => {
    msg += `\n${i + 1}. ${n.title} (${n.source})`;
  });

  msg += `\n\n💱 **Pairs Watchlist**:\n`;
  msg += `- XAU/USD\n- EUR/USD\n- USD/JPY\n\n`;

  msg += `⚠️ Always wait for confirmation before entering trades.`;

  return msg;
}

// 🚀 Bot prêt
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (channel) {
      await channel.send("✅ Bot connecté et opérationnel !");
      console.log("Message envoyé");
    } else {
      console.log("Channel introuvable");
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi du message :", error);
  }
});


// 📊 Morning Macro (08:00 Dubai = 04:00 UTC)
cron.schedule("*/1 * * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const bias = generateBias(news);
  const message = formatMessage(news, bias);

  channel.send("📊 **Morning Macro Briefing (Dubai 08:00)**\n\n" + message);
});

// 🗞️ US Update (15:30 Dubai = 11:30 UTC)
cron.schedule("*/1 * * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const bias = generateBias(news);
  const message = formatMessage(news, bias);

  channel.send("🗞️ **US Session Update (Dubai 15:30)**\n\n" + message);
});

client.login(TOKEN);
