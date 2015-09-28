"use babel";

import path from 'path';
import fs from 'fs';

function findRepo(cpath) {
  var lastPath;
  while (cpath && lastPath !== cpath) {

    var rpath = path.join(cpath, '.git');

    if (fs.existsSync(rpath)) { return rpath; }

    lastPath = cpath;
    cpath = path.dirname(cpath);
  }

  return null;
}

export default findRepo;
