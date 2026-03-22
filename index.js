const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const cron = require("node-cron");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1476694169240993793";
const NEWS_API = process.env.NEWS_API;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


// 🔎 Fonction récupération news macro
async function getMacroNews() {
  try {
    const url = `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=10&apiKey=${NEWS_API}`;
    const res = await axios.get(url);

    const keywords = [
      "inflation",
      "interest rate",
      "fed",
      "central bank",
      "cpi",
      "fomc",
      "gdp",
      "recession"
    ];

    const filtered = res.data.articles.filter(a => {
      const title = a.title.toLowerCase();
      return keywords.some(k => title.includes(k));
    });

    const finalNews = filtered.length > 0 ? filtered : res.data.articles;

    return finalNews.map(a => ({
      title: a.title,
      source: a.source.name
    }));

  } catch (err) {
    console.log("Erreur API news:", err.message);
    return [];
  }
}


// 📊 Génération biais
function generateBias(news) {
  let score = 0;

  news.forEach(n => {
    const text = n.title.toLowerCase();

    if (text.includes("inflation")) score -= 2;
    if (text.includes("rate hike")) score -= 2;
    if (text.includes("hawkish")) score -= 1;

    if (text.includes("rate cut")) score += 2;
    if (text.includes("dovish")) score += 1;
    if (text.includes("growth")) score += 1;
  });

  let sentiment = "Neutral";
  if (score >= 2) sentiment = "Bullish (Risk-On)";
  if (score <= -2) sentiment = "Bearish (Risk-Off)";

  return { score, sentiment };
}


// 📊 Analyse actifs
function analyzeAssets(score) {
  let focus = [];

  if (score <= -2) {
    focus.push("💵 USD Strength");
    focus.push("📉 Gold Weak");
    focus.push("📉 Indices Weak");
  }

  if (score >= 2) {
    focus.push("📉 USD Weak");
    focus.push("📈 Gold Strong");
    focus.push("📈 Indices Strong");
  }

  if (score > -2 && score < 2) {
    focus.push("⚖️ Range / No clear direction");
  }

  return focus;
}


// 🧾 Format message
function formatMessage(news, biasData) {
  let msg = `📊 **Daily Macro Briefing (Pro)**\n\n`;

  msg += `📌 **Bias Score**: ${biasData.score}\n`;
  msg += `🧠 **Sentiment**: ${biasData.sentiment}\n\n`;

  msg += `🔥 **High Impact News**:\n`;

  if (news.length === 0) {
    msg += `\nNo major macro news detected.`;
  } else {
    news.slice(0, 5).forEach((n, i) => {
      msg += `\n${i + 1}. ${n.title} (${n.source})`;
    });
  }

  const focus = analyzeAssets(biasData.score);

  msg += `\n\n💱 **Market Focus**:\n`;
  focus.forEach(f => {
    msg += `- ${f}\n`;
  });

  msg += `\n⚠️ Wait for confirmations before trading.`;

  return msg;
}


// 🚀 READY
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (channel) {
      await channel.send("✅ Bot connecté et opérationnel !");
      console.log("Message envoyé");
    }
  } catch (error) {
    console.error(error);
  }
});


// 📩 Commande !macro
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!macro") {
    const news = await getMacroNews();
    const biasData = generateBias(news);

    const msg = formatMessage(news, biasData);

    message.channel.send(msg);
  }
});


// ⏰ CRON MORNING
cron.schedule("0 4 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const biasData = generateBias(news);

  const message = formatMessage(news, biasData);

  channel.send("📊 **Morning Macro Briefing (Dubai 08:00)**\n\n" + message);
});


// ⏰ CRON US SESSION
cron.schedule("30 11 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const biasData = generateBias(news);

  const message = formatMessage(news, biasData);

  channel.send("🗞️ **US Session Update (Dubai 15:30)**\n\n" + message);
});


// 🔐 LOGIN
client.login(TOKEN);
