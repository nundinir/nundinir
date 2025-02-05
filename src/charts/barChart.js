const vega = require('vega');
const { chartConfigs, ALL_TIME_COLOR, LAST_7_DAYS_COLOR, FONT_FAMILY, FONT_COLOR, LABEL_COLOR, FONT_SIZE } = require('./configs');

exports.createBarChart = async function(datasets, field) {

  if (!datasets || !datasets.length) {
    throw new Error('No datasets provided for bar chart');
  }

  const allTimeDataset = datasets.find(d => d.period === 'all_time');
  const weekDataset = datasets.find(d => d.period === 'last_7_days');

  
  if (!allTimeDataset || !weekDataset) {
    throw new Error('All required datasets (all_time, last_7_days) must be provided');
  }


  const config = chartConfigs[field];
  // Process and combine data from all periods
  const filteredAllTime = allTimeDataset.data[field]
    .filter(item => item.total_seconds > 0)
    .slice(0, config.maxLength);

  // Create combined dataset with all periods
  const combinedData = filteredAllTime.flatMap(item => {
    const weekItem = weekDataset.data[field].find(d => d.name === item.name) || { total_seconds: 0 };

    return [
      {
        name: item.name,
        value: weekItem.total_seconds,
        category: 'last_7_days'
      },
      {
        name: item.name,
        value: item.total_seconds - weekItem.total_seconds,
        category: 'all_time'
      }
    ];
  });

  const itemCount = combinedData.length;

  const spec = {
    "$schema": "https://vega.github.io/schema/vega/v5.json",
    "width": config.width,
    "height": itemCount * 17,
    "padding": "30",
    "layout": {
      "legend": {
        "bottom": {
          "anchor": "middle",
          "direction": "horizontal",
          "margin": 4
        }
      }
    },
    "data": [
      {
        "name": "table",
        "values": combinedData,
        "transform": [
          {
            "type": "stack",
            "groupby": ["name"],
            "field": "value",
            "sort": {"field": "category"}
          }
        ]
      },
      {
        "name": "aggregated",
        "source": "table",
        "transform": [
          {
            "type": "aggregate",
            "groupby": ["name"],
            "fields": ["value"],
            "ops": ["sum"],
            "as": ["total"]
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "name",
        "type": "band",
        "range": "height",
        "domain": {"data": "table", "field": "name"},
        "padding": 0.2,
      },
      {
        "name": "value",
        "type": "linear",
        "range": "width",
        "nice": true, "zero": true,
        "domain": {"data": "table", "field": "value"}
      },
      {
        "name": "color",
        "type": "ordinal",
        "range": [LAST_7_DAYS_COLOR, ALL_TIME_COLOR],
        "domain": {"data": "table", "field": "category"}
      }
    ],
  
    "axes": [
      {
        "orient": "left", 
        "scale": "name", 
        "labels": false
      },
      {
        "orient": "bottom", 
        "scale": "value", 
        "zindex": 1,
        "tickColor": FONT_COLOR,
        "labelColor": FONT_COLOR,
        "labelFont": FONT_FAMILY,
        "labelFontSize": 10,
        "format": "s",
        "formatType": "number",


        "encode": {
          "labels": {
            "update": {
              "text": {"signal": "format(datum.value / 3600, '~d') + 'h'"}
            }
          }
        }
      }
    ],
  
    "legends": [
      {
        "fill": "color",
        "orient": "bottom",
        "direction": "horizontal",
        "labelColor": LABEL_COLOR,
        "labelFont": FONT_FAMILY,
        "labelFontSize": FONT_SIZE,
        "titlePadding": 5,
        "columns": 2

      }
    ],

    "marks": [
      {
        "type": "rect",
        "from": {"data": "table"},
        "encode": {
          "enter": {
            "y": {"scale": "name", "field": "name"},
            "height": {"scale": "name", "band": 1},
            "x": {"scale": "value", "field": "y0"},
            "x2": {"scale": "value", "field": "y1"},
            "fill": {"scale": "color", "field": "category"}
          }
        }
      },
      {
        "type": "text",
        "from": {"data": "aggregated"},
        "encode": {
          "enter": {
            "y": {"scale": "name", "field": "name", "band": 0.5},
            "x": {"value": 5},
            "text": {
              "signal": "datum.name + ' (' + format(datum.total / 3600, '~d') + 'h)'"
            },
            "fontSize": {"value": FONT_SIZE},
            "font": {"value": FONT_FAMILY},
            "fill": {"value": LABEL_COLOR},
            "align": {"value": "left"},
            "baseline": {"value": "middle"}
          }
        }
      }
    ]
  };

  const view = new vega.View(vega.parse(spec), {
    renderer: 'svg'
  });
  
  const svg = await view.toSVG();
  return Buffer.from(svg);
};