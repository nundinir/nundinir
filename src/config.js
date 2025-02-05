require('dotenv').config();

exports.config = {
  wakapiToken: process.env.WAKAPI_TOKEN,
  wakapiUsername: process.env.WAKAPI_USERNAME,
  githubToken: process.env.GITHUB_TOKEN,
  githubUsername: process.env.USERNAME,
  intervals: ['all_time', 'last_7_days'],
  intervalLabels: {
    all_time: 'All Time',
    last_7_days: 'Last 7 Days'
  }
};
