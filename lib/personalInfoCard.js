export async function getPersonalInfoCard({
  api_key,
  username,
  text_color = '5f574f',
  bg_color = 'f8f6f3',
  title_color = '2d2a26',
  font_family = 'Calibri',
  border_color,
  chart_color,
}) {
  text_color = text_color.replace(/^#/, '');
  bg_color = bg_color.replace(/^#/, '');
  title_color = title_color.replace(/^#/, '');
  border_color = border_color ? border_color.replace(/^#/, '') : text_color;
  chart_color = chart_color ? chart_color.replace(/^#/, '') : text_color;
  const apiKey = api_key ?? '';
  if (!apiKey || apiKey === '') throw new Error('Missing WAKATIME_API_KEY');

  const headers = {
    Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`
  };

  const res = await fetch(`https://wakatime.com/api/v1/users/${username}/stats/all_time`, { headers });
  const json = await res.json();
  const data = json.data;

  return buildPersonalInfoSVG({ data, text_color, bg_color, title_color, font_family, border_color, chart_color });
}

export function buildPersonalInfoSVG({ data, text_color = '5f574f', bg_color = 'f8f6f3', title_color = '2d2a26', font_family = 'Calibri', border_color, chart_color }) {
  text_color = text_color.replace(/^#/, '');
  bg_color = bg_color.replace(/^#/, '');
  title_color = title_color.replace(/^#/, '');
  border_color = border_color ? border_color.replace(/^#/, '') : text_color;
  chart_color = chart_color ? chart_color.replace(/^#/, '') : text_color;

  function parseTotalTime(str) {
    if (!str || str === 'N/A') return null;
    const parts = str.split(' ');
    let hours = '0', mins = '0';
    for (let i = 0; i < parts.length - 1; i += 2) {
      const val = parts[i];
      const unit = (parts[i + 1] || '').toLowerCase();
      if (unit.startsWith('hr')) hours = val;
      else if (unit.startsWith('min')) mins = val;
    }
    return { hours, mins };
  }

  const totalTime = data.human_readable_total || 'N/A';
  const dailyAvg = data.human_readable_daily_average || 'N/A';
  const bestDay = data.best_day || null;

  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ordinal = (d) => {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
  };

  const fmtDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${dayNames[d.getDay()]} ${monthNames[d.getMonth()]} ${d.getDate()}${ordinal(d.getDate())}, ${d.getFullYear()}`;
  };

  const currentDayStr = fmtDate(now.toISOString().slice(0, 10));
  const mostActiveStr = bestDay ? fmtDate(bestDay.date) : 'N/A';
  const mostActiveTime = bestDay ? bestDay.text : '';

  const cx = 200;
  const parsed = parseTotalTime(totalTime);

  const accent = title_color || border_color;

  const circleContent = parsed
    ? `
    <circle cx="${cx}" cy="110" r="55" fill="none" stroke="#${accent}" stroke-width="4" />
    <text x="${cx}" y="105" text-anchor="middle" fill="#${text_color}" font-size="34" font-weight="bold" font-family="${font_family}">${parsed.hours}<tspan font-size="14" font-weight="normal"> hr</tspan></text>
    <text x="${cx}" y="134" text-anchor="middle" fill="#${text_color}" font-size="17" font-weight="bold" font-family="${font_family}">${parsed.mins}<tspan font-size="8" font-weight="normal"> min</tspan></text>`
    : `
    <circle cx="${cx}" cy="110" r="55" fill="none" stroke="#${accent}" stroke-width="2" />
    <text x="${cx}" y="116" text-anchor="middle" fill="#${text_color}" font-size="16" font-family="${font_family}">N/A</text>`;

  const maxHeight = mostActiveTime ? 260 : 240;

  return {
    content: `<svg width="400" height="${maxHeight}" viewBox="0 0 400 ${maxHeight}" xmlns="http://www.w3.org/2000/svg">
  <text x="${cx}" y="30" text-anchor="middle" fill="#${title_color}" font-size="16" font-weight="bold" font-family="${font_family}">Coding History</text>
  ${circleContent}
  <text x="${cx}" y="190" text-anchor="middle" fill="#${text_color}" font-size="13" font-family="${font_family}">
    <tspan font-weight="bold">Daily Average:</tspan> ${dailyAvg}
  </text>
  <text x="${cx}" y="213" text-anchor="middle" fill="#${text_color}" font-size="13" font-family="${font_family}">
    <tspan font-weight="bold">Most Active:</tspan> ${mostActiveStr}
  </text>
  ${mostActiveTime ? `<text x="${cx}" y="236" text-anchor="middle" fill="#${text_color}" font-size="12" font-family="${font_family}">(${mostActiveTime})</text>` : ''}
</svg>`,
    width: 400,
    height: maxHeight
  };
}
