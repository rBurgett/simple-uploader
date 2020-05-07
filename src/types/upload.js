class Upload {

  /**
   * S3 Key of the file
   * @type {string}
   * @default ''
   */
  key = '';

  /**
   * Time of the upload
   * @type {number}
   * @default ''
   */
  date = 0;

  constructor(data) {
    for(const key of Object.keys(data)) {
      this[key] = data[key];
    }
  }

}

export default Upload;
