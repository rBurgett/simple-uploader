import React, { useEffect, useState } from 'react';
import Header from './shared/header';
import { activeViews, localStorageKeys } from '../constants';
import UploadView from './upload';
import FilesView from './files';
import SettingsView from './settings';
import UploadType from '../types/upload';
import fs from 'fs-extra';
import path from 'path';
import s3 from 's3';
import uuid from 'uuid';
import { clipboard, remote } from 'electron';
import archiver from 'archiver';
import { getDownloadLink } from '../util';

// const getRandom = len => {
//   let rand = '';
//   while(rand.length < len) {
//     rand += uuid.v4().replace(/-/g, '');
//   }
//   return rand.slice(0, len);
// };

const { dialog, getCurrentWindow } = remote;
const tempDir = remote.app.getPath('temp');

const zipFiles = filePaths => new Promise((resolve, reject) => {
  const outputPath = path.join(tempDir, `archive-${new Date().getTime()}.zip`);
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });
  output.on('close', function() {
    resolve(outputPath);
  });
  archive.on('error', function(err) {
    reject(err);
  });
  archive.pipe(output);
  for(const filePath of filePaths) {
    archive.file(filePath, { name: path.basename(filePath) });
  }
  archive.finalize();
});

const zipDirectory = origFilePath => new Promise((resolve, reject) => {
  const basename = path.basename(origFilePath);
  const outputPath = path.join(tempDir, basename + '.zip');
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });
  output.on('close', function() {
    resolve(outputPath);
  });
  archive.on('error', function(err) {
    reject(err);
  });
  archive.pipe(output);
  archive.directory(origFilePath, basename);
  archive.finalize();
});

const prepFilename = filePath => {
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext)
    .replace(/[^\w\s-.]/g, '')
    .replace(/\s+/g, '-');
  return base + ext;
};

const uploadsJSON = localStorage.getItem(localStorageKeys.UPLOADS);
const initialUploads = (uploadsJSON ? JSON.parse(uploadsJSON) : [])
  .map(u => new UploadType(u));

