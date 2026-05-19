/**
 * Bootstrap data/config.json and data/cookies.json from environment variables.
 * Run this before starting the app on Railway (or any env without a setup wizard).
 *
 * Required env vars:
 *   TWITTER_COOKIES  — Cookie-Editor JSON array, or {"auth_token":"...","ct0":"..."}
 *   AI_API_KEY       — API key for the AI provider
 *
 * Optional env vars (all have defaults):
 *   MODE                 A | B | C  (default: A)
 *   LIST_IDS             comma-separated Twitter list IDs (mode A/C)
 *   LANGUAGE             auto | en | ja | ko | zh  (default: auto)
 *   STYLE_PROMPT         persona free text
 *   OWNER_USERNAME       Twitter @handle without @ (mode B/C)
 *   HASHTAGS             comma-separated hashtags (default: #XAUUSD,#Gold,#Crypto,#Bitcoin)
 *   CROSS_POST_LIST_ID   optional list ID for mode B cross-posting
 *   COMMENTS_PER_HOUR    number (default: 15)
 *   DELAY_MIN_MS         number (default: 60000)
 *   DELAY_MAX_MS         number (default: 240000)
 *   AI_PROVIDER          deepseek | openai | anthropic  (default: deepseek)
 *   AI_MODEL             optional model override
 *   TELEGRAM_BOT_TOKEN   optional
 *   TELEGRAM_CHAT_ID     optional
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const COOKIES_FILE = path.join(DATA_DIR, 'cookies.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

function require_env(name) {
  const val = process.env[name];
  if (!val) {
    console.error(`[env-to-config] ERROR: required env var ${name} is not set`);
    process.exit(1);
  }
  return val;
}

function optional_env(name, fallback) {
  return process.env[name] || fallback;
}

// --- ensure data/ dir ---
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// --- cookies ---
if (!fs.existsSync(COOKIES_FILE)) {
  const raw = require_env('TWITTER_COOKIES');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('[env-to-config] ERROR: TWITTER_COOKIES is not valid JSON');
    process.exit(1);
  }

  let cookiesArr;
  if (Array.isArray(parsed)) {
    // Cookie-Editor format: [{name, value, domain, ...}, ...]
    cookiesArr = parsed;
  } else if (parsed.auth_token && parsed.ct0) {
    // Shorthand {auth_token, ct0}
    cookiesArr = [
      { name: 'auth_token', value: parsed.auth_token, domain: '.x.com', path: '/' },
      { name: 'ct0',        value: parsed.ct0,        domain: '.x.com', path: '/' },
    ];
  } else {
    console.error('[env-to-config] ERROR: TWITTER_COOKIES must be a Cookie-Editor array or {auth_token, ct0} object');
    process.exit(1);
  }

  fs.writeFileSync(COOKIES_FILE, JSON.stringify({ cookies: cookiesArr }, null, 2));
  console.log(`[env-to-config] wrote ${COOKIES_FILE}`);
} else {
  console.log(`[env-to-config] ${COOKIES_FILE} already exists, skipping`);
}

// --- config ---
if (!fs.existsSync(CONFIG_FILE)) {
  const mode     = optional_env('MODE', 'A').toUpperCase();
  const provider = optional_env('AI_PROVIDER', 'deepseek');
  const apiKey   = require_env('AI_API_KEY');
  const model    = optional_env('AI_MODEL', '');

  const listIds = optional_env('LIST_IDS', '')
    .split(',').map(s => s.trim()).filter(Boolean);

  const hashtags = optional_env('HASHTAGS', '#XAUUSD,#Gold,#Crypto,#Bitcoin')
    .split(',').map(s => s.trim()).filter(Boolean);

  const cfg = {
    cookiesFile: 'data/cookies.json',
    mode,
    modeA: {
      listIds,
      language:    optional_env('LANGUAGE', 'auto'),
      stylePrompt: optional_env('STYLE_PROMPT', ''),
    },
    modeB: {
      ownerUsername:    optional_env('OWNER_USERNAME', ''),
      hashtags,
      crossPostListId:  optional_env('CROSS_POST_LIST_ID', ''),
    },
    commentsPerHour: Number(optional_env('COMMENTS_PER_HOUR', '15')),
    delayMinMs:      Number(optional_env('DELAY_MIN_MS', '60000')),
    delayMaxMs:      Number(optional_env('DELAY_MAX_MS', '240000')),
    ai: { provider, apiKey, model },
  };

  const tgToken = optional_env('TELEGRAM_BOT_TOKEN', '');
  const tgChat  = optional_env('TELEGRAM_CHAT_ID', '');
  if (tgToken && tgChat) {
    cfg.telegram = { botToken: tgToken, chatId: tgChat };
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  console.log(`[env-to-config] wrote ${CONFIG_FILE}`);
} else {
  console.log(`[env-to-config] ${CONFIG_FILE} already exists, skipping`);
}

console.log('[env-to-config] done — starting app...');
