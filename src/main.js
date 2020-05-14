import React from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer, remote } from 'electron';
import App from './components/app';
import { ipcRendererKeys } from './constants';

const { dialog, getCurrentWindow } = remote;

window.handleError = err => {
  console.error(err);
  dialog.showMessageBox(getCurrentWindow(), {
    type: 'error',
    title: 'Oops!',
    message: err.message
  });
};

const version = ipcRenderer.sendSync(ipcRendererKeys.GET_VERSION);
document.title = document.title + ' - v' + version;

ReactDOM.render(
  <App />,
  document.getElementById('js-main')
);
