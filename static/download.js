/**
 * Download data from WakaTime
 */


import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_KEY = process.argv[2];

if (!API_KEY) {
    console.log("Usage:");
    console.log("node download.js YOUR_WAKATIME_API_KEY");
    process.exit(1);
}

const BASE = "https://wakatime.com/api/v1/users/current";

const headers = {
    Authorization: "Basic " + Buffer.from(API_KEY).toString("base64"),
};

const OUTPUT = join(__dirname, "wakatime");

if (!existsSync(OUTPUT))
    mkdirSync(OUTPUT);

async function save(name, url) {
    try {
        console.log(`Downloading ${name}...`);

        const res = await fetch(url, { headers });

        if (!res.ok) {
            console.log(`❌ ${name}: ${res.status}`);
            return;
        }

        const json = await res.json();

        writeFileSync(
            join(OUTPUT, `${name}.json`),
            JSON.stringify(json, null, 2)
        );

        console.log(`✅ ${name}`);
    } catch (e) {
        console.log(`❌ ${name}`);
        console.log(e.message);
    }
}

(async () => {

    const today = new Date().toISOString().slice(0, 10);

    const endpoints = {
        profile: `${BASE}`,
        all_time: `${BASE}/all_time_since_today`,
        projects: `${BASE}/projects`,
        goals: `${BASE}/goals`,
        machine_names: `${BASE}/machine_names`,
        data_dumps: `${BASE}/data_dumps`,

        stats_all_time: `${BASE}/stats/all_time`,
        stats_last_year: `${BASE}/stats/last_year`,
        stats_last_6_months: `${BASE}/stats/last_6_months`,
        stats_last_30_days: `${BASE}/stats/last_30_days`,
        stats_last_7_days: `${BASE}/stats/last_7_days`,

        summaries: `${BASE}/summaries?start=2025-09-12&end=${today}`,

        durations_today: `${BASE}/durations?date=${today}`,

        heartbeats_today: `${BASE}/heartbeats?date=${today}`,
    };

    for (const [name, url] of Object.entries(endpoints)) {
        await save(name, url);
    }

    console.log("\nDone.");
})();