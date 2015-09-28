import blame from './utils/blame';
import getCommit from './utils/get-commit';
import getCommitLink from './utils/get-commit-link';
import gravatar from 'gravatar';
import open from 'open';
import { CompositeDisposable } from 'atom';

class BlameGutterView {

  constructor(state, editor) {

    this.state = state || {};
    this.editor = editor;

    this.state.width = atom.config.get('blame.defaultWidth');
    this.setGutterWidth(this.state.width);

    this.colors = {};
    this.gutter = this.editor.addGutter({ name: 'blame' });
    this.markers = [];

    this.setVisible(true);
  }

  toggleVisible() {
    this.setVisible(!this.visible);
  }

  setVisible(visible) {
    this.visible = visible;
    if (this.editor.isModified()) {
      this.visible = false;
    }

    if (this.visible) {
      this.update();

      if (!this.disposables) {
        this.disposables = new CompositeDisposable();
      }
      this.disposables.add(this.editor.onDidSave(() => this.update()));

      this.gutter.show();

    } else {
      this.gutter.hide();

      if (this.disposables) {
        this.disposables.dispose();
      }
      this.disposables = null;

      this.removeAllMarkers();
    }
  }

  update() {

    blame(this.editor.getPath(), (result) => {
      this.removeAllMarkers();

      blameLines = [];
      lastHash = null;

      commitCount = 0;
      commitColor = null;

      Object.keys(result).forEach(key => {
        const line = result[key];

        let idx = Number(key) - 1;
        let hash = line.rev.replace(/\s.*/, '');
        let lineStr= '';

        if (lastHash !== hash) {
          dateStr = this.formateDate(line.date);

          if (this.isCommited(hash)) {
            lineStr = "#{hash} #{dateStr} #{line.author}";
          } else {
            lineStr = "#{line.author}";
          }

          if (commitCount++ % 2 === 0) {
            rowCls = 'blame-even';
          } else {
            rowCls = 'blame-odd';
          }
        }

        lastHash = hash;

        this.addMarker(idx, hash, rowCls, lineStr);
      });
    });
  }

  linkClicked(hash) {
    hash = hash.replace(/^[\^]/, '');
    getCommitLink(this.editor.getPath(), hash, (link) => {
      if (link) {
        open(link);
      } else {
        atom.notifications.addInfo("Unknown url.");
      }
    });
  }

  copyClicked(event) {
    let hash = event.path[0].getAttribute('data-hash');
    atom.clipboard.write(hash);
  }

  formateDate(date) {
    date = new Date(date);
    yyyy = date.getFullYear();
    mm = date.getMonth() + 1;
    if (mm < 10) { mm = "0#{mm}"; }
    dd = date.getDate();
    if (dd < 10) { dd = "0#{dd}"; }

    return "#{yyyy}-#{mm}-#{dd}";
  }

  addMarker(lineNo, hash, rowCls, lineStr) {
    item = this.markerInnerDiv(rowCls);

    // no need to create objects and events on blank lines
    if (lineStr.length > 0) {
      if (this.isCommited(hash)) {
        item.appendChild(this.copySpan(hash));
        item.appendChild(this.linkSpan(hash));
      }
      item.appendChild(this.lineSpan(lineStr, hash));

      if (this.isCommited(hash)) {
        item.addEventListener('mouseenter', () => this.showCommit(item, hash));
      }
    }

    item.appendChild(this.resizeHandleDiv());

    marker = this.editor.markBufferRange([[lineNo, 0], [lineNo, 0]]);
    this.editor.decorateMarker(marker, {
      type: 'gutter',
      gutterName: 'blame',
      class: 'blame-gutter',
      item: item
    });
    this.markers.push(marker);
  }

  markerInnerDiv(rowCls) {
    item = document.createElement('div');
    item.classList.add('blame-gutter-inner');
    item.classList.add(rowCls);
    return item;
  }

  resizeHandleDiv() {
    resizeHandle = document.createElement('div');
    resizeHandle.addEventListener('mousedown', e => this.resizeStarted(e));
    resizeHandle.classList.add('blame-gutter-handle');
    return resizeHandle;
  }

  lineSpan(str, hash) {
    span = document.createElement('span');
    span.innerHTML = str;
    return span;
  }

  copySpan(hash) {
    span = document.createElement('span');
    span.setAttribute('data-hash', hash);
    span.classList.add('icon');
    span.classList.add('icon-copy');
    span.addEventListener('click', e => this.copyClicked(e));
    return span;
  }

  linkSpan(hash) {
    span = document.createElement('span');
    span.setAttribute('data-hash', hash);
    span.classList.add('icon');
    span.classList.add('icon-link');
    span.addEventListener('click', () => this.linkClicked(hash));
    return span;
  }

  removeAllMarkers() {
    this.markers.forEach(marker => marker.destroy());
    this.markers = [];
  }

  resizeStarted(e) {
    document.addEventListener('mousemove', e => this.resizeMove(e));
    document.addEventListener('mouseup', e => this.resizeStopped(e));
    this.resizeStartedAtX = e.pageX;
    this.resizeWidth = this.state.width;
  }

  resizeStopped(e) {
    document.removeEventListener('mousemove', e => this.resizeMove(e));
    document.removeEventListener('mouseup', e => this.resizeStopped(e));

    e.stopPropagation();
    e.preventDefault();
  }

  gutterStyle() {
    sheet = document.createElement('style');
    sheet.type = 'text/css';
    sheet.id = 'blame-gutter-style';
    return sheet;
  }

  resizeMove(e) {
    const diff = e.pageX - this.resizeStartedAtX;
    this.setGutterWidth(this.resizeWidth + diff);

    e.stopPropagation();
    e.preventDefault();
  }

  setGutterWidth(width) {
    this.state.width = Math.max(50, Math.min(width, 500));

    sheet = document.getElementById('blame-gutter-style');
    if (!sheet) {
      sheet = this.gutterStyle();
      document.head.appendChild(sheet);
    }

    sheet.innerHTML = `
      atom-text-editor::shadow .gutter[gutter-name="blame"] {
        width: ${this.state.width}px;
      }
    `;
  }

  isCommited(hash) {
    return !/^[0]+$/.test(hash);
  }

  showCommit: (item, hash) ->

    if !item.getAttribute('data-has-tooltip')
      item.setAttribute('data-has-tooltip', true)

      msgItem = document.createElement('div')
      msgItem.classList.add 'blame-tooltip'

      this.disposables.add atom.tooltips.add item, title: msgItem

      getCommit this.editor.getPath(), hash.replace(/^[\^]/, ''), (msg) ->
        avatar = gravatar.url(msg.email, { s: 80 })
        msgItem.innerHTML = `
          <div class="head">
            <img class="avatar" src="http:${avatar}"/>
            <div class="subject">${msg.subject}</div>
            <div class="author">${msg.author}</div>
          </div>
          <div class="body">${msg.message}</div>
        `

  dispose() {
    this.gutter.destroy();
    if(this.disposables) { this.disposables.dispose(); }
  }
}

export default BlameGutterView
