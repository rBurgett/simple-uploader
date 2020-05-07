import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { remote } from 'electron';
import { activeViews, localStorageKeys } from '../../constants';

const { dialog, getCurrentWindow } = remote;

const TextInput = ({ label, value, onChange }) => {

  const styles = {
    formGroup: {
      marginBottom: 4
    }
  };

  const onInputChange = e => {
    e.preventDefault();
    onChange(e.target.value);
  };

  return (
    <div className={'form-group'} style={styles.formGroup}>
      <label>{label}</label>
      <input type={'text'} className={'form-control form-control-sm'} value={value} onChange={onInputChange} required={true} />
    </div>
  );
};
TextInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func
};

const SettingsView = ({ region: initialRegion, accessKeyId: initialAccessKeyId, secretAccessKey: initialSecretAccessKey, bucket: initialBucket, saveRegion, saveAccessKeyId, saveSecretAccessKey, saveBucket, setActiveView }) => {

  const [ bucket, setBucket ] = useState(initialBucket);
  const [ region, setRegion ] = useState(initialRegion);
  const [ accessKeyId, setAWSAccessKeyid ] = useState(initialAccessKeyId);
  const [ secretAccessKey, setSecretAccessKey ] = useState(initialSecretAccessKey);

  const styles = {
    container: {
      position: 'absolute',
      top: 0,
      bottom: 12,
      left: 12,
      right: 12
    },
    button: {
      marginTop: 16
    }
  };

  const onSubmit = async function(e) {
    try {
      e.preventDefault();
      saveBucket(bucket);
      saveAccessKeyId(accessKeyId);
      saveSecretAccessKey(secretAccessKey);
      saveRegion(region);
      await dialog.showMessageBox(getCurrentWindow(), {
        type: 'info',
        title: 'Success!',
        message: 'Info successfully saved.',
        buttons: ['OK']
      });
      setActiveView(activeViews.UPLOAD);
    } catch(err) {
      handleError(err);
    }
  };

  return (
    <form style={styles.container} onSubmit={onSubmit}>
      <TextInput label={'S3 Bucket'} value={bucket} onChange={setBucket} />
      <TextInput label={'AWS Access Key ID'} value={accessKeyId} onChange={setAWSAccessKeyid} />
      <TextInput label={'AWS Secret Access Key'} value={secretAccessKey} onChange={setSecretAccessKey} />
      <TextInput label={'AWS Region'} value={region} onChange={setRegion} />
      <button type={'submit'} style={styles.button} className={'btn btn-primary d-block w-100'}>Save Credentials</button>
    </form>
  );
};
SettingsView.propTypes = {
  region: PropTypes.string,
  accessKeyId: PropTypes.string,
  secretAccessKey: PropTypes.string,
  bucket: PropTypes.string,
  saveRegion: PropTypes.func,
  saveAccessKeyId: PropTypes.func,
  saveSecretAccessKey: PropTypes.func,
  saveBucket: PropTypes.func,
  setActiveView: PropTypes.func
};

export default SettingsView;
