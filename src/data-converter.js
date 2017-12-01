import moment from 'moment';

import { aggregate } from './aggregates';
import { getFragment } from './fragments';

const createConverter = (aggregateType, fragmentType) => {

  const prepareData = (from, to, fragment) => {
    const data = {};
    const fromUtc = moment.utc(from).startOf('day');
    const toUtc = moment.utc(to).startOf('day').add(1, 'day');
    // timeUtc = timeUtc.add(1, 'day')
    for (let timeUtc = moment.utc(fromUtc); timeUtc.isBefore(toUtc); timeUtc = fragment.nextTime(timeUtc)) {
      data[timeUtc.valueOf()] = {
        // time: timeUtc.clone(),
        timestamp: timeUtc.valueOf(),
        values: {}
      };
    }
    return {
      data,
      from: fromUtc,
      to: toUtc
    };
  };

  const groupData = (from, to, fragment, dataList) => {
    const container = prepareData(from, to, fragment);
    const targets = _.map(dataList, 'target');
    container.targets = targets;

    dataList.forEach(({ target, datapoints }) => {
      datapoints
        .filter(([value]) => value !== null)
        .forEach(([value, timestamp]) => {
          const bucketTimestamp = fragment.getBucketTimestamp(timestamp);
          if (!(bucketTimestamp in container.data)) { return; }
          if (!(target in container.data[bucketTimestamp].values)) {
            container.data[bucketTimestamp].values[target] = [];
          }
          container.data[bucketTimestamp].values[target].push(value);
        });
    });

    return container;
  };

  const aggregateData = (from, to, fragment, container) => {
    const data = container.data;
    const aggregateFunc = aggregate(aggregateType);
    const result = [];

    const createBucket = (timestamp) => ({
      timestamp,
      buckets: {}
    });

    // let bucket = createBucket(moment(from).startOf('day'));
    let bucket;
    if (data && _.size(data) > 0) {
      const firstTimestamp = _.first(_.values(data))['timestamp'];
      bucket = createBucket(firstTimestamp);
    }

    Object.values(data).forEach(({ timestamp, values }) => {
      if (timestamp < bucket.timestamp) { return; }

      const bucketTimestamp = fragment.getBucketTimestamp(timestamp);
      if (bucket.timestamp != bucketTimestamp) {
        result.push({ ...bucket });
        bucket = createBucket(bucketTimestamp);
      }

      _.forOwn(values, function(arr, target) {
        const value = arr.length > 0
          ? aggregateFunc(arr)
          : null;

        bucket.buckets[target] = value;
      });
    });

    result.push({ ...bucket });

    return result;
  };

  const normalizeData = (data) => {
    return _.map(data, function (obj) {
      const values = _.values(obj.buckets);
      const sum = _.sum(values);
      // const sortedValues = _.sortBy(values);

      obj.buckets = _.mapValues(obj.buckets, value => value/sum
        // function(value) {
        //   const rank = values.length - _.sortedIndexOf(sortedValues, value);
        //   if (rank < 5) {
        //     return value/sum;
        //   } else {
        //     return 0;
        //   }
        // }
      );

      return obj;
    });
  };

  const rankData = (data) => {
    return _.map(data, function (obj) {


      const sortedValues = _.sortBy(_.values(obj.buckets));

      obj.buckets = _.mapValues(obj.buckets, function(value) {
        return _.indexOf(sortedValues, value);
      });

      return obj;
    });
  };

  const convertData = (from, to, dataList, processingMode) => {
    const fragment = getFragment(fragmentType);
    const container = groupData(from, to, fragment, dataList);
    let agg = aggregateData(from, to, fragment, container);
    if (_.eq(processingMode, 'normalize')) { agg = normalizeData(agg); }
    else if (_.eq(processingMode, 'rank')) {agg = rankData(agg);}
    const allValues = _.flatten(_.map(agg, obj => _.values(obj.buckets)));
    const data = {
      data: agg,
      stats: {
        min: _.min(allValues),
        max: _.max(allValues)
      }
    };

    return {
      ...container,
      ...data
    };
  };

  return {
    convertData
  };
};

export default createConverter;