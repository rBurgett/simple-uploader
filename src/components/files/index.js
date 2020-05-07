import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { clipboard, remote } from 'electron';
import s3 from 's3';
import UploadType from '../../types/upload';
import CopyIcon from '../shared/copy-icon';
import RemoveIcon from '../shared/remove-icon';
import { getDownloadLink } from '../../util';

const { dialog, getCurrentWindow } = remote;

const FilesView = ({ region, accessKeyId, secretAccessKey, bucket, uploads, saveUploads }) => {

  const styles = {
    container: {
      position: 'absolute',
      top: 0,
      bottom: 12,
      left: 12,
      right: 12,
      overflowY: 'auto',
      overflowX: 'hidden'
    },
    tableContainer: {
      maxWidth: '100%'
    },
    table: {
      tableLayout: 'fixed',
      width: '100%',
      marginBottom: 0
    },
    dateColumnHeading: {
      minWidth: 84,
      width: 84
    },
    linkColumnHeading: {
      minWidth: 40,
      width: 40
    },
    deleteColumnHeading: {
      minWidth: 55,
      width: 55
    },
    dateColumn: {
      fontFamily: 'monospace'
    },
    keyColumn: {
      wordWrap: 'break-word'
    },
    icon: {
      width: 16,
      height: 'auto'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.tableContainer}>
        <table style={styles.table} className={'table table-bordered table-sm'}>
          <thead>
          <tr>
            <th style={styles.dateColumnHeading}>Date</th>
            <th>Name</th>
            <th style={styles.linkColumnHeading}>Link</th>
            <th style={styles.deleteColumnHeading}>Delete</th>
          </tr>
          </thead>
          <tbody>
          {[...uploads]
            .sort((a, b) => a.date === b.date ? 0 : a.date > b.date ? -1 : 1)
            .map(({ key, date }) => {

              const formattedDate = moment(new Date(date))
                .format('YYYY-MM-DD');

              const onCopy = e => {
                e.preventDefault();
                clipboard.writeText(getDownloadLink(bucket, key));
              };

              const onDelete = async function(e) {
                try {
                  e.preventDefault();
                  const { response } = await dialog.showMessageBox(getCurrentWindow(), {
                    title: 'Confirm',
                    message: `Are you sure that you want to delete ${key}?`,
                    type: 'warning',
                    defaultId: 1,
                    buttons: [
                      'Cancel',
                      'OK'
                    ]
                  });
                  if(!response) return;
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
                    const s3Params = {
                      Bucket: bucket,
                      Delete: {
                        Objects: [{Key: key}]
                      }
                    };
                    client.s3.deleteObjects(s3Params, err => {
                      if(err) reject(err);
                      else resolve();
                    });
                  });
                  const newUploads = uploads
                    .filter(u => u.key !== key);
                  saveUploads(newUploads);
                } catch(err) {
                  handleError(err);
                }
              };

              return (
                <tr key={date + key}>
                  <td className={'text-center'} style={styles.dateColumn}>{formattedDate}</td>
                  <td style={styles.keyColumn} className={''}>{key}</td>
                  <td className={'text-center'}><a href={'#'} onClick={onCopy} title={'Copy download link to clipboard'}><CopyIcon style={styles.icon} /></a></td>
                  <td className={'text-center'}><a href={'#'} className={'text-danger'} onClick={onDelete} title={'Delete file from bucket'}><RemoveIcon style={styles.icon} /></a></td>
                </tr>
              );
            })
          }
          </tbody>
        </table>
      </div>
    </div>
  );
};
FilesView.propTypes = {
  region: PropTypes.string,
  accessKeyId: PropTypes.string,
  secretAccessKey: PropTypes.string,
  bucket: PropTypes.string,
  uploads: PropTypes.arrayOf(PropTypes.instanceOf(UploadType)),
  saveUploads: PropTypes.func
};

export default FilesView;
