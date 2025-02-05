const github = require('@actions/github');

const getRepositoryTraffic = async (owner, repo, octokit) => {
  try {
    const [views, clones] = await Promise.all([
      octokit.rest.repos.getViews({
        owner,
        repo,
        per: 'day'
      }).catch(() => ({ data: { count: 0, uniques: 0, views: [] } })),
      octokit.rest.repos.getClones({
        owner,
        repo,
        per: 'day'
      }).catch(() => ({ data: { count: 0, uniques: 0, clones: [] } }))
    ]);

    // Create a map of all dates in the last 14 days
    const traffic = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      traffic[dateStr] = {
        totalViews: 0,
        totalVisitors: 0,
        totalClones: 0,
        totalCloners: 0
      };
    }

    // Add views data
    views.data.views.forEach(day => {
      const dateStr = day.timestamp.split('T')[0];
      if (traffic[dateStr]) {
        traffic[dateStr].totalViews = day.count;
        traffic[dateStr].totalVisitors = day.uniques;
      }
    });

    // Add clones data
    clones.data.clones.forEach(day => {
      const dateStr = day.timestamp.split('T')[0];
      if (traffic[dateStr]) {
        traffic[dateStr].totalClones = day.count;
        traffic[dateStr].totalCloners = day.uniques;
      }
    });

    return { traffic };
  } catch (error) {
    console.error(`Error fetching traffic for ${owner}/${repo}:`, error);
    return null;
  }
};

const getUserGitHubStats = async (accessToken) => {
  if (!accessToken) {
    throw new Error('Access token is required');
  }

  const octokit = github.getOctokit(accessToken);
  try {
    // Fetch the authenticated user's information
    const authUserResponse = await octokit.rest.users.getAuthenticated();
    const username = authUserResponse.data.login;

    // Proceed with the existing logic using the retrieved username
    const userResponse = await octokit.rest.users.getByUsername({ username });
    const createdAt = new Date(userResponse.data.created_at);
    const startYear = createdAt.getFullYear();
    const currentYear = new Date().getFullYear();

    // Create contribution queries for each year
    const contributionsQuery = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          repositories(
            first: 100,
            ownerAffiliations: [OWNER],
            orderBy: {field: STARGAZERS, direction: DESC}
          ) {
            nodes {
              nameWithOwner
              stargazerCount
              forkCount
              isPrivate
              viewerPermission
              description
              url
            }
          }
          repositoriesContributedTo(
            first: 100,
            contributionTypes: [COMMIT, PULL_REQUEST, REPOSITORY],
            includeUserRepositories: false,
            privacy: PUBLIC,
            orderBy: {field: STARGAZERS, direction: DESC}
          ) {
            nodes {
              nameWithOwner
              stargazerCount
              forkCount
              isPrivate
              viewerPermission
              description
              url
            }
          }
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalRepositoryContributions
            totalPullRequestContributions
            totalIssueContributions
            contributionCalendar {
              totalContributions
            }
          }
          pullRequests {
            totalCount
          }
          issues {
            totalCount
          }
        }
      }
    `;

    // Query contributions for each year
    const yearlyQueries = [];
    for (let year = startYear; year <= currentYear; year++) {
      const from = new Date(year, 0, 1).toISOString();
      const to = new Date(year, 11, 31).toISOString();
      yearlyQueries.push(
        octokit.graphql(contributionsQuery, { 
          username,
          from,
          to
        })
      );
    }

    const yearlyResponses = await Promise.all(yearlyQueries);

    // Calculate total contributions across all years
    let totalContributions = 0;
    let totalCommits = 0;
    const contributionsByYear = {};

    yearlyResponses.forEach((response, index) => {
      const year = startYear + index;
      const yearContributions = response.user.contributionsCollection.contributionCalendar.totalContributions;
      const yearCommits = response.user.contributionsCollection.totalCommitContributions;
      
      contributionsByYear[year] = {
        total: yearContributions,
        commits: yearCommits
      };
      
      totalContributions += yearContributions;
      totalCommits += yearCommits;
    });

    // Use the last response for repository data
    const lastResponse = yearlyResponses[yearlyResponses.length - 1];
    const allRepos = new Map();
    
    // Add personal repositories
    lastResponse.user.repositories.nodes.forEach(repo => {
      if (!repo.isPrivate) {
        allRepos.set(repo.nameWithOwner, repo);
      }
    });

    // Add contributed repositories where user has admin access
    lastResponse.user.repositoriesContributedTo.nodes.forEach(repo => {
      if (!repo.isPrivate && repo.viewerPermission === 'ADMIN') {
        allRepos.set(repo.nameWithOwner, repo);
      }
    });

    const uniqueRepos = Array.from(allRepos.values());
    const totalStars = uniqueRepos.reduce((acc, repo) => acc + repo.stargazerCount, 0);
    const totalForks = uniqueRepos.reduce((acc, repo) => acc + repo.forkCount, 0);

    // Calculate combined ranking (stars + forks) for repositories
    const top10Combined = [...uniqueRepos]
      .map(repo => ({
        name: repo.nameWithOwner,
        stars: repo.stargazerCount,
        forks: repo.forkCount,
        description: repo.description,
        url: repo.url,
        // Combined score gives equal weight to stars and forks
        combinedScore: repo.stargazerCount + repo.forkCount
      }))
      .sort((a, b) => {
        // Sort by combined score first
        const scoreDiff = b.combinedScore - a.combinedScore;
        if (scoreDiff !== 0) return scoreDiff;
        // If combined scores are equal, prioritize stars
        return b.stars - a.stars;
      })
      .slice(0, 10);

    // Get traffic data for each repository in parallel
    const top10WithTraffic = await Promise.all(
      top10Combined.map(async (repo) => {
        const [owner, repoName] = repo.name.split('/');
        const trafficData = await getRepositoryTraffic(owner, repoName, octokit);
        
        return {
          ...repo,
          ...(trafficData || { traffic: {} }) // Use empty object if traffic data is null
        };
      })
    );

    return {
      publicRepos: userResponse.data.public_repos,
      followers: userResponse.data.followers,
      following: userResponse.data.following,
      totalStars,
      totalForks,
      totalPRs: lastResponse.user.pullRequests.totalCount,
      totalIssues: lastResponse.user.issues.totalCount,
      contributions: {
        total: totalContributions,
        totalCommits: totalCommits,
        byYear: contributionsByYear
      },
      createdAt: userResponse.data.created_at,
      topRepositories: top10WithTraffic
    };
  } catch (error) {
    if (error.status === 404) {
      throw new Error(`GitHub user not found`);
    }
    if (error.status === 401) {
      throw new Error('Invalid GitHub access token');
    }
    console.error('Error fetching GitHub stats:', error);
    throw error;
  }
};

module.exports = {
  getUserGitHubStats
};