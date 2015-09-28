import { CompositeDisposable } from 'atom';
import BlameGutterView from './blame-gutter-view';

module.exports = {

  gitBlameMeView: null,

  modalPanel: null,

  subscriptions: null,

  config: {
    defaultWidth: {
      title: 'Default width (px)',
      type: 'integer',
      default: 250,
      minimum: 50,
      maximum: 500
    },
  },

  activate(state = {}) {

    this.state = state;
    this.gutters = new Map();
    this.disposables = new CompositeDisposable();

    return this.disposables.add(atom.commands.add('atom-workspace', {
      'blame:toggle': () => this.toggleBlameGutter()
    }));
  },

  toggleBlameGutter() {

    var editor = atom.workspace.getActiveTextEditor();
    if (!editor) { return; }

    var gutter = this.gutters.get(editor);

    if (gutter) { return gutter.toggleVisible(); }

    gutter = new BlameGutterView(this.state, editor);
    this.disposables.add(gutter);
    this.gutters.set(editor, gutter);
  },

  deactivate() {
    this.disposables.dispose();
  },

  serialize() {
    return this.state;
  }
};
