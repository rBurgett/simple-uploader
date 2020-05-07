export const getDownloadLink = (bucket, key) => `https://s3.amazonaws.com/${bucket}/${encodeURI(key)}`;
