'use strict';

System.register(['d3', 'lodash', 'app/core/core', 'app/core/utils/ticks', 'moment', 'jquery', '../fragments', './tooltip'], function (_export, _context) {
  "use strict";

  var d3, _, appEvents, contextSrv, tickStep, moment, $, getFragment, CarpetplotTooltip, _slicedToArray, Y_AXIS_TICK_PADDING, MIN_SELECTION_WIDTH, STROKE_STYLE;

  function link(scope, elem, attrs, ctrl) {
    var data = void 0,
        panel = void 0,
        timeRange = void 0,
        carpet = void 0,
        canvas = void 0,
        context = void 0;

    var $carpet = elem.find('.carpetplot-panel');
    var tooltip = new CarpetplotTooltip($carpet, scope, ctrl);

    var margin = { left: 25, right: 15, top: 10, bottom: 10 };

    var width = void 0,
        height = void 0,
        min = void 0,
        max = void 0,
        xFrom = void 0,
        xTo = void 0,
        chartHeight = void 0,
        chartWidth = void 0,
        chartTop = void 0,
        chartBottom = void 0,
        xAxisHeight = void 0,
        yAxisWidth = void 0,
        yScale = void 0,
        invertedYScale = void 0,
        xScale = void 0,
        colorScale = void 0,
        fragment = void 0,
        mouseUpHandler = void 0,
        originalPointColor = void 0,
        pointWidth = void 0,
        pointHeight = void 0,
        highlightedBucket = void 0,
        $canvas = void 0;

    var targets = void 0;

    var selection = {
      active: false,
      x1: -1,
      x2: -1,
      y: -1
    };

    ctrl.events.on('render', function () {
      render();
      ctrl.renderingCompleted();
    });

    function addCarpetplot() {
      if (!data.data || !data.data[0]) {
        return;
      }

      addCarpetplotSvg();
      if (data.targets.length > 0) {
        var _getMinMax = getMinMax();

        var _getMinMax2 = _slicedToArray(_getMinMax, 2);

        min = _getMinMax2[0];
        max = _getMinMax2[1];

        colorScale = getColorScale(min, max);

        addAxes();
        addCanvas();
        addPoints();

        appEvents.on('graph-hover', function (event) {
          drawSharedCrosshair(event.pos);
        }, scope);

        appEvents.on('graph-hover-clear', function () {
          clearCrosshair();
        }, scope);
      } else {
        // todo : nothing to show here
      }
    }

    function addCarpetplotSvg() {
      width = Math.floor($carpet.width());
      height = ctrl.height;

      if (carpet) {
        carpet.remove();
      }

      if (canvas) {
        canvas.remove();
      }

      carpet = d3.select($carpet[0]).append('svg').attr('width', width).attr('height', height);
    }

    function addAxes() {
      xAxisHeight = panel.xAxis.hideLabels ? 0 : 10;
      chartHeight = height - margin.top - margin.bottom - xAxisHeight;
      pointHeight = Math.max(0, chartHeight / targets.length);
      chartTop = margin.top;
      chartBottom = chartTop + chartHeight;

      addYAxis();
      yAxisWidth = panel.yAxis.hideLabels ? 0 : getYAxisWidth() + Y_AXIS_TICK_PADDING;
      chartWidth = width - yAxisWidth - margin.right;

      addXAxis();

      pointWidth = Math.max(0, chartWidth / data.data.length);

      if (!panel.yAxis.show) {
        carpet.select('.axis-y').selectAll('line').style('opacity', 0);
      }

      if (!panel.xAxis.show) {
        carpet.select('.axis-x').selectAll('line').style('opacity', 0);
      }
    }

    function addYAxis() {
      var ticks = data.targets;

      yScale = d3.scaleOrdinal().domain(ticks).range(d3.range(0, chartHeight, chartHeight / ticks.length));

      invertedYScale = d3.scaleQuantize().domain([0, chartHeight]).range(yScale.domain());

      var yAxis = d3.axisLeft(yScale).tickValues(ticks).tickSizeInner(0 - width).tickSizeOuter(0).tickPadding(Y_AXIS_TICK_PADDING);

      if (!panel.yAxis.hideLabels) {
        carpet.append('g').attr('class', 'axis axis-y').call(yAxis);

        var posY = margin.top + pointHeight / 2;
        var posX = getYAxisWidth() + Y_AXIS_TICK_PADDING;

        var yAxisGroup = carpet.select('.axis-y');
        yAxisGroup.attr('transform', 'translate(' + posX + ',' + posY + ')');
        yAxisGroup.select('.domain').remove();
        yAxisGroup.selectAll('.tick line').remove();
      }
    }

    function getYAxisWidth() {
      var axisText = carpet.selectAll('.axis-y text').nodes();
      return d3.max(axisText, function (text) {
        return $(text).outerWidth();
      });
    }

    function addXAxis() {
      xFrom = moment.utc(data.data[0].timestamp).startOf('day');
      xTo = moment.utc(data.data[data.data.length - 1].timestamp).startOf('day').add(1, 'day');

      xScale = d3.scaleUtc().domain([xFrom, xTo]).range([0, chartWidth]);

      var xAxis = d3.axisBottom(xScale).ticks().tickSize(chartHeight);

      var posY = margin.top;
      var posX = yAxisWidth;

      if (!panel.xAxis.hideLabels) {
        carpet.append('g').attr('class', 'axis axis-x').attr('transform', 'translate(' + posX + ',' + posY + ')').call(xAxis);
        carpet.select('.axis-x').selectAll('.tick line, .domain').remove();
      }
    }

    function grafanaTimeFormat(ticks, min, max) {
      if (min && max && ticks) {
        var range = max - min;
        var secPerTick = range / ticks / 1000;
        var oneDay = 86400000;
        var oneYear = 31536000000;

        if (secPerTick <= 45) {
          return "%H:%M:%S";
        }
        if (secPerTick <= 7200 || range <= oneDay) {
          return "%H:%M";
        }
        if (secPerTick <= 80000) {
          return "%m/%d %H:%M";
        }
        if (secPerTick <= 2419200 || range <= oneYear) {
          return "%m/%d";
        }
        return "%Y-%m";
      }

      return "%H:%M";
    }

    function addCanvas() {
      if (canvas) {
        canvas.remove();
      }

      canvas = d3.select($carpet[0]).insert('canvas', ':first-child').attr('width', chartWidth).attr('height', chartHeight).style('left', yAxisWidth + 'px').style('top', margin.top + 'px');

      $canvas = $(canvas.node());

      context = canvas.node().getContext('2d');
      context.lineWidth = 0.5;
    }

    function addPoints() {
      var customBase = document.createElement('custom');

      var container = d3.select(customBase);

      var pointScale = d3.scaleLinear().domain([0, targets.length]).range([0, chartHeight]);

      var cols = container.selectAll('custom.carpet-col').data(data.data).enter().append('custom').attr('class', 'carpet-col');

      var points = cols.selectAll('custom.carpet-point').data(function (d, i) {
        return _.map(d.buckets, function (value, target) {
          return {
            value: value,
            target: target,
            timestamp: d.timestamp
          };
        });
      }).enter().append('custom').attr('class', 'carpet-point').attr('fillStyle', function (_ref) {
        var value = _ref.value;
        return value === null ? panel.color.nullColor : colorScale(value);
      }).attr('x', function (d) {
        return xScale(moment.utc(d.timestamp));
      }).attr('y', function (d, i) {
        return pointScale(i);
      });

      drawPoints(cols);
    }

    function drawPoints(cols) {
      context.clearRect(0, 0, chartWidth, chartHeight);

      var elements = cols.selectAll('custom.carpet-point').each(function (d, i) {
        var node = d3.select(this);

        context.fillStyle = node.attr('fillStyle');
        context.fillRect(node.attr('x'), node.attr('y'), pointWidth, pointHeight);

        context.strokeStyle = STROKE_STYLE;
        context.strokeRect(node.attr('x'), node.attr('y'), pointWidth, pointHeight);
      });
    }

    function getMinMax() {
      var _panel$scale = panel.scale,
          min = _panel$scale.min,
          max = _panel$scale.max;

      return [isSet(min) ? min : data.stats.min, isSet(max) ? max : data.stats.max];
    }

    function getColorScale(min, max) {
      var colorScheme = _.find(ctrl.colorSchemes, { value: panel.color.colorScheme });
      var colorInterpolator = d3[colorScheme.value];
      var colorScaleInverted = colorScheme.invert === 'always' || colorScheme.invert === 'dark' && !contextSrv.user.lightTheme;
      colorScaleInverted = panel.color.invert ? !colorScaleInverted : colorScaleInverted;

      var start = colorScaleInverted ? max : min;
      var end = colorScaleInverted ? min : max;

      return d3.scaleSequential(colorInterpolator).domain([start, end]);
    }

    function isSet(prop) {
      return prop !== undefined && prop !== null && prop !== '';
    }

    function onMouseDown(event) {
      var pos = getMousePos(event);
      if (!isInChart(pos)) {
        return;
      }

      selection.active = true;
      selection.x1 = pos.x;
      selection.y = pos.y;

      mouseUpHandler = function mouseUpHandler() {
        return onMouseUp();
      };

      $(document).one('mouseup', mouseUpHandler);
    }

    function onMouseUp() {
      $(document).unbind('mouseup', mouseUpHandler);
      mouseUpHandler = null;
      selection.active = false;

      var selectionRange = Math.abs(selection.x2 - selection.x1);

      if (selection.x2 >= 0 && selectionRange > MIN_SELECTION_WIDTH) {
        var timeFrom = moment.utc(xScale.invert(Math.min(selection.x1, selection.x2)));
        var timeTo = moment.utc(xScale.invert(Math.max(selection.x1, selection.x2)));

        ctrl.timeSrv.setTime({
          from: moment.utc(timeFrom),
          to: moment.utc(timeTo)
        });
      } else {

        if (ctrl.panel.template.update) {
          var target = invertedYScale(selection.y);

          var variable = _.find(ctrl.variableSrv.variables, { "name": ctrl.panel.template.variableToUpdate });
          variable.current.text = target;
          variable.current.value = [target];

          ctrl.variableSrv.updateOptions(variable).then(function () {
            ctrl.variableSrv.variableUpdated(variable).then(function () {
              ctrl.$scope.$emit('template-variable-value-updated');
              ctrl.$scope.$root.$broadcast('refresh');
            });
          });
        }
      }

      clearSelection();
    }

    function onMouseLeave() {
      appEvents.emit('graph-hover-clear');
      clearCrosshair();
    }

    function onMouseMove(event) {
      if (!carpet) {
        return;
      }
      if (!$canvas) {
        return;
      }

      var pos = getMousePos(event);

      if (selection.active) {
        selection.x2 = pos.x;
        drawSelection(selection.x1, selection.x2);
      }
      emitGraphHoverEvent(event, pos);

      drawCrosshair(pos);

      var bucket = getBucket(pos);
      if (bucket) {
        tooltip.show(pos, bucket);
        highlightPoint(pos, bucket);
      } else {
        resetPointHighLight();
        tooltip.destroy();
      }
    }

    function emitGraphHoverEvent(event, pos) {
      var x = xScale.invert(event.offsetX - yAxisWidth).valueOf();
      var target = invertedYScale(pos.y);

      // broadcast to other graph panels that we are hovering
      appEvents.emit('graph-hover', {
        pos: {
          pageX: event.pageX,
          pageY: event.pageY,
          x: x, x1: x,
          // Set minimum offset to prevent showing legend from another panel
          panelRelY: Math.max(event.offsetY / height, 0.001)
        },
        panel: panel,
        target: target
      });
    }

    function highlightPoint(pos, bucket) {
      if (!isInChart(pos) || !bucket || !bucket.hasValue()) {
        resetPointHighLight();
        return;
      }

      if (bucket.equals(highlightedBucket)) {
        return;
      } else {
        resetPointHighLight();
      }

      highlightedBucket = bucket;

      var value = bucket.value,
          x = bucket.x,
          y = bucket.y;


      var color = colorScale(value);
      var highlightColor = d3.color(color).darker(1);
      originalPointColor = color;

      context.fillStyle = highlightColor;
      context.fillRect(x, y, pointWidth, pointHeight);

      context.strokeStyle = STROKE_STYLE;
      context.strokeRect(x, y, pointWidth, pointHeight);
    }

    function resetPointHighLight() {
      if (!highlightedBucket) {
        return;
      }

      var _highlightedBucket = highlightedBucket,
          x = _highlightedBucket.x,
          y = _highlightedBucket.y;

      context.fillStyle = originalPointColor;
      context.fillRect(x, y, pointWidth, pointHeight);

      context.strokeStyle = STROKE_STYLE;
      context.strokeRect(x, y, pointWidth, pointHeight);

      highlightedBucket = null;
    }

    function getMousePos(event) {
      var _$canvas$0$getBoundin = $canvas[0].getBoundingClientRect(),
          left = _$canvas$0$getBoundin.left,
          top = _$canvas$0$getBoundin.top;

      var pageX = event.pageX,
          pageY = event.pageY;

      var pos = {
        x: pageX - window.scrollX - left,
        y: pageY - window.scrollY - top,
        pageX: pageX,
        pageY: pageY
      };
      return pos;
    }

    function drawCrosshair(pos) {
      if (!carpet || !isInChart(pos)) {
        clearCrosshair();
        return;
      }

      carpet.selectAll('.heatmap-crosshair').remove();

      var x = pos.x + yAxisWidth;
      var y = pos.y + chartTop;

      var crosshair = carpet.append('g').attr('class', 'heatmap-crosshair');

      if (panel.xAxis.showCrosshair) {
        crosshair.append('line').attr('x1', x).attr('y1', chartTop).attr('x2', x).attr('y2', chartBottom).attr('stroke-width', 1);
      }

      if (panel.yAxis.showCrosshair) {
        crosshair.append('line').attr('x1', yAxisWidth).attr('y1', y).attr('x2', yAxisWidth + chartWidth).attr('y2', y).attr('stroke-width', 1);
      }
    }

    function drawSharedCrosshair(pos) {
      if (carpet) {
        carpet.selectAll('.heatmap-crosshair').remove();

        var posX = xScale(moment.utc(pos.x));

        var crosshair = carpet.append('g').attr('class', 'heatmap-crosshair');

        var x = posX + yAxisWidth;
        crosshair.append('line').attr('x1', x).attr('y1', chartTop).attr('x2', x).attr('y2', chartBottom).attr('stroke-width', 1);
      }
    }

    function clearCrosshair() {
      if (!carpet) {
        return;
      }

      carpet.selectAll('.heatmap-crosshair').remove();
    }

    function drawSelection(posX1, posX2) {
      if (!carpet) {
        return;
      }

      carpet.selectAll('.carpet-selection').remove();
      var selectionX = Math.min(posX1, posX2) + yAxisWidth;
      var selectionWidth = Math.abs(posX1 - posX2);

      if (selectionWidth > MIN_SELECTION_WIDTH) {
        carpet.append('rect').attr('class', 'carpet-selection').attr('x', selectionX).attr('width', selectionWidth).attr('y', chartTop).attr('height', chartHeight);
      }
    }

    function clearSelection() {
      selection.x1 = -1;
      selection.x2 = -1;

      if (!carpet) {
        return;
      }

      carpet.selectAll('.carpet-selection').remove();
    }

    function drawColorLegend() {
      d3.select("#heatmap-color-legend").selectAll("rect").remove();

      var legend = d3.select("#heatmap-color-legend");
      var legendWidth = Math.floor($(d3.select("#heatmap-color-legend").node()).outerWidth());
      var legendHeight = d3.select("#heatmap-color-legend").attr("height");

      drawLegend(legend, legendWidth, legendHeight);
    }

    function drawLegend(legend, legendWidth, legendHeight) {
      var rangeStep = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 2;

      var legendColorScale = getColorScale(0, legendWidth);
      var valuesRange = d3.range(0, legendWidth, rangeStep);

      return legend.selectAll(".heatmap-color-legend-rect").data(valuesRange).enter().append("rect").attr("x", function (d) {
        return d;
      }).attr("y", 0).attr("width", rangeStep + 1) // Overlap rectangles to prevent gaps
      .attr("height", legendHeight).attr("stroke-width", 0).attr("fill", function (d) {
        return legendColorScale(d);
      });
    }

    // Helpers
    function isInChart(pos) {
      var x = pos.x,
          y = pos.y;


      return x > 0 && x < chartWidth && y > 0 && y < chartHeight;
    }

    function getBucket(pos) {
      var x = pos.x,
          y = pos.y;


      var bucketTimestamp = fragment.getBucketTimestamp(moment(xScale.invert(x)).valueOf());
      var xTime = moment.utc(bucketTimestamp);
      var index = fragment.getBucketIndex(xTime, xFrom);

      var target = invertedYScale(y);
      var bucketIndex = _.indexOf(targets, target);

      var bucketX = xScale(xTime.toDate());
      var bucketY = pointHeight * bucketIndex;

      return _.has(data, 'data[' + index + '].buckets[' + target + ']') ? {
        x: bucketX,
        y: bucketY,
        target: target,
        timestamp: data.data[index].timestamp,
        value: data.data[index].buckets[target],
        hasValue: function hasValue() {
          return this.value !== null;
        },
        equals: function equals(bucket) {
          return bucket && bucket.x === this.x && bucket.y === this.y;
        }
      } : null;
    }

    function hasData() {
      return data && data.data;
    }

    function noDataPoints() {
      var html = '<div class="datapoints-warning"><span class="small">No data points</span></div>';
      elem.html(html);
    }

    function render() {
      data = ctrl.data;
      panel = ctrl.panel;
      timeRange = ctrl.range;

      targets = ctrl.data.targets;
      fragment = getFragment(panel.fragment);

      if (!d3.select('#heatmap-color-legend').empty()) {
        drawColorLegend();
      }

      addCarpetplot();

      scope.hasData = hasData;
      scope.isInChart = isInChart;

      ctrl.renderingCompleted();
    }

    $carpet.on('mousedown', onMouseDown);
    $carpet.on('mousemove', onMouseMove);
    $carpet.on('mouseleave', onMouseLeave);
  }

  _export('default', link);

  return {
    setters: [function (_d2) {
      d3 = _d2.default;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_appCoreCore) {
      appEvents = _appCoreCore.appEvents;
      contextSrv = _appCoreCore.contextSrv;
    }, function (_appCoreUtilsTicks) {
      tickStep = _appCoreUtilsTicks.tickStep;
    }, function (_moment) {
      moment = _moment.default;
    }, function (_jquery) {
      $ = _jquery.default;
    }, function (_fragments) {
      getFragment = _fragments.getFragment;
    }, function (_tooltip) {
      CarpetplotTooltip = _tooltip.default;
    }],
    execute: function () {
      _slicedToArray = function () {
        function sliceIterator(arr, i) {
          var _arr = [];
          var _n = true;
          var _d = false;
          var _e = undefined;

          try {
            for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
              _arr.push(_s.value);

              if (i && _arr.length === i) break;
            }
          } catch (err) {
            _d = true;
            _e = err;
          } finally {
            try {
              if (!_n && _i["return"]) _i["return"]();
            } finally {
              if (_d) throw _e;
            }
          }

          return _arr;
        }

        return function (arr, i) {
          if (Array.isArray(arr)) {
            return arr;
          } else if (Symbol.iterator in Object(arr)) {
            return sliceIterator(arr, i);
          } else {
            throw new TypeError("Invalid attempt to destructure non-iterable instance");
          }
        };
      }();

      Y_AXIS_TICK_PADDING = 5;
      MIN_SELECTION_WIDTH = 2;
      STROKE_STYLE = 'white';
    }
  };
});
//# sourceMappingURL=rendering.js.map
