const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const { CronJob } = require("cron");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1476694169240993793";
const NEWS_API = process.env.NEWS_API;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// 🔎 Fonction récupération news macro
async function getMacroNews() {
  try {
    const url = `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=5&apiKey=${NEWS_API}`;
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
function generateBias() {
  // Ici tu peux améliorer avec logique avancée plus tard
  const biases = [
    "Bullish USD (risk-off possible)",
    "Bearish USD (risk-on possible)",
    "Range / Indécision macro",
  ];
  return biases[Math.floor(Math.random() * biases.length)];
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

  // 📊 Daily Macro (08:00 Dubaï = 04:00 UTC)
new CronJob("0 4 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const bias = generateBias();

  const message = formatMessage(news, bias);

  channel.send("📊 **Morning Macro Briefing (Dubai 08:00)**\n\n" + message);
}, null, true, "UTC");


// 🗞️ US Update (15:30 Dubaï = 11:30 UTC)
new CronJob("30 11 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const bias = generateBias();

  const message = formatMessage(news, bias);

  channel.send("🗞️ **US Session Update (Dubai 15:30)**\n\n" + message);
}, null, true, "UTC");

client.login(TOKEN);
