function hexToHSL(hex) {
  hex = String(hex).replace(/^#/, '');
  const bigint = parseInt(hex, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `${f(0)}${f(8)}${f(4)}`;
}

function shiftLightness(hex, amount) {
  const hsl = hexToHSL(hex);
  return hslToHex(hsl.h, hsl.s, Math.min(100, Math.max(0, hsl.l + amount)));
}

export async function getAICodingCard({
  api_key,
  username,
  text_color = '5f574f',
  bg_color = 'f8f6f3',
  font_family = 'Calibri',
  chart_color = '9c8f80',
}) {
  text_color = text_color.replace(/^#/, '');
  chart_color = chart_color.replace(/^#/, '');
  bg_color = bg_color.replace(/^#/, '');
  const apiKey = api_key ?? '';
  if (!apiKey || apiKey === '') throw new Error('Missing WAKATIME_API_KEY');

  const headers = {
    Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`
  };

  const res = await fetch(`https://wakatime.com/api/v1/users/${username}/stats/all_time`, { headers });
  const json = await res.json();
  const data = json.data;

  return buildAICodingSVG({ data, text_color, bg_color, font_family, chart_color });
}

export function buildAICodingSVG({ data, text_color = '5f574f', bg_color = 'f8f6f3', font_family = 'Calibri', chart_color = '9c8f80' }) {
  text_color = text_color.replace(/^#/, '');
  chart_color = chart_color.replace(/^#/, '');
  bg_color = bg_color.replace(/^#/, '');

  const aiAdd = data.ai_additions || 0;
  const aiDel = data.ai_deletions || 0;
  const humanAdd = data.human_additions || 0;
  const humanDel = data.human_deletions || 0;

  const aiTotal = aiAdd + aiDel;
  const humanTotal = humanAdd + humanDel;
  const grandTotal = aiTotal + humanTotal;
  const aiPct = grandTotal > 0 ? (aiTotal / grandTotal * 100) : 0;

  const inputTokens = data.ai_input_tokens || 0;
  const outputTokens = data.ai_output_tokens || 0;
  const agentCosts = data.ai_agent_costs || {};
  const totalCost = Object.values(agentCosts).reduce((s, c) => s + c, 0);
  const aiSessions = data.ai_sessions || 0;
  const promptEvents = data.ai_prompt_events_total || 0;

  const fmt = (n) => {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  };
  const fmtCost = (n) => `$${n.toFixed(2)}`;

  const chartHSL = hexToHSL(chart_color);
  const donutBg = chartHSL.l > 50 ? shiftLightness(chart_color, -40) : shiftLightness(chart_color, 40);

  const cx = 200, cy = 105, r = 55;
  const circ = 2 * Math.PI * r;
  const aiDash = circ * (Math.max(aiPct, 2) / 100);

  const donut = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#${donutBg}" stroke-width="26" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#${chart_color}" stroke-width="26"
      stroke-dasharray="${aiDash} ${circ}"
      stroke-dashoffset="${circ * 0.25}"
      transform="rotate(-90 ${cx} ${cy})"
      stroke-linecap="butt" />
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="#${text_color}" font-size="24" font-weight="bold" font-family="${font_family}">
      ${aiPct.toFixed(1)}%
    </text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="#${text_color}" font-size="11" font-family="${font_family}">
      AI-driven
    </text>`;

  const lh = 24;
  const c1x = 25, c2x = 210;
  const rows1 = [
    { label: 'AI Lines', value: `+${fmt(aiAdd)} / -${fmt(aiDel)}` },
    { label: 'Human Lines', value: `+${fmt(humanAdd)} / -${fmt(humanDel)}` },
    { label: 'Tokens In', value: fmt(inputTokens) },
    { label: 'Tokens Out', value: fmt(outputTokens) },
  ];
  const rows2 = [
    { label: 'Cost', value: fmtCost(totalCost) },
    { label: 'Human Review', value: `${fmt(aiSessions)} sessions` },
    { label: 'Human Follow-up', value: `${fmt(promptEvents)} edits` },
  ];

  const maxRows = Math.max(rows1.length, rows2.length);
  const startY = 200;
  const lines = [];

  for (let i = 0; i < maxRows; i++) {
    const y = startY + i * lh;
    if (i < rows1.length) {
      lines.push(`<text x="${c1x}" y="${y}" fill="#${text_color}" font-size="13" font-family="${font_family}"><tspan font-weight="bold">${rows1[i].label}:</tspan> ${rows1[i].value}</text>`);
    }
    if (i < rows2.length) {
      lines.push(`<text x="${c2x}" y="${y}" fill="#${text_color}" font-size="13" font-family="${font_family}"><tspan font-weight="bold">${rows2[i].label}:</tspan> ${rows2[i].value}</text>`);
    }
  }

  const height = startY + maxRows * lh + 15;

  return {
    content: `<svg width="400" height="${height}" viewBox="0 0 400 ${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="200" y="28" text-anchor="middle" fill="#${text_color}" font-size="16" font-weight="bold" font-family="${font_family}">AI Coding (${aiPct.toFixed(1)}% AI-driven)</text>
  ${donut}
  ${lines.join('\n')}
</svg>`,
    width: 400,
    height
  };
}
