const path = require('node:path');

require('../backend/node_modules/ts-node').register({
  project: path.resolve(__dirname, '../backend/tsconfig.json')
});
const { S3DocumentObjectStore, setDocumentObjectStore } = require('../backend/src/services/documentFiles');
setDocumentObjectStore(new S3DocumentObjectStore());
require('../backend/src/server');
