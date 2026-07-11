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

  function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }

    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
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

  const parsed = parseTotalTime(totalTime);
  const categories = data.categories || [];
  const hasCategories = categories.length > 0;

  const cx = 135, cy = 140, r = 72;
  const rightX = 240;
  const cardWidth = 480;

  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeDonut(cx, cy, outerR, innerR, startAngle, endAngle) {
    const outerS = polarToCartesian(cx, cy, outerR, startAngle);
    const outerE = polarToCartesian(cx, cy, outerR, endAngle);
    const innerS = polarToCartesian(cx, cy, innerR, startAngle);
    const innerE = polarToCartesian(cx, cy, innerR, endAngle);
    const large = (endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${outerS.x} ${outerS.y} A ${outerR} ${outerR} 0 ${large} 1 ${outerE.x} ${outerE.y} L ${innerE.x} ${innerE.y} A ${innerR} ${innerR} 0 ${large} 0 ${innerS.x} ${innerS.y} Z`;
  }

  const hueOffset = Math.random() * 360;
  const catColors = categories.map((_, i) => {
    const h = (i * 137.508 + hueOffset) % 360;
    return `hsl(${h}, 60%, 55%)`;
  });

  const holeR = 42;
  let donutContent = '';
  let currentAngle = 0;
  if (hasCategories) {
    categories.forEach((cat, i) => {
      const sliceAngle = (cat.percent / 100) * 360;
      const endAngle = currentAngle + sliceAngle;
      if (sliceAngle > 0) {
        donutContent += `<path d="${describeDonut(cx, cy, r, holeR, currentAngle, endAngle)}" fill="${catColors[i]}" />
`;
      }
      currentAngle = endAngle;
    });
    const remaining = 360 - currentAngle;
    if (remaining > 0.01) {
      donutContent += `<path d="${describeDonut(cx, cy, r, holeR, currentAngle, 360)}" fill="#e0e0e0" />
`;
    }
  }

  let rightContent = '';
  let yPos = 50;

  rightContent += `<text x="${rightX}" y="${yPos}" fill="#${text_color}" font-size="12" font-family="${font_family}"><tspan font-weight="bold">Daily Avg:</tspan> ${dailyAvg}</text>
`;
  yPos += 19;

  // mostActiveStr
  rightContent += `<text x="${rightX}" y="${yPos}" fill="#${text_color}" font-size="12" font-family="${font_family}"><tspan font-weight="bold">Peak:</tspan> ${mostActiveTime}</text>
  `;
  yPos += 19;

  //   if (mostActiveTime) {
  //     rightContent += `<text x="${rightX}" y="${yPos}" fill="#${text_color}" font-size="11" font-family="${font_family}">${mostActiveTime}</text>
  // `;
  //     yPos += 16;
  //   }

  if (hasCategories) {
    yPos += 8;
    rightContent += `<text x="${rightX}" y="${yPos}" fill="#${title_color}" font-size="12" font-weight="bold" font-family="${font_family}">Categories</text>
`;
    yPos += 17;

    categories.forEach((cat, i) => {
      const dotX = rightX;
      const dotY = yPos - 7;
      rightContent += `<rect x="${dotX}" y="${dotY}" width="8" height="8" rx="2" fill="${catColors[i]}" />
<text x="${rightX + 13}" y="${yPos}" fill="#${text_color}" font-size="12" font-family="${font_family}">${cat.name}</text>
<text x="${rightX + 190}" y="${yPos}" fill="#${text_color}" font-size="10" font-family="${font_family}" text-anchor="end">${formatDuration(cat.total_seconds)}</text>
`;
      yPos += 19;
    });
  }

  const cardHeight = Math.max(yPos + 20, cy + r + 30);

  const accent = title_color || border_color;

  let mainContent;
  if (hasCategories) {
    mainContent = `${donutContent}
${parsed ? `
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" fill="#${text_color}" font-size="24" font-weight="bold" font-family="${font_family}">${parsed.hours}<tspan font-size="14" font-weight="normal"> hr</tspan></text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="#${text_color}" font-size="14" font-weight="bold" font-family="${font_family}">${parsed.mins}<tspan font-size="10" font-weight="normal"> min</tspan></text>` : `
    <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#${text_color}" font-size="13" font-family="${font_family}">N/A</text>`}
${rightContent}`;
  } else if (parsed) {
    mainContent = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#${accent}" stroke-width="4" />
    <text x="${cx}" y="${cy - 5}" text-anchor="middle" fill="#${text_color}" font-size="28" font-weight="bold" font-family="${font_family}">${parsed.hours}<tspan font-size="12" font-weight="normal"> hr</tspan></text>
    <text x="${cx}" y="${cy + 24}" text-anchor="middle" fill="#${text_color}" font-size="14" font-weight="bold" font-family="${font_family}">${parsed.mins}<tspan font-size="8" font-weight="normal"> min</tspan></text>
    ${rightContent}`;
  } else {
    mainContent = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#${accent}" stroke-width="2" />
    <text x="${cx}" y="${cy + 6}" text-anchor="middle" fill="#${text_color}" font-size="16" font-family="${font_family}">N/A</text>
    ${rightContent}`;
  }

  return {
    content: `<svg width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
  <text x="${cardWidth / 2}" y="30" text-anchor="middle" fill="#${title_color}" font-size="15" font-weight="bold" font-family="${font_family}">Coding History</text>
${mainContent}
</svg>`,
    width: cardWidth,
    height: cardHeight
  };
}
