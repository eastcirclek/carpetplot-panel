import d3 from 'd3';
import _ from 'lodash';
import { appEvents, contextSrv } from 'app/core/core';
import { tickStep } from 'app/core/utils/ticks';
import moment from 'moment';
import $ from 'jquery';

import { getFragment } from '../fragments';
import CarpetplotTooltip from './tooltip';

const
  Y_AXIS_TICK_PADDING = 5,
  MIN_SELECTION_WIDTH = 2,
  STROKE_STYLE = 'white';

export default function link(scope, elem, attrs, ctrl) {
  let data, panel, timeRange, carpet, canvas, context;

  const $carpet = elem.find('.carpetplot-panel');
  const tooltip = new CarpetplotTooltip($carpet, scope, ctrl);

  const margin = { left: 25, right: 15, top: 10, bottom: 10 };

  let width, height,
    min, max,
    xFrom, xTo,
    chartHeight, chartWidth,
    chartTop, chartBottom,
    xAxisHeight, yAxisWidth,
    yScale, invertedYScale, xScale,
    colorScale, fragment,
    mouseUpHandler,
    originalPointColor,
    pointWidth, pointHeight,
    highlightedBucket,
    $canvas;

  let targets;

  const selection = {
    active: false,
    x1: -1,
    x2: -1,
    y: -1
  };

  ctrl.events.on('render', () => {
    render();
    ctrl.renderingCompleted();
  });

  function addCarpetplot() {
    if (!data.data || !data.data[0]) { return; }

    addCarpetplotSvg();
    if (data.targets.length > 0) {
      [min, max] = getMinMax();
      colorScale = getColorScale(min, max);

      addAxes();
      addCanvas();
      addPoints();

      appEvents.on('graph-hover', event => {
        drawSharedCrosshair(event.pos);
      }, scope);

      appEvents.on('graph-hover-clear', () => {
        clearCrosshair()
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

    carpet = d3.select($carpet[0])
      .append('svg')
      .attr('width', width)
      .attr('height', height);
  }

  function addAxes() {
    xAxisHeight = panel.xAxis.hideLabels ? 0 : 10;
    chartHeight = height - margin.top - margin.bottom - xAxisHeight;
    pointHeight = Math.max(0, chartHeight / targets.length);
    chartTop = margin.top;
    chartBottom = chartTop + chartHeight;

    addYAxis();
    yAxisWidth = panel.yAxis.hideLabels ? 0 : (getYAxisWidth() + Y_AXIS_TICK_PADDING);
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
    const ticks = data.targets;

    yScale = d3.scaleOrdinal()
      .domain(ticks)
      .range(d3.range(0, chartHeight, chartHeight / ticks.length));

    invertedYScale = d3.scaleQuantize()
      .domain([0, chartHeight])
      .range(yScale.domain());

    const yAxis = d3.axisLeft(yScale)
      .tickValues(ticks)
      .tickSizeInner(0 - width)
      .tickSizeOuter(0)
      .tickPadding(Y_AXIS_TICK_PADDING);

    if (!panel.yAxis.hideLabels) {
      carpet.append('g')
        .attr('class', 'axis axis-y')
        .call(yAxis);

      const posY = margin.top + pointHeight/2;
      const posX = getYAxisWidth() + Y_AXIS_TICK_PADDING;

      const yAxisGroup = carpet.select('.axis-y');
      yAxisGroup.attr('transform', `translate(${posX},${posY})`);
      yAxisGroup.select('.domain').remove();
      yAxisGroup.selectAll('.tick line').remove();
    }
  }

  function getYAxisWidth() {
    const axisText = carpet.selectAll('.axis-y text').nodes();
    return d3.max(axisText, (text) => $(text).outerWidth());
  }

  function addXAxis() {
    xFrom = moment.utc(data.data[0].timestamp).startOf('day');
    xTo = moment.utc(data.data[data.data.length - 1].timestamp).startOf('day').add(1, 'day');

    xScale = d3.scaleUtc()
      .domain([xFrom, xTo])
      .range([0, chartWidth]);

    const xAxis = d3.axisBottom(xScale)
      .ticks()
      .tickSize(chartHeight);

    const posY = margin.top;
    const posX = yAxisWidth;

    if (!panel.xAxis.hideLabels) {
      carpet.append('g')
        .attr('class', 'axis axis-x')
        .attr('transform', `translate(${posX},${posY})`)
        .call(xAxis)
      carpet.select('.axis-x').selectAll('.tick line, .domain').remove();
    }
  }

  function grafanaTimeFormat(ticks, min, max) {
    if (min && max && ticks) {
      let range = max - min;
      let secPerTick = (range/ticks) / 1000;
      let oneDay = 86400000;
      let oneYear = 31536000000;

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

    canvas = d3.select($carpet[0])
      .insert('canvas', ':first-child')
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .style('left', `${yAxisWidth}px`)
      .style('top', `${margin.top}px`);

    $canvas = $(canvas.node());

    context = canvas.node().getContext('2d');
    context.lineWidth = 0.5;
  }

  function addPoints() {
    const customBase = document.createElement('custom');

    const container = d3.select(customBase);

    const pointScale = d3.scaleLinear()
      .domain([0, targets.length])
      .range([0, chartHeight]);

    const cols = container
      .selectAll('custom.carpet-col')
      .data(data.data)
      .enter()
      .append('custom')
      .attr('class', 'carpet-col');

    const points = cols
      .selectAll('custom.carpet-point')
      .data((d, i) =>
        _.map(d.buckets, function(value, target) {
          return {
            value,
            target: target,
            timestamp: d.timestamp
          }
        })
      )
      .enter()
      .append('custom')
      .attr('class', 'carpet-point')
      .attr('fillStyle', ({ value }) => value === null ? panel.color.nullColor : colorScale(value))
      .attr('x', (d) => xScale(moment.utc(d.timestamp)))
      .attr('y', (d, i) => pointScale(i));

    drawPoints(cols);
  }

  function drawPoints(cols) {
    context.clearRect(0, 0, chartWidth, chartHeight);

    const elements = cols.selectAll('custom.carpet-point')
      .each(function (d, i) {
        const node = d3.select(this);

        context.fillStyle = node.attr('fillStyle');
        context.fillRect(node.attr('x'), node.attr('y'), pointWidth, pointHeight);

        context.strokeStyle = STROKE_STYLE;
        context.strokeRect(node.attr('x'), node.attr('y'), pointWidth, pointHeight);
      });
  }

  function getMinMax() {
    const { min, max } = panel.scale;
    return [
      isSet(min) ? min : data.stats.min,
      isSet(max) ? max : data.stats.max
    ];
  }

  function getColorScale(min, max) {
    const colorScheme = _.find(ctrl.colorSchemes, { value: panel.color.colorScheme });
    const colorInterpolator = d3[colorScheme.value];
    let colorScaleInverted = colorScheme.invert === 'always' || (colorScheme.invert === 'dark' && !contextSrv.user.lightTheme);
    colorScaleInverted = panel.color.invert ? !colorScaleInverted : colorScaleInverted;

    const start = colorScaleInverted ? max : min;
    const end = colorScaleInverted ? min : max;

    return d3
      .scaleSequential(colorInterpolator)
      .domain([start, end]);
  }

  function isSet(prop) {
    return prop !== undefined && prop !== null && prop !== '';
  }

  function onMouseDown(event) {
    const pos = getMousePos(event);
    if (!isInChart(pos)) { return; }

    selection.active = true;
    selection.x1 = pos.x;
    selection.y = pos.y;

    mouseUpHandler = () => onMouseUp();

    $(document).one('mouseup', mouseUpHandler);
  }

  function onMouseUp() {
    $(document).unbind('mouseup', mouseUpHandler);
    mouseUpHandler = null;
    selection.active = false;

    const selectionRange = Math.abs(selection.x2 - selection.x1);

    if (selection.x2 >= 0 && selectionRange > MIN_SELECTION_WIDTH) {
      const timeFrom = moment.utc(xScale.invert(Math.min(selection.x1, selection.x2)));
      const timeTo = moment.utc(xScale.invert(Math.max(selection.x1, selection.x2)));

      ctrl.timeSrv.setTime({
        from: moment.utc(timeFrom),
        to: moment.utc(timeTo)
      });
    } else {

      if (ctrl.panel.template.update) {
        const target = invertedYScale(selection.y);

        const variable = _.find(ctrl.variableSrv.variables, {"name": ctrl.panel.template.variableToUpdate});
        variable.current.text = target;
        variable.current.value = [target];

        ctrl.variableSrv.updateOptions(variable).then(() => {
          ctrl.variableSrv.variableUpdated(variable).then(() => {
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
    if (!carpet) { return; }
    if (!$canvas) { return; }

    const pos = getMousePos(event);

    if (selection.active) {
      selection.x2 = pos.x;
      drawSelection(selection.x1, selection.x2);
    }
    emitGraphHoverEvent(event, pos);

    drawCrosshair(pos);

    const bucket = getBucket(pos);
    if (bucket) {
      tooltip.show(pos, bucket);
      highlightPoint(pos, bucket);
    } else {
      resetPointHighLight();
      tooltip.destroy();
    }
  }

  function emitGraphHoverEvent(event, pos) {
    const x = xScale.invert(event.offsetX - yAxisWidth).valueOf();
    const target = invertedYScale(pos.y);

    // broadcast to other graph panels that we are hovering
    appEvents.emit('graph-hover',
      {
        pos:
          {
            pageX: event.pageX,
            pageY: event.pageY,
            x: x, x1: x,
            // Set minimum offset to prevent showing legend from another panel
            panelRelY: Math.max(event.offsetY / height, 0.001)
          },
        panel: panel,
        target: target
      }
    );
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

    const { value, x, y } = bucket;

    const color = colorScale(value);
    const highlightColor = d3.color(color).darker(1);
    originalPointColor = color;

    context.fillStyle = highlightColor;
    context.fillRect(x, y, pointWidth, pointHeight);

    context.strokeStyle = STROKE_STYLE;
    context.strokeRect(x, y, pointWidth, pointHeight);
  }

  function resetPointHighLight() {
    if (!highlightedBucket) { return; }

    const { x, y } = highlightedBucket;
    context.fillStyle = originalPointColor;
    context.fillRect(x, y, pointWidth, pointHeight);

    context.strokeStyle = STROKE_STYLE;
    context.strokeRect(x, y, pointWidth, pointHeight);

    highlightedBucket = null;
  }

  function getMousePos(event) {
    const { left, top } = $canvas[0].getBoundingClientRect();
    const { pageX, pageY } = event;
    const pos = {
      x: pageX - window.scrollX - left,
      y: pageY - window.scrollY - top,
      pageX,
      pageY
    };
    return pos;
  }

  function drawCrosshair(pos) {
    if (!carpet || !isInChart(pos)) {
      clearCrosshair();
      return;
    }

    carpet.selectAll('.heatmap-crosshair').remove();

    const x = pos.x + yAxisWidth;
    const y = pos.y + chartTop;

    const crosshair = carpet.append('g')
      .attr('class', 'heatmap-crosshair');

    if (panel.xAxis.showCrosshair) {
      crosshair.append('line')
        .attr('x1', x)
        .attr('y1', chartTop)
        .attr('x2', x)
        .attr('y2', chartBottom)
        .attr('stroke-width', 1);
    }

    if (panel.yAxis.showCrosshair) {
      crosshair.append('line')
        .attr('x1', yAxisWidth)
        .attr('y1', y)
        .attr('x2', yAxisWidth + chartWidth)
        .attr('y2', y)
        .attr('stroke-width', 1);
    }
  }

  function drawSharedCrosshair(pos) {
    if (carpet) {
      carpet.selectAll('.heatmap-crosshair').remove();

      let posX = xScale(moment.utc(pos.x));

      const crosshair = carpet.append('g')
        .attr('class', 'heatmap-crosshair');

      const x = posX + yAxisWidth;
      crosshair.append('line')
        .attr('x1', x)
        .attr('y1', chartTop)
        .attr('x2', x)
        .attr('y2', chartBottom)
        .attr('stroke-width', 1);
    }
  }

  function clearCrosshair() {
    if (!carpet) { return; }

    carpet.selectAll('.heatmap-crosshair').remove();
  }

  function drawSelection(posX1, posX2) {
    if (!carpet) { return; }

    carpet.selectAll('.carpet-selection').remove();
    const selectionX = Math.min(posX1, posX2) + yAxisWidth;
    const selectionWidth = Math.abs(posX1 - posX2);

    if (selectionWidth > MIN_SELECTION_WIDTH) {
      carpet.append('rect')
        .attr('class', 'carpet-selection')
        .attr('x', selectionX)
        .attr('width', selectionWidth)
        .attr('y', chartTop)
        .attr('height', chartHeight);
    }
  }

  function clearSelection() {
    selection.x1 = -1;
    selection.x2 = -1;

    if (!carpet) { return; }

    carpet.selectAll('.carpet-selection').remove();
  }

  function drawColorLegend() {
    d3.select("#heatmap-color-legend").selectAll("rect").remove();

    const legend = d3.select("#heatmap-color-legend");
    const legendWidth = Math.floor($(d3.select("#heatmap-color-legend").node()).outerWidth());
    const legendHeight = d3.select("#heatmap-color-legend").attr("height");

    drawLegend(legend, legendWidth, legendHeight);
  }

  function drawLegend(legend, legendWidth, legendHeight, rangeStep = 2) {
    const legendColorScale = getColorScale(0, legendWidth);
    const valuesRange = d3.range(0, legendWidth, rangeStep);

    return legend.selectAll(".heatmap-color-legend-rect")
      .data(valuesRange)
      .enter()
      .append("rect")
      .attr("x", d => d)
      .attr("y", 0)
      .attr("width", rangeStep + 1) // Overlap rectangles to prevent gaps
      .attr("height", legendHeight)
      .attr("stroke-width", 0)
      .attr("fill", d => legendColorScale(d));
  }

  // Helpers
  function isInChart(pos) {
    const { x, y } = pos;

    return x > 0
      && x < chartWidth
      && y > 0
      && y < chartHeight;
  }

  function getBucket(pos) {
    const { x, y } = pos;

    const bucketTimestamp = fragment.getBucketTimestamp(moment(xScale.invert(x)).valueOf());
    const xTime = moment.utc(bucketTimestamp);
    const index = fragment.getBucketIndex(xTime, xFrom);

    const target = invertedYScale(y);
    const bucketIndex = _.indexOf(targets, target);

    const bucketX = xScale(xTime.toDate());
    const bucketY = pointHeight * bucketIndex;

    return _.has(data, `data[${index}].buckets[${target}]`)
      ? {
        x: bucketX,
        y: bucketY,
        target: target,
        timestamp: data.data[index].timestamp,
        value: data.data[index].buckets[target],
        hasValue() {
          return this.value !== null;
        },
        equals(bucket) {
          return bucket && bucket.x === this.x && bucket.y === this.y;
        }
      }
      : null;
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
    fragment = getFragment(panel.fragment)

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