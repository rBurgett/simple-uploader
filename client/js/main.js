const $ = require('jquery');
const { clipboard, ipcRenderer } = require('electron');
const moment = require('moment');
const path = require('path');
const s3 = require('s3');
const swal = require('sweetalert2');
const uuid = require('uuid');

const getRandom = len => {
  let rand = '';
  while(rand.length < len) {
    rand += uuid.v4().replace(/-/g, '');
  }
  return rand.slice(0, len);
};

let bucket = localStorage.getItem('bucket') || '';
let accessKeyId = localStorage.getItem('accessKeyId') || '';
let secretAccessKey = localStorage.getItem('secretAccessKey') || '';
let showAllUploads = false;

const getUploads = () => {
  let uploads;
  try {
    const uploadsStr = localStorage.getItem('uploads') || '[]';
    uploads = JSON.parse(uploadsStr);
  } catch(err) {
    console.error(err);
    uploads = [];
  }
  return uploads;
};
const saveUploads = (uploads = []) => {
  localStorage.setItem('uploads', JSON.stringify(uploads));
};
const getDownloadLink = key => `https://s3.amazonaws.com/${bucket}/${encodeURI(key)}`;

const renderUploads = () => {

  const allUploads = getUploads().reverse();
  const uploads = showAllUploads ? allUploads : allUploads.slice(0, 5);

  const tableItems = uploads
    .map(({ key, date }) => {
      const encodedKey = encodeURI(key);
      return `<tr data-key="${encodedKey}">
        <td style="font-size:14px;">${moment(new Date(date)).format('YYYY/MM/DD')}</td>
        <td style="font-size:14px;">${key}</td>
        <td style="text-align:center;"><a class="js-copyBtn copy-link" href="${getDownloadLink(key)}" data-key="${encodedKey}"><i class="fa fa-clipboard"></i></a></td>
        <td style="text-align:center;"><a class="js-deleteBtn delete" href="#" data-key="${encodedKey}"><i class="fa fa-times"></i></a></td>
      </tr>`;
    });

  $('#js-main').html(`
  <div style="padding:10px;">
    ${headerHTML({ title: 'Uploads' })}
  </div>
  <div style="margin-left:10px;margin-right:10px;margin-bottom:10px;">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Link</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          ${tableItems.join('\n')}
        </tbody>
      </table>
    ${(allUploads.length < 6 || (allUploads.length > 5 && showAllUploads)) ? '' : '<button id="js-showAll" style="margin-top:10px;" type="button">Show More</buttoni>'}
  </div>
  `);
  setTimeout(() => {
    attachHeaderEvents();
    $('#js-showAll')
      .off('click')
      .on('click', e => {
        e.preventDefault();
        showAllUploads = true;
        renderUploads();
      });
  }, 100);
  $('.js-copyBtn')
    .off('click')
    .on('click', e => {
      e.preventDefault();
      const key = decodeURI($(e.currentTarget).attr('data-key'));
      const downloadLink = getDownloadLink(key);
      clipboard.writeText(downloadLink);
      swal({
        text: `${downloadLink} copied to clipboard.`
      });
    });
  $('.js-deleteBtn')
    .off('click')
    .on('click', async function(e) {
      e.preventDefault();
      const encodedKey = $(e.currentTarget).attr('data-key');
      const key = decodeURI(encodedKey);

      const { value: confirmed } = await swal({
        type: 'warning',
        text: `Are you sure that you want to delete ${key}?`,
        showCancelButton: true
      });
      if(!confirmed) return;

      const client = s3.createClient({
        multipartUploadThreshhold: 1000000000,
        multipartUploadSize: 1000000000,
        s3Options: {
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
      console.log(s3Params);
      client.s3.deleteObjects(s3Params, err => {
        if(err) {
          console.error(err);
          swal({
            title: 'Oops',
            text: err.message,
            type: 'error'
          })
            .then(() => {
              swal.close();
              renderSettings();
            })
            .catch(console.error);
          return;
        }
        // swal({
        //   text: `${key} successfuly deleted.`,
        //   type: 'success'
        // });
        const newUploads = getUploads()
          .filter(u => u.key !== key);
        saveUploads(newUploads);
        if(showAllUploads) {
          [...$('tr')]
            .map(tr => {
              return $(tr);
            })
            .filter($t => {
              return $t.attr('data-key') === encodedKey;
            })
            .map($t => {
              $t.remove();
            });
        } else {
          renderUploads();
        }
      });
    });
};

const renderSettings = () => {
  $('#js-main').html(`
  <div style="padding:10px;">
    ${headerHTML({ title: 'Settings' })}
    <form>
      <h3 style="text-align:left;">Enter S3 Credentials</h3>
      <div class="form-group">
        <label>Bucket</label>
        <input id="js-bucket" type="text" value="${bucket}" autofocus />
      </div>
      <div class="form-group">
        <label>Access Key ID</label>
        <input id="js-accessKeyId" type="text" value="${accessKeyId}" />
      </div>
      <div class="form-group">
        <label>Secret Access Key</label>
        <input id="js-secretAccessKey" type="password" value="${secretAccessKey}"/>
      </div>
      <button type="submit">Save Credentials</button>
    </form>
  </div>
  `);
  setTimeout(() => {
    attachHeaderEvents();
    $('form')
      .off('submit')
      .on('submit', e => {
        e.preventDefault();

        const newBucket = $('#js-bucket').val().trim();
        const newAccessKeyId = $('#js-accessKeyId').val().trim();
        const newSecretAccessKey = $('#js-secretAccessKey').val();

        if(!newBucket) {
          swal({
            text: 'You must enter a Bucket name',
            type: 'warning'
          });
          return;
        } else if(!newAccessKeyId) {
          swal({
            text: 'You must enter an Access Key ID',
            type: 'warning'
          });
          return;
        } else if(!newSecretAccessKey) {
          swal({
            text: 'You must enter a Secret Access Key',
            type: 'warning'
          });
          return;
        }

        localStorage.setItem('bucket', newBucket);
        localStorage.setItem('accessKeyId', newAccessKeyId);
        localStorage.setItem('secretAccessKey', newSecretAccessKey);
        bucket = newBucket;
        accessKeyId = newAccessKeyId;
        secretAccessKey = newSecretAccessKey;

        renderMain();

      });
  }, 100);
};

const headerHTML = ({ title }) => {
  return `
    <div class="header-container">
      <h4>${title}</h4>
      <a id="js-showUpload" href="#"><i class="fa fa-upload"></i></a>
      <a id="js-showList" href="#"><i class="fa fa-list"></i></a>
      <a id="js-showSettings" href="#" style="margin-right:-5px;"><i class="fa fa-cog"></i></a>
    </div>
  `;
};
const attachHeaderEvents = () => {
  $('#js-showUpload')
    .off('click')
    .on('click', e => {
      e.preventDefault();
      renderMain();
    });
  $('#js-showList')
    .off('click')
    .on('click', e => {
      e.preventDefault();
      renderUploads();
    });
  $('#js-showSettings')
    .off('click')
    .on('click', e => {
      e.preventDefault();
      renderSettings();
    });
};

const renderMain = () => {
  $('#js-main').html(`
  <div id="js-pasteArea" style="padding:10px;">
    ${headerHTML({ title: 'Simple S3 Uploader' })}
    <div style="height:310px;border-style:dashed;border-color:#000;border-width:4px;">
      <h3 style="text-align:center;line-height:294px;cursor:default;">Drop File Here</h3>
    </div>
  </div>
  `);

  setTimeout(() => {
    attachHeaderEvents();
    $(document).on('mouseout', () => {
      $('#js-pasteArea').css('background-color', '#fff');
    });
    $('#js-pasteArea')
      .off('dragover')
      .on('dragover', e => {
        e.preventDefault();
      });
    $('#js-pasteArea')
      .off('dragenter')
      .on('dragenter', () => {
        $('#js-pasteArea').css('background-color', '#eee');
      });
    $('#js-pasteArea')
      .off('drop')
      .on('drop', e => {
        e.preventDefault();
        $('#js-pasteArea').css('background-color', '#fff');
        const { files } = e.originalEvent.dataTransfer;
        if(files.length === 0) return;
        const [ file ] = files;
        const ext = path.extname(file.name);
        const base = path.basename(file.name, ext);
        const name = base + '-' + getRandom(4) + ext;
        swal({
          title: 'Are you sure?',
          text: `Are you sure that you want to upload ${file.name}?`,
          showConfirmButton: true,
          showCancelButton: true
        })
          .then(({ value: confirmed }) => {

            if(confirmed) {
              swal({
                html: 'Uploading... <span id="js-progress"></span>',
                showConfirmButton: false,
                showCancelButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false
              });
              const client = s3.createClient({
                multipartUploadThreshhold: 1000000000,
                multipartUploadSize: 1000000000,
                s3Options: {
                  accessKeyId,
                  secretAccessKey
                }
              });
              const params = {
                localFile: file.path,
                s3Params: {
                  Bucket: bucket,
                  Key: name,
                  ACL: 'public-read'
                }
              };
              const uploader = client.uploadFile(params);
              uploader.on('error', function(err) {
                console.error(err);
                swal({
                  title: 'Oops',
                  text: err.message,
                  type: 'error'
                })
                  .then(() => {
                    swal.close();
                    renderSettings();
                  })
                  .catch(console.error);
              });
              uploader.on('progress', function() {
                const percentage = (uploader.progressAmount / uploader.progressTotal) * 100;
                $('#js-progress').text(parseInt(percentage, 10) + '%');
              });
              uploader.on('end', function() {
                const downloadLink = getDownloadLink(name);
                clipboard.writeText(downloadLink);
                swal({
                  title: 'Success!',
                  text: `${downloadLink} copied to clipboard.`,
                  type: 'success'
                });
                const uploads = getUploads();
                const newUploads = [
                  ...uploads,
                  {
                    key: name ,
                    date: new Date().getTime()
                  }
                ];
                saveUploads(newUploads);
              });
            }
          })
          .catch(console.err);
      });
  }, 100);
};

$(document).ready(() => {
  const version = ipcRenderer.sendSync('getVersion');
  document.title = document.title + ' - v' + version;
  if(!accessKeyId || ! secretAccessKey || !bucket) {
    renderSettings();
  } else {
    renderMain();
  }
});
