import React from 'react';
import ReactDOM from 'react-dom';
import { remote } from 'electron';
import App from './components/app';

const { dialog, getCurrentWindow } = remote;

window.handleError = err => {
  console.error(err);
  dialog.showMessageBox(getCurrentWindow(), {
    type: 'error',
    title: 'Oops!',
    message: err.message
  });
};

ReactDOM.render(
  <App />,
  document.getElementById('js-main')
);
