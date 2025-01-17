const { AwsClient } = require('aws4fetch');
const utils = require('../utils');

function getEndpoint(endpoint, options) {
  // See https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-bucket-intro.html
  if (endpoint && options.forcePathStyle) {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}/${options.bucket}`;
  }
  if (endpoint) {
    const url = new URL(endpoint);
    return `${url.protocol}//${options.bucket}.${url.host}`;
  }
  if (options.forcePathStyle && options.region) {
    return `https://s3.${options.region}.amazonaws.com/${options.bucket}`;
  }
  if (options.forcePathStyle) {
    return `https://s3.amazonaws.com/${options.bucket}`;
  }
  if (options.region) {
    return `https://${options.bucket}.s3.${options.region}.amazonaws.com`;
  }
  return `https://${options.bucket}.s3.amazonaws.com`;
}

function s3HandlerFactory({
  accessKeyId,
  secretAccessKey,
  bucket,
  region,
  endpoint,
  forcePathStyle,
}) {
  const aws = new AwsClient({
    accessKeyId,
    region,
    secretAccessKey,
  });

  const resolvedEndpoint = getEndpoint(endpoint, {
    region,
    bucket,
    forcePathStyle,
  });

  return async (ctx) => {
    const url = utils.resolveParams(`${resolvedEndpoint}/{file}`, ctx.params);

    const headers = {};

    if (ctx.request.headers.range) {
      headers.range = ctx.request.headers.range;
    }

    const response = await aws.fetch(url, {
      method: ctx.method || ctx.request.method,
      headers,
    });

    ctx.status = response.status;
    ctx.body = response.body;
    const responseHeaders = utils.instanceToJson(response.headers);
    Object.keys(responseHeaders).forEach((key) => {
      ctx.set(key, responseHeaders[key]);
    });
  };
}

module.exports = s3HandlerFactory;
