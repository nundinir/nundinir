const core = require('@actions/core');
const path = require('path');
const { fetchWakapiUserStats } = require('./utils/wakapiClient');
const { ensureDataDir, saveJson, saveChart } = require('./utils/fileSystem');
const { createRadarChart } = require('./charts/radarChart');
const { createBarChart } = require('./charts/barChart');
const { createlineChart } = require('./charts/lineChart');
const { config } = require('./config');
const { createWakapiStatsCard, createGithubStatsCard } = require('./charts/statsCard');
const { getUserGitHubStats } = require('./utils/githubClient');
const { GITHUB_LIGHT_GREEN, GITHUB_WHITE, GITHUB_BLUE } = require('./charts/configs');

async function run() {
  try {
    // Get inputs from environment variables with fallback to config
    const wakapiKey = process.env.WAKAPI_TOKEN || config.wakapiToken;
    const githubUsername = process.env.WAKAPI_USERNAME || config.wakapiUsername;
    const githubToken = process.env.GH_TOKEN || config.githubToken;
    const intervals = config.intervals;

    const dataDir = ensureDataDir(path.join(__dirname, '..'));

    let wakapiStatsGenerated = false;
    if (wakapiKey && githubUsername) {
      try {
        const data = await fetchWakapiUserStats(wakapiKey, githubUsername, intervals);
        
        if (data) {
          for (const interval of intervals) {
            const jsonPath = path.join(dataDir, `wakapi-stats-${interval}.json`);

            saveJson(jsonPath, data[interval]);
            console.log(`Saved Wakapi statistics for ${interval} to data/wakapi-stats-${interval}.json`);
          }

          // Generate and save combined radar charts and bar charts
          const chartFields = ['projects', 'languages'];
          for (const field of chartFields) {
            const datasets = intervals.map(interval => ({
              period: interval,
              data: data[interval].data
            }));

            // Generate combined radar chart
            const radarChartBuffer = await createRadarChart(datasets, field);
            const radarChartPath = path.join(dataDir, `${field}-radar.svg`);
            saveChart(radarChartBuffer, radarChartPath);
            console.log(`Generated combined ${field} radar chart: ${radarChartPath}`);

            // Generate bar chart
            const barChartBuffer = await createBarChart(datasets, field);
            const barChartPath = path.join(dataDir, `${field}-bar.svg`);
            saveChart(barChartBuffer, barChartPath);
            console.log(`Generated ${field} bar chart: ${barChartPath}`);
          }

          for (const interval of intervals) {
            const stats = data[interval].data;
            const statsBuffer = await createWakapiStatsCard({
              title: config.intervalLabels[interval],
              totalHours: stats.human_readable_total,
              dailyAverage: stats.human_readable_daily_average,
              period: stats.human_readable_range
            });
            const statsPath = path.join(dataDir, `${interval}-coding-stats.svg`);
            saveChart(statsBuffer, statsPath);
            console.log(`Generated coding stats card for ${interval}: ${statsPath}`);
          }

          wakapiStatsGenerated = true;
          console.log('Successfully fetched Wakapi statistics and generated charts');
        }
      } catch (wakapiError) {
        console.log('Failed to fetch Wakapi stats:', wakapiError.message);
      }
    }

    if (!wakapiStatsGenerated) {
      console.log('Skipping Wakapi stats generation - authentication failed or no credentials provided');
    }

    // Fetch GitHub stats
    const githubStats = await getUserGitHubStats(githubToken);
    const githubStatsPath = path.join(dataDir, 'github-stats.json');
    saveJson(githubStatsPath, githubStats);


    // let's generate some stat cards for the github stats: total contributions, total PRs merged, total stars gained, total forks
    const contributionsCardBuffer = await createGithubStatsCard({
      value: githubStats.contributions.total,
      descriptionOne: 'Contributions', 
      descriptionTwo: 'across all repositories',
      color: GITHUB_LIGHT_GREEN
    });
  
    const contributionsCardPath = path.join(dataDir, `contributions-card.svg`);
    saveChart(contributionsCardBuffer, contributionsCardPath);

    const prsCardBuffer = await createGithubStatsCard({
      value: githubStats.totalPRs,
      descriptionOne: 'Pull Requests',
      descriptionTwo: 'successfully merged',
      color: GITHUB_WHITE
    });


    const prsCardPath = path.join(dataDir, `prs-card.svg`);
    saveChart(prsCardBuffer, prsCardPath);

    const starsCardBuffer = await createGithubStatsCard({
      value: githubStats.totalStars,
      descriptionOne: 'Stargazers',
      descriptionTwo: 'across all repositories',
      color: GITHUB_BLUE
    });

    const starsCardPath = path.join(dataDir, `stars-card.svg`);
    saveChart(starsCardBuffer, starsCardPath);

    const forksCardBuffer = await createGithubStatsCard({
      value: githubStats.totalForks,
      descriptionOne: 'Forks',
      descriptionTwo: 'across all repositories',
      color: GITHUB_WHITE
    });

    const forksCardPath = path.join(dataDir, `forks-card.svg`);
    saveChart(forksCardBuffer, forksCardPath);

    // let's generate an area chart for the github stats: total views
    const trafficChartBuffer = await createlineChart(githubStats.topRepositories.slice(0, 5));
    const trafficChartPath = path.join(dataDir, `traffic-chart.svg`);
    saveChart(trafficChartBuffer, trafficChartPath);
  
  } catch (error) {
    console.error("Error generating stats:", error);
    process.exit(1);
  }
}

run(); 