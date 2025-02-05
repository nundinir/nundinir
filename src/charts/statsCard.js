const { CODING_STATS_BIG_FONT_SIZE, CODING_STATS_MEDIUM_FONT_SIZE, GITHUB_STATS_CARD_VALUE_FONT_SIZE, FONT_FAMILY, FONT_SIZE, GITHUB_BLUE, GITHUB_LIGHT_GREEN, GITHUB_WHITE, GITHUB_NEUTRAL_GREEN, GITHUB_DARK_GREEN, GITHUB_LIGHT_GRAY, GITHUB_NEUTRAL_GRAY, GITHUB_DARK_GRAY } = require('./configs');


exports.createWakapiStatsCard = async function createWakapiStatsCard({ title, totalHours, dailyAverage, period }) {
  const width = 400;
  const height = 100;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Title -->
      <text 
        x="50%" 
        y="27"
        text-anchor="middle" 
        font-family="${FONT_FAMILY}" 
        font-size="${CODING_STATS_MEDIUM_FONT_SIZE}" 
        font-weight="bold" 
        fill="${GITHUB_LIGHT_GRAY}"
      >${title}</text>

      <!-- Total Hours -->
      <text 
        x="5%" 
        y="55" 
        text-anchor="start" 
        font-family="${FONT_FAMILY}" 
        font-size="${FONT_SIZE}" 
        fill="${GITHUB_LIGHT_GRAY}"
      >Total Hours:</text>

      <text 
        x="95%" 
        y="55" 
        text-anchor="end" 
        font-family="${FONT_FAMILY}" 
        font-size="${CODING_STATS_BIG_FONT_SIZE}" 
        font-weight="bold" 
        fill="${GITHUB_WHITE}"

      >${totalHours}</text>

      <!-- Daily Average -->
      <text 
        x="5%" 
        y="75" 
        text-anchor="start" 
        font-family="${FONT_FAMILY}" 
        font-size="${FONT_SIZE}" 
        fill="${GITHUB_LIGHT_GRAY}"
      >Daily Average:</text>


      <text 
        x="95%" 
        y="75" 
        text-anchor="end" 
        font-family="${FONT_FAMILY}" 
        font-size="${CODING_STATS_MEDIUM_FONT_SIZE}" 
        font-weight="bold" 
        fill="${GITHUB_BLUE}"
      >${dailyAverage}</text>
    </svg>
  `;

  return Buffer.from(svg);
}

exports.createGithubStatsCard = async function createGithubStatsCard({ value, descriptionOne, descriptionTwo, color }) {
  const width = 200;
  const height = 100;
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text 
        x="50%" 
        y="40%"
        text-anchor="middle" 
        font-family="${FONT_FAMILY}" 
        font-size="${GITHUB_STATS_CARD_VALUE_FONT_SIZE}" 
        font-weight="bold" 
        fill="${color}"
      >${value}</text>

      <text 
        x="50%" 
        y="65%" 
        text-anchor="middle" 
        font-family="${FONT_FAMILY}" 
        font-size="${FONT_SIZE}" 
        font-weight="bold" 
        fill="${GITHUB_WHITE}"
      >${descriptionOne}</text>

      <text 
        x="50%" 
        y="80%" 
        text-anchor="middle" 
        font-family="${FONT_FAMILY}" 
        font-size="${FONT_SIZE}" 
        fill="${GITHUB_LIGHT_GRAY}"

      >${descriptionTwo}</text>

    </svg>
  `;


  return Buffer.from(svg);
}