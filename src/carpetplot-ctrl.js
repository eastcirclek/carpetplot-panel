import { MetricsPanelCtrl } from 'app/plugins/sdk';
import _ from 'lodash';
import { contextSrv } from 'app/core/core';
import kbn from 'app/core/utils/kbn';

import createConverter from './data-converter';
import aggregates, { aggregatesMap } from './aggregates';
import fragments, { fragmentsMap } from './fragments';
import canvasRendering from './canvas/rendering';
import { carpetplotOptionsEditor } from './options-editor';
import './css/carpet-plot.css!';

const panelDefaults = {
  aggregate: aggregates.AVG,
  fragment: fragments.TWENTYFOUR,
  color: {
    colorScheme: 'interpolateRdYlGn',
    nullColor: 'transparent'
  },
  scale: {
    min: null,
    max: null
  },
  xAxis: {
    show: true,
    showCrosshair: true
  },
  yAxis: {
    show: true,
    showCrosshair: false
  },
  tooltip: {
    show: true
  },
  legend: {
    show: true
  },
  data: {
    decimals: null,
    processing: 'none',
    percentage: false
  },
  template: {
    update: false
  }
};

const colorSchemes = [
  // Diverging
  { name: 'Spectral', value: 'interpolateSpectral', invert: 'always' },
  { name: 'RdYlGn', value: 'interpolateRdYlGn', invert: 'always' },

  // Sequential (Single Hue)
  { name: 'Blues', value: 'interpolateBlues', invert: 'dark' },
  { name: 'Greens', value: 'interpolateGreens', invert: 'dark' },
  { name: 'Greys', value: 'interpolateGreys', invert: 'dark' },
  { name: 'Oranges', value: 'interpolateOranges', invert: 'dark' },
  { name: 'Purples', value: 'interpolatePurples', invert: 'dark' },
  { name: 'Reds', value: 'interpolateReds', invert: 'dark' },

  // Sequential (Multi-Hue)
  { name: 'BuGn', value: 'interpolateBuGn', invert: 'dark' },
  { name: 'BuPu', value: 'interpolateBuPu', invert: 'dark' },
  { name: 'GnBu', value: 'interpolateGnBu', invert: 'dark' },
  { name: 'OrRd', value: 'interpolateOrRd', invert: 'dark' },
  { name: 'PuBuGn', value: 'interpolatePuBuGn', invert: 'dark' },
  { name: 'PuBu', value: 'interpolatePuBu', invert: 'dark' },
  { name: 'PuRd', value: 'interpolatePuRd', invert: 'dark' },
  { name: 'RdPu', value: 'interpolateRdPu', invert: 'dark' },
  { name: 'YlGnBu', value: 'interpolateYlGnBu', invert: 'dark' },
  { name: 'YlGn', value: 'interpolateYlGn', invert: 'dark' },
  { name: 'YlOrBr', value: 'interpolateYlOrBr', invert: 'dark' },
  { name: 'YlOrRd', value: 'interpolateYlOrRd', invert: 'darm' }
];

export class CarpetPlotCtrl extends MetricsPanelCtrl {
  static templateUrl = 'module.html';

  constructor($scope, $injector, $rootScope, timeSrv, variableSrv) {
    super($scope, $injector);

    this.dataList = null;
    this.data = {};
    this.timeSrv = timeSrv;
    this.variableSrv = variableSrv;
    this.variableNames = _.map(variableSrv.variables, 'name');
    this.colorSchemes = colorSchemes;
    this.fragmentOptions = fragmentsMap;
    this.aggregateOptions = aggregatesMap;
    this.theme = contextSrv.user.lightTheme ? 'light' : 'dark';

    _.defaultsDeep(this.panel, panelDefaults);

    this.events.on('data-received', this.onDataReceived);
    this.events.on('data-snapshot-load', this.onDataReceived);
    this.events.on('init-edit-mode', this.onInitEditMode);
    this.events.on('render', this.onRender);
  }

  onDataReceived = (dataList) => {
    this.dataList = dataList;
    this.data = this.transformData(dataList);
    this.render();
  }

  onInitEditMode = () => {
    this.addEditorTab('Options', carpetplotOptionsEditor, 2);
    this.unitFormats = kbn.getUnitFormats();
  }

  onRender = () => {
    if (!this.dataList) { return; }
    this.data = this.transformData(this.dataList);
  }

  transformData(data) {
    const converter = createConverter(this.panel.aggregate, this.panel.fragment);
    const { from, to } = this.range || this.timeSrv.timeRange();
    return converter.convertData(from, to, data, this.panel.data.processing);
  }

  link(scope, elem, attrs, ctrl) {
    canvasRendering(scope, elem, attrs, ctrl);
  }
}