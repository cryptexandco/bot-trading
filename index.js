const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const cron = require("node-cron");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1476694169240993793";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

const NEWS_API = process.env.NEWS_API;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


// =========================
// 🗞️ NEWS MACRO
// =========================
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


// =========================
// 📅 ECONOMIC CALENDAR (RAPIDAPI)
// =========================
async function getEconomicCalendar() {
  try {
    const options = {
      method: "GET",
      url: `https://${RAPIDAPI_HOST}/economic-calendar`,
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST
      }
    };

    const res = await axios.request(options);

    return res.data.map(e => ({
      title: e.event || e.title,
      country: e.country,
      impact: e.impact
    }));

  } catch (err) {
    console.log("Erreur calendar:", err.message);
    return [];
  }
}


// =========================
// 📊 BIAS
// =========================
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


// =========================
// ⚡ VOLATILITY
// =========================
function calculateVolatility(news, events) {
  let score = 0;

  news.forEach(n => {
    const t = n.title.toLowerCase();

    if (t.includes("cpi")) score += 3;
    if (t.includes("nfp")) score += 3;
    if (t.includes("fed") || t.includes("fomc")) score += 3;
  });

  events.forEach(e => {
    if (!e.impact) return;

    const impact = e.impact.toLowerCase();

    if (impact.includes("high")) score += 3;
    if (impact.includes("medium")) score += 2;
  });

  if (score >= 6) return "🔥 High Volatility Expected";
  if (score >= 3) return "⚠️ Medium Volatility";
  return "⚖️ Low Volatility";
}


// =========================
// 🧾 FORMAT MESSAGE
// =========================
function formatMessage(news, biasData, events, volatility) {
  let msg = `📊 **Macro Report (Pro+)**\n\n`;

  msg += `📌 **Bias Score**: ${biasData.score}\n`;
  msg += `🧠 **Sentiment**: ${biasData.sentiment}\n`;
  msg += `⚡ **Volatility**: ${volatility}\n\n`;

  msg += `🔥 **High Impact News**:\n`;

  if (news.length === 0) {
    msg += `No macro news detected.\n`;
  } else {
    news.slice(0, 5).forEach((n, i) => {
      msg += `\n${i + 1}. ${n.title} (${n.source})`;
    });
  }

  msg += `\n\n📅 **Economic Calendar**:\n`;

  if (!events || events.length === 0) {
    msg += `No events available.\n`;
  } else {
    events.slice(0, 5).forEach(e => {
      msg += `\n- ${e.title} (${e.country}) [${e.impact}]`;
    });
  }

  msg += `\n\n⚠️ Wait for confirmations before trading.`;

  return msg;
}


// =========================
// 🤖 BOT READY
// =========================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel) {
      await channel.send("✅ Bot connecté et opérationnel !");
    }
  } catch (err) {
    console.error(err);
  }
});


// =========================
// 💬 COMMAND !macro
// =========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!macro") {
    const news = await getMacroNews();
    const events = await getEconomicCalendar();

    const biasData = generateBias(news);
    const volatility = calculateVolatility(news, events);

    const msg = formatMessage(news, biasData, events, volatility);

    message.channel.send(msg);
  }
});


// =========================
// ⏰ CRON JOBS
// =========================

// Morning macro
cron.schedule("0 4 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const events = await getEconomicCalendar();

  const biasData = generateBias(news);
  const volatility = calculateVolatility(news, events);

  const message = formatMessage(news, biasData, events, volatility);

  channel.send("📊 **Morning Macro Briefing**\n\n" + message);
});


// US session update
cron.schedule("30 11 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const news = await getMacroNews();
  const events = await getEconomicCalendar();

  const biasData = generateBias(news);
  const volatility = calculateVolatility(news, events);

  const message = formatMessage(news, biasData, events, volatility);

  channel.send("🗞️ **US Session Update**\n\n" + message);
});


// =========================
// LOGIN
// =========================
client.login(TOKEN);
