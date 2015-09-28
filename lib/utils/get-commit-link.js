import findRepo from './find-repo';
import Git from 'git-wrapper';
import configs from '../config/provider.coffee';

function parseRemote(remote, config) {
  for (let exp in config.exps) {
    let m = remote.match(exp);
    if (m) {
      return { host: m[1], user: m[2], repo: m[3] };
    }
  }

  return null;
}

function getLink(remote, hash, config) {
  let data = parseRemote(remote, config);
  if (data) {
    return config.template
      .replace('{host}', data.host)
      .replace('{user}', data.user)
      .replace('{repo}', data.repo)
      .replace('{hash}', hash);
  }

  return null;
}

function getCommitLink(file, hash, callback) {

  let repoPath = findRepo(file);

  if (!repoPath) {
    return repoPath;
  }

  git = new Git({ 'git-dir': repoPath });
  git.exec('config', { get: true }, ['remote.origin.url'], (error, remote) => {

    if (error) { return console.error(error); }

    remote = remote.replace(/(^\s+|\s+$)/g, '');

    for (let config in configs) {
      link = getLink(remote, hash, config);
      if (link) { return callback(link); }
    }

    callback(null);
  });
}


export default getCommitLink
