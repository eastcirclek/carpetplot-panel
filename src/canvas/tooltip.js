import d3 from 'd3';
import $ from 'jquery';
import moment from 'moment';

let TOOLTIP_PADDING_X = 30;
let TOOLTIP_PADDING_Y = 5;

class CarpetplotTooltip {

  constructor(elem, scope, ctrl) {
    this.tooltip = null;
    this.scope = scope;
    this.dashboard = scope.ctrl.dashboard;
    this.panel = scope.ctrl.panel;
    this.ctrl = ctrl;

    elem.on('mouseover', this.onMouseOver.bind(this));
    elem.on('mouseleave', this.onMouseLeave.bind(this));
  }

  onMouseOver(e) {
    if (!this.panel.tooltip.show || !this.scope.hasData()) { return; }

    if (!this.tooltip) {
      this.move(e);
    }
  }

  onMouseLeave() {
    this.destroy();
  }

  onMouseMove(e) {
    if (!this.panel.tooltip.show) { return; }

    if (!this.tooltip) {
      this.move(e);
    }
  }

  add() {
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'carpet-tooltip graph-tooltip grafana-tooltip');
  }

  destroy() {
    if (this.tooltip) {
      this.tooltip.remove();
    }

    this.tooltip = null;
  }

  show(pos, bucket) {
    if (!bucket || !this.panel.tooltip.show || !this.scope.isInChart(pos) || !bucket.hasValue()) {
      this.destroy();
      return;
    }

    if (!this.tooltip) {
      this.add();
    }

    const tooltipTimeFormat = 'YY-MM-DD HH:mm';
    const time = this.dashboard.formatDate(bucket.timestamp, tooltipTimeFormat);
    let value = bucket.value;

    const decimals = this.panel.data.decimals;
    if (decimals) {
      value = _.round(value, _.isInteger(value) ? 0 : (decimals || 5));
    }

    if (this.ctrl.panel.data.percentage === true) {
      value = parseFloat(_.multiply(value, 100).toFixed(decimals)) + '%';
    }
    const target = bucket.target;

    let tooltipHtml = `
      <div class='graph-tooltip-time'>${time}</div>
      <div align='center'>
      <b>${target}</b><br/>${value}<br/>
      </div>
    `;

    this.tooltip.html(tooltipHtml);

    this.move(pos);
  }

  move(pos) {
    if (!this.tooltip) { return; }

    const elem = $(this.tooltip.node())[0];
    const { pageX, pageY } = pos;
    const tooltipWidth = elem.clientWidth;
    const tooltipHeight = elem.clientHeight;

    let left = pageX + TOOLTIP_PADDING_X;
    let top = pageY + TOOLTIP_PADDING_Y;

    if (pageX + tooltipWidth + 40 > window.innerWidth) {
      left = pageX - tooltipWidth - TOOLTIP_PADDING_X;
    }

    if (pageY - window.pageYOffset + tooltipHeight + 20 > window.innerHeight) {
      top = pageY - tooltipHeight - TOOLTIP_PADDING_Y;
    }

    return this.tooltip
      .style('left', left + 'px')
      .style('top', top + 'px');
  }
}

export default CarpetplotTooltip;