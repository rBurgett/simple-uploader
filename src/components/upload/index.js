import React from 'react';
import PropTypes from 'prop-types';
import { remote } from 'electron';
import fs from 'fs-extra';

const { dialog, getCurrentWindow } = remote;

const UploadView = ({ uploading, uploadingMessage = '', uploadingPercent = 0, uploadFiles }) => {

  const styles = {
    container: {
      position: 'absolute',
      top: 0,
      bottom: 12,
      left: 12,
      right: 12,
      borderStyle: 'dashed',
      borderWidth: 4,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    },
    heading: {
      textAlign: 'center'
    }
  };

  const onClick = async function(e) {
    try {
      e.preventDefault();
      const { canceled, filePaths } = await dialog.showOpenDialog(getCurrentWindow(), {
        title: 'Select File/Folder',
        message: 'Select file(s) to upload.',
        properties: [
          'openFile',
          'openDirectory',
          'multiSelections'
        ]
      });
      if(canceled) return;
      await uploadFiles(filePaths);
    } catch(err) {
      handleError(err);
    }
  };

  return (
    <div style={styles.container}>
      <a href={'#'} onClick={onClick}>
        <h3 style={styles.heading}>{uploading ? uploadingMessage : 'Drop file(s) here'}</h3>
        <h3 style={styles.heading}>{uploading ? parseInt(uploadingPercent, 10) + '%' : 'or click to browse'}</h3>
      </a>
    </div>
  );
};
UploadView.propTypes = {
  uploading: PropTypes.bool,
  uploadingMessage: PropTypes.string,
  uploadingPercent: PropTypes.number,
  uploadFiles: PropTypes.func
};

export default UploadView;
