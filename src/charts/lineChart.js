const vega = require('vega');
const { FONT_FAMILY, FONT_COLOR, FONT_SIZE, LABEL_COLOR } = require('./configs');

exports.createlineChart = async function createlineChart(repositories) {
  // Transform the data into the format required by Vega
  const transformedData = [];
  const repoTotalViews = new Map(); // To store total views per repository

  // First pass: calculate total views per repository
  repositories.forEach(repo => {
    const totalViews = Object.values(repo.traffic)
      .reduce((sum, data) => sum + data.totalViews, 0);
    repoTotalViews.set(repo.name.split('/')[1], totalViews);
  });

  // Second pass: create transformed data with sorted repositories
  repositories.forEach(repo => {
    Object.entries(repo.traffic).forEach(([date, data]) => {
      transformedData.push({
        date: date.slice(5, 10),
        views: data.totalViews,
        repository: repo.name.split('/')[1],
        totalViews: repoTotalViews.get(repo.name.split('/')[1]) // Add total views for sorting
      });
    });
  });

  // Sort the unique repositories by total views for the color scale domain
  const sortedRepos = Array.from(repoTotalViews.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by total views descending
    .map(([repo]) => repo); // Get just the repo names

  const spec = {
    "$schema": "https://vega.github.io/schema/vega/v5.json",
    "description": "Repository Traffic Line Chart",
    "width": 800,
    "height": 400,
    "padding": 20,
    
    "title": {
      "text": "Repository Views Over Time",
      "font": FONT_FAMILY,
      "fontSize": FONT_SIZE + 4,
      "color": LABEL_COLOR,
      "anchor": "middle",
    },

    "data": [
      {
        "name": "table",
        "values": transformedData
      }
    ],

    "scales": [
      {
        "name": "date",
        "type": "point",
        "range": "width",
        "nice": true,
        "domain": {"data": "table", "field": "date"}
      },
      {
        "name": "views",
        "type": "linear",
        "range": "height",
        "nice": true,
        "zero": true,
        "domain": {"data": "table", "field": "views"}
      },

      {
        "name": "color",
        "type": "ordinal",
        "range": {"scheme": "greenblue"},
        "domain": sortedRepos // Use the pre-sorted repository names
      }
    ],

    "axes": [
      {
        "orient": "bottom",
        "scale": "date",
        "title": "Date",
        "titleFont": FONT_FAMILY,
        "titleColor": FONT_COLOR,
        "titleFontSize": FONT_SIZE,
        "labelFont": FONT_FAMILY,
        "labelColor": FONT_COLOR,
        "labelFontSize": FONT_SIZE

      },
      {
        "orient": "left",
        "scale": "views",
        "title": "Views",
        "titleFont": FONT_FAMILY,
        "titleColor": FONT_COLOR,
        "titleFontSize": FONT_SIZE,
        "labelFont": FONT_FAMILY,
        "labelColor": FONT_COLOR,
        "labelFontSize": FONT_SIZE

      }
    ],

    "legends": [
      {
        "fill": "color",
        "orient": "bottom",
        "anchor": "middle",
        "labelFont": FONT_FAMILY,
        "labelFontSize": FONT_SIZE,
        "labelColor": LABEL_COLOR,
        "direction": "horizontal",
        "columns": 0,
        "encode": {
          "symbols": {
            "update": {
              "fill": {"scale": "color", "field": "label"}
            }
          }
        },
      }
    ],

    "marks": [
      {
        "type": "group",
        "from": {
          "facet": {
            "name": "series",
            "data": "table",
            "groupby": "repository"
          }
        },
        "marks": [
          {
            "type": "line",
            "from": {"data": "series"},
            "encode": {
              "enter": {
                "interpolate": {"value": "monotone"},
                "x": {"scale": "date", "field": "date"},
                "y": {"scale": "views", "field": "views"},
                "stroke": {"scale": "color", "field": "repository"},
                "strokeWidth": {"value": 2}
              }
            }
          },
          {
            "type": "text",
            "from": {"data": "series"},
            "encode": {
              "enter": {
                "x": {"scale": "date", "field": "date"},
                "y": {"scale": "views", "field": "views", "offset": -8},
                "text": {"field": "views"},
                "fontSize": {"value": 10},
                "align": {"value": "center"},
                "baseline": {"value": "bottom"},
                "fill": {"value": "#888888"}
              }
            }
          }
        ]
      }
    ]
  };

  const view = new vega.View(vega.parse(spec), {
    renderer: 'svg'
  });
  
  const svg = await view.toSVG();
  return Buffer.from(svg);

}