const App = () => {

  const [ uploading, setUploading ] = useState(false);
  const [ uploadingMessage, setUploadingMessage ] = useState('');
  const [ uploadingPercent, setUploadingPercent ] = useState(0);
  const [ hovering, setHovering ] = useState(false);
  const [ bucket, setBucket ] = useState(localStorage.getItem(localStorageKeys.S3_BUCKET) || '');
  const [ region, setRegion ] = useState(localStorage.getItem(localStorageKeys.AWS_REGION) || 'us-east-1');
  const [ accessKeyId, setAccessKeyId ] = useState(localStorage.getItem(localStorageKeys.AWS_ACCESS_KEY_ID) || '');
  const [ secretAccessKey, setSecretAccessKey ] = useState(localStorage.getItem(localStorageKeys.AWS_SECRET_ACCESS_KEY) || '');
  const [ uploads, setUploads ] = useState(initialUploads);
  const [ windowSize, setWindowSize ] = useState({width: window.innerWidth, height: window.innerHeight});

  const credentialsReady = bucket && region && accessKeyId && secretAccessKey;
  const [ activeView, setActiveView ] = useState(credentialsReady ? activeViews.UPLOAD : activeViews.SETTINGS);

  useEffect(() => {
    window.addEventListener('resize', e => {
      const { innerWidth, innerHeight } = e.target;
      setWindowSize({
        width: innerWidth,
        height: innerHeight
      });
    });
  }, []);

  const styles = {
    container: {
      opacity: hovering ? .6 : 1,
      width: windowSize.width,
      height: windowSize.height,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start'
    },
    headerContainer: {
    },
    bodyContainer: {
      flexGrow: 1,
      position: 'relative'
    }
  };

  const saveBucket = val => {
    localStorage.setItem(localStorageKeys.S3_BUCKET, val);
    setBucket(val);
  };
  const saveRegion = val => {
    localStorage.setItem(localStorageKeys.AWS_REGION, val);
    setRegion(val);
  };
  const saveAccessKeyId = val => {
    localStorage.setItem(localStorageKeys.AWS_ACCESS_KEY_ID, val);
    setAccessKeyId(val);
  };
  const saveSecretAccessKey = val => {
    localStorage.setItem(localStorageKeys.AWS_SECRET_ACCESS_KEY, val);
    setSecretAccessKey(val);
  };
  const saveUploads = val => {
    localStorage.setItem(localStorageKeys.UPLOADS, JSON.stringify(val));
    setUploads(val);
  };

  const uploadFiles = async function(filePaths) {
    try {
      const stats = await fs.stat(filePaths[0]);
      const isDirectory = stats.isDirectory();
      let filePath;
      if(filePaths.length === 1 && !isDirectory) {
        filePath = filePaths[0];
        const { response } = await dialog.showMessageBox(getCurrentWindow(), {
          type: 'warning',
          title: 'Confirm Upload',
          message: `Are you sure that you want to upload ${path.basename(filePath)}?`,
          defaultId: 1,
          buttons: [
            'Cancel',
            'OK'
          ]
        });
        if(!response) return;
      } else if(filePaths.length === 1 && isDirectory) {
        const { response } = await dialog.showMessageBox(getCurrentWindow(), {
          type: 'warning',
          title: 'Confirm Upload',
          message: `Would you like to zip and upload the folder ${path.basename(filePaths[0])}?`,
          defaultId: 1,
          buttons: [
            'Cancel',
            'OK'
          ]
        });
        if(!response) return;
        setUploadingMessage('Compressing...');
        setUploading(true);
        filePath = await zipDirectory(filePaths[0]);
      } else {
        const { response } = await dialog.showMessageBox(getCurrentWindow(), {
          type: 'warning',
          title: 'Confirm Upload',
          message: `Would you like to zip and upload these ${filePaths.length} files?`,
          defaultId: 1,
          buttons: [
            'Cancel',
            'OK'
          ]
        });
        if(!response) return;
        setUploadingMessage('Compressing...');
        setUploading(true);
        filePath = await zipFiles(filePaths);
      }
      const preppedFilename = prepFilename(filePath);
      const key = uuid.v4() + '/' + preppedFilename;
      setUploadingMessage('Uploading');
      setUploading(true);
      await new Promise((resolve, reject) => {
        const client = s3.createClient({
          multipartUploadThreshhold: 1000000000,
          multipartUploadSize: 1000000000,
          s3Options: {
            region,
            accessKeyId,
            secretAccessKey
          }
        });
        const params = {
          localFile: filePath,
          s3Params: {
            Bucket: bucket,
            Key: key,
            ACL: 'public-read'
          }
        };
        const uploader = client.uploadFile(params);
        uploader.on('error', function(err) {
          reject(err);
        });
        uploader.on('progress', function() {
          const percentage = (uploader.progressAmount / uploader.progressTotal) * 100;
          setUploadingPercent(percentage);
        });
        uploader.on('end', function() {
          resolve();
        });
      });
      const downloadLink = getDownloadLink(bucket, key);
      clipboard.writeText(downloadLink);
      const newUploads = [
        ...uploads,
        new UploadType({
          key,
          date: new Date().getTime()
        })
      ];
      saveUploads(newUploads);
      await dialog.showMessageBox(getCurrentWindow(), {
        type: 'info',
        title: 'Success!',
        message: `Download link for ${preppedFilename} copied to clipboard.`,
        // message: `${downloadLink} copied to clipboard.`,
        buttons: ['OK']
      });
      setUploading(false);
      setUploadingMessage('');
      setUploadingPercent(0);
    } catch(err) {
      handleError(err);
      setUploading(false);
      setUploadingMessage('');
      setUploadingPercent(0);
    }
  };

  const onDragOver = e => {
    e.preventDefault();
  };
  const onDragEnter = () => {
    if(!uploading) setHovering(true);
  };
  const onMouseOut = () => {
    if(!uploading) setHovering(false);
  };
  const onDrop = e => {
    try {
      e.preventDefault();
      if(uploading) return;
      setHovering(false);
      const files = [...e.dataTransfer.files];
      if(files.length === 0) return;
      uploadFiles(files.map(f => f.path));
    } catch(err) {
      handleError(err);
    }
  };

  return (
    <div style={styles.container} onDragOver={onDragOver} onDragEnter={onDragEnter} onDrop={onDrop} onMouseOut={onMouseOut}>
      <div style={styles.headerContainer}>
        <Header activeView={activeView} setActiveView={setActiveView} disabled={!credentialsReady} />
      </div>
      <div style={styles.bodyContainer}>
        {activeView === activeViews.UPLOAD ?
          <UploadView
            uploading={uploading}
            uploadingMessage={uploadingMessage}
            uploadingPercent={uploadingPercent}
            uploadFiles={uploadFiles} />
          :
          activeView === activeViews.FILES ?
            <FilesView
              region={region}
              accessKeyId={accessKeyId}
              secretAccessKey={secretAccessKey}
              bucket={bucket}
              uploads={uploads}
              saveUploads={saveUploads} />
            :
            <SettingsView
              region={region}
              accessKeyId={accessKeyId}
              secretAccessKey={secretAccessKey}
              bucket={bucket}
              saveRegion={saveRegion}
              saveAccessKeyId={saveAccessKeyId}
              saveSecretAccessKey={saveSecretAccessKey}
              saveBucket={saveBucket}
              setActiveView={setActiveView} />
        }
      </div>
    </div>
  );
};

export default App;
