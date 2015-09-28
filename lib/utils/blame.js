"use babel";

import Blamer from 'blamer';

var blamer = new Blamer('git');

function blame(file, callback) {
  return blamer.blameByFile(file).then(
    result => callback(result[file]),
    error => callback(null)
  );
}

export default blame;
