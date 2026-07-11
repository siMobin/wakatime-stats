export async function getAICodingCard({
  api_key,
  username,
  text_color = '5f574f',
  title_color = 'ffff',
  bg_color = 'f8f6f3',
  font_family = 'Calibri',
  chart_color = '9c8f80',
}) {
  text_color = text_color.replace(/^#/, '');
  title_color = title_color.replace(/^#/, '');
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

  return buildAICodingSVG({ data, text_color, title_color, bg_color, font_family, chart_color });
}

export function buildAICodingSVG({ data, text_color = '5f574f', title_color = 'ffff', bg_color = 'f8f6f3', font_family = 'Calibri', chart_color = '9c8f80' }) {
  text_color = text_color.replace(/^#/, '');
  title_color = title_color.replace(/^#/, '');
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

  const cx = 200, cy = 105, r = 55;
  const circ = 2 * Math.PI * r;
  const aiDash = circ * (Math.max(aiPct, 2) / 100);

  const donut = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#${chart_color}" stroke-width="26" opacity="0.2" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#${chart_color}" stroke-width="26"
      stroke-dasharray="${aiDash} ${circ}"
      stroke-dashoffset="${circ * 0.25}"
      transform="rotate(-90 ${cx} ${cy})"
      stroke-linecap="butt" />
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" fill="#${text_color}" font-size="24" font-weight="bold" font-family="${font_family}">
      ${aiPct.toFixed(1)}%
    </text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="#${text_color}" font-size="14" font-family="${font_family}">
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
  <text x="200" y="28" text-anchor="middle" fill="#${title_color}" font-size="16" font-weight="bold" font-family="${font_family}">AI Coding (${aiPct.toFixed(1)}% AI-driven)</text>
  ${donut}
  ${lines.join('\n')}
</svg>`,
    width: 400,
    height
  };
}
