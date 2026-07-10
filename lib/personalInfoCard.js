export async function getPersonalInfoCard({
  api_key,
  username,
  text_color = '5f574f',
  bg_color = 'f8f6f3',
  font_family = 'Calibri',
}) {
  text_color = text_color.replace(/^#/, '');
  bg_color = bg_color.replace(/^#/, '');
  const apiKey = api_key ?? '';
  if (!apiKey || apiKey === '') throw new Error('Missing WAKATIME_API_KEY');

  const headers = {
    Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`
  };

  const res = await fetch(`https://wakatime.com/api/v1/users/${username}/stats/all_time`, { headers });
  const json = await res.json();
  const data = json.data;

  return buildPersonalInfoSVG({ data, text_color, bg_color, font_family });
}

export function buildPersonalInfoSVG({ data, text_color = '5f574f', bg_color = 'f8f6f3', font_family = 'Calibri' }) {
  text_color = text_color.replace(/^#/, '');
  bg_color = bg_color.replace(/^#/, '');

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
  const totalTimeParts = totalTime.split(' ');
  const totalHours = totalTimeParts[0] || '';
  const totalUnit = totalTimeParts[1] || '';

  return {
    content: `<svg width="400" height="240" viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg">
  <text x="${cx}" y="35" text-anchor="middle" fill="#${text_color}" font-size="16" font-weight="bold" font-family="${font_family}">Personal Info</text>

  <text x="${cx}" y="95" text-anchor="middle" fill="#${text_color}" font-size="36" font-weight="bold" font-family="${font_family}">${totalHours}</text>
  <text x="${cx}" y="118" text-anchor="middle" fill="#${text_color}" font-size="16" font-family="${font_family}">${totalUnit}</text>

  <text x="${cx}" y="155" text-anchor="middle" fill="#${text_color}" font-size="13" font-family="${font_family}">
    <tspan font-weight="bold">Current Day:</tspan> ${currentDayStr}
  </text>
  <text x="${cx}" y="178" text-anchor="middle" fill="#${text_color}" font-size="13" font-family="${font_family}">
    <tspan font-weight="bold">Daily Average:</tspan> ${dailyAvg}
  </text>
  <text x="${cx}" y="201" text-anchor="middle" fill="#${text_color}" font-size="13" font-family="${font_family}">
    <tspan font-weight="bold">Most Active:</tspan> ${mostActiveStr}
  </text>
  ${mostActiveTime ? `<text x="${cx}" y="221" text-anchor="middle" fill="#${text_color}" font-size="12" font-family="${font_family}">(${mostActiveTime})</text>` : ''}
</svg>`,
    width: 400,
    height: mostActiveTime ? 240 : 225
  };
}
