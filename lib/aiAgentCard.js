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

export async function getAIAgentCard({
  api_key,
  username,
  text_color = '5f574f',
  bg_color = 'f8f6f3',
  font_family = 'Calibri',
  chart_color = '9c8f80',
}) {
  text_color = text_color.replace(/^#/, '');
  bg_color = bg_color.replace(/^#/, '');
  chart_color = chart_color.replace(/^#/, '');
  const apiKey = api_key ?? '';
  if (!apiKey || apiKey === '') throw new Error('Missing WAKATIME_API_KEY');

  const headers = {
    Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`
  };

  const res = await fetch(`https://wakatime.com/api/v1/users/${username}/stats/all_time`, { headers });
  const json = await res.json();
  const data = json.data;

  return buildAIAgentSVG({ data, text_color, bg_color, font_family, chart_color });
}

export function buildAIAgentSVG({ data, text_color = '5f574f', bg_color = 'f8f6f3', font_family = 'Calibri', chart_color = '9c8f80' }) {
  text_color = text_color.replace(/^#/, '');
  bg_color = bg_color.replace(/^#/, '');
  chart_color = chart_color.replace(/^#/, '');

  const lineChanges = data.ai_agent_line_changes || {};
  const costs = data.ai_agent_costs || {};

  const agents = Object.entries(lineChanges)
    .map(([name, lines]) => ({
      name,
      lines,
      cost: costs[name] || 0,
    }))
    .sort((a, b) => b.lines - a.lines);

  const totalLines = agents.reduce((s, a) => s + a.lines, 0);
  if (totalLines === 0) {
    return { content: '<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg"><text x="200" y="100" text-anchor="middle" fill="#999">No AI agent data</text></svg>', width: 400, height: 200 };
  }

  const fmt = (n) => {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  };
  const fmtCost = (n) => `$${n.toFixed(2)}`;

  const chartHSL = hexToHSL(chart_color);
  const isDarkChart = chartHSL.l < 50;
  const count = agents.length;
  const palette = [];
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    const l = isDarkChart
      ? Math.round(Math.min(chartHSL.l + 25, 95) - t * 20)
      : Math.round(Math.max(chartHSL.l - 10, 15) + t * 20);
    palette.push(hslToHex(chartHSL.h, Math.max(chartHSL.s - 10, 10), l));
  }

  const donutBg = isDarkChart ? shiftLightness(chart_color, 40) : shiftLightness(chart_color, -40);

  const cx = 200, cy = 105, r = 55;
  const circ = 2 * Math.PI * r;

  let cumulative = 0;
  const slices = agents.map((agent, i) => {
    const len = circ * (agent.lines / totalLines);
    const slice = {
      ...agent,
      color: palette[i % palette.length],
      dasharray: `${Math.max(len, 1)} ${circ}`,
      dashoffset: cumulative,
    };
    cumulative += len;
    return slice;
  });

  const donut = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#${donutBg}" stroke-width="26" />
    ${slices.map(s => `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#${s.color}" stroke-width="26"
      stroke-dasharray="${s.dasharray}"
      stroke-dashoffset="${s.dashoffset}"
      transform="rotate(-90 ${cx} ${cy})"
      stroke-linecap="butt" />`).join('')}
    <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#${text_color}" font-size="13" font-family="${font_family}">
      ${fmt(totalLines)} lines
    </text>`;

  const legendY = 190;
  const colW = 200;
  const rows = [];
  agents.forEach((agent, i) => {
    const col = i < Math.ceil(agents.length / 2) ? 0 : 1;
    const row = col === 0 ? i : i - Math.ceil(agents.length / 2);
    const x = col * colW + 20;
    const y = legendY + row * 24;
    const pct = ((agent.lines / totalLines) * 100).toFixed(1);
    rows.push(`
      <rect x="${x}" y="${y - 10}" width="10" height="10" fill="#${palette[i % palette.length]}" rx="2" />
      <text x="${x + 16}" y="${y}" fill="#${text_color}" font-size="12" font-family="${font_family}">
        <tspan font-weight="bold">${agent.name}</tspan> ${fmt(agent.lines)} lines (${pct}%) · ${fmtCost(agent.cost)}
      </text>`);
  });

  const numCols = 2;
  const rowsPerCol = Math.ceil(agents.length / numCols);
  const height = legendY + rowsPerCol * 24 + 20;

  return {
    content: `<svg width="400" height="${height}" viewBox="0 0 400 ${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="200" y="28" text-anchor="middle" fill="#${text_color}" font-size="16" font-weight="bold" font-family="${font_family}">AI Agents</text>
  ${donut}
  ${rows.join('\n')}
</svg>`,
    width: 400,
    height
  };
}
