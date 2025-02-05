const core = require('@actions/core');

exports.fetchWakapiStats = async function(apiKey, interval) {
  const base64ApiKey = Buffer.from(apiKey).toString('base64');
  
  const response = await fetch('https://wakapi.dev/api/summary?interval=' + interval, {
    headers: {
      'accept': 'application/json',
      'Authorization': 'Basic ' + base64ApiKey
    }
  });

  if (!response.ok) {
    console.error(response);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

exports.fetchWakapiUserStats = async function(apiKey, username, intervals) {
  const base64ApiKey = Buffer.from(apiKey).toString('base64');
  const results = {};
  
  // Ensure intervals is always an array
  const intervalArray = Array.isArray(intervals) ? intervals : [intervals];
  
  for (const interval of intervalArray) {
    try {
      const response = await fetch(`https://wakapi.dev/api/compat/wakatime/v1/users/${username}/stats/${interval}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': 'Basic ' + base64ApiKey
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${interval} stats:`, response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      results[interval] = await response.json();
    } catch (error) {
      console.error(`Error fetching ${interval} stats:`, error);
      throw error;
    }
  }

  return results;
};