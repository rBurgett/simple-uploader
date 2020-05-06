const rmrf = require('rmrf-promise');
const path = require('path');

rmrf(path.resolve(__dirname, '../dist'))
  .then(() => console.log('Build directory cleared.'))
  .catch(console.error);
