import moment from 'moment';

const TWENTYFOUR = 'TWENTYFOUR';
const TWELVE = 'TWELVE';
const SIX = 'SIX';

const fragments = {
  [TWENTYFOUR]: {
    // getBucketIndex: (time) => time.hour() * 60 + time.minute(),
    // getTime: (time, bucketIndex) => moment(time).startOf('day').add(bucketIndex, 'minute'),
    getBucketIndex: (time, from) => time.diff(from, 'hours')/24,
    getBucketTimestamp: (timestamp) => moment.utc(timestamp).startOf('day').valueOf(),
    nextTime: (time) => moment.utc(time).add(24, 'hour')
  },
  [TWELVE]: {
    // getBucketIndex: (time) => time.hour() * 4 + Math.floor(time.minute() / 15),
    // getTime: (time, bucketIndex) => moment(time).startOf('day').add(15 * bucketIndex, 'minute'),
    getBucketIndex: (time, from) => time.diff(from, 'hours')/12,
    getBucketTimestamp: (timestamp) => {
      const timeUtc = moment.utc(timestamp);
      const hours = Math.floor(timeUtc.hour() / 12) * 12;
      return timeUtc.startOf('day').add(hours, 'hour').valueOf();
    },
    nextTime: (time) => moment.utc(time).add(12, 'hour')
  },
  [SIX]: {
    // getBucketIndex: (time) => time.hour(),
    // getTime: (time, bucketIndex) => moment(time).startOf('day').add(bucketIndex, 'hour'),
    getBucketIndex: (time, from) => time.diff(from, 'hours')/6,
    getBucketTimestamp: (timestamp) => {
      const timeUtc = moment.utc(timestamp);
      const hours = Math.floor(timeUtc.hour() / 6) * 6;
      return timeUtc.startOf('day').add(hours, 'hour').valueOf();
    },
    nextTime: (time) => moment.utc(time).add(6, 'hour')
  }
};

export const fragmentsMap = [
  { name: 'Day', value: TWENTYFOUR},
  { name: '12 hours', value: TWELVE },
  { name: '6 hours', value: SIX}
];

export const getFragment = (fragmentType) => fragments[fragmentType];

export default {
  TWENTYFOUR,
  TWELVE,
  SIX
};