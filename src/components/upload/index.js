import React from 'react';
import PropTypes from 'prop-types';
import { remote } from 'electron';

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

  if(uploading) styles.heading.cursor = 'default';

  const onClick = async function(e) {
    try {
      e.preventDefault();
      const darwin = process.platform === 'darwin';
      const { canceled, filePaths } = await dialog.showOpenDialog(getCurrentWindow(), {
        title: darwin ? 'Select File/Folder' : 'Select File(s)',
        message: 'Select file(s) to upload.',
        properties: darwin ?
          [
            'openDirectory',
            'openFile',
            'multiSelections'
          ]
          :
          [
            'openFile',
            'multiSelections'
          ]
      });
      if(canceled) return;
      uploadFiles(filePaths);
    } catch(err) {
      handleError(err);
    }
  };

  return (
    <div style={styles.container}>
      {uploading ?
        <div>
          <h3 style={styles.heading}>{uploadingMessage}</h3>
          <h3 style={styles.heading}>{uploadingPercent ? parseInt(uploadingPercent, 10) + '%' : ''}</h3>
        </div>
        :
        <a href={'#'} onClick={onClick}>
          <h3 style={styles.heading}>{'Drop file(s) here'}</h3>
          <h3 style={styles.heading}>{'or click to browse'}</h3>
        </a>
      }
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
