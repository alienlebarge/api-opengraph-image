const { builder } = require("@netlify/functions");
const OgImageHtml = require("./ogImageHtml.js");

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;
const FALLBACK_IMAGE_FORMAT = "png";
const ERROR_URL_SEGMENT = "onerror";

function getErrorImage(message, statusCode, ttl, cacheBuster, returnEmptyImageWhenNotFound = false) {
  let obj = {
    // We need to return 200 here or Firefox won’t display the image
    // HOWEVER a 200 means that if it times out on the first attempt it will stay the default image until the next build.
    statusCode,
    // HOWEVER HOWEVER, we can set a ttl of 60 which means that the image will be re-requested in 24 hours.
    ttl,
    headers: {
      "x-error-message": message,
      "x-cache-buster": cacheBuster,
    },
  };

  // Use case: we want to remove the `<img>` clientside when an OG image is not found.

  // Notes:
  // Builder functions *do* cache 404s (not 50x) but not all browsers trigger `<img onerror>`
  // Also tried: Both 301 and 302 redirects in image sources (to a `/not-found/` URI) but are not reflected in clientside .src or .currentSrc
  // So to trigger `<img onerror>` on a 404 we *cannot* return valid image content
  if(!returnEmptyImageWhenNotFound) {
    obj.headers['content-type'] = "image/svg+xml";
    obj.body = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" x="0" y="0" viewBox="0 0 1569.4 2186" xml:space="preserve" aria-hidden="true" focusable="false"><style>.st0{fill:#bbb;stroke:#bbb;stroke-width:28;stroke-miterlimit:10}</style><g><path class="st0" d="M562.2 1410.1c-9 0-13.5-12-13.5-36.1V778.9c0-11.5-2.3-16.9-7-16.2-28.4 7.2-42.7 10.8-43.1 10.8-7.9.7-11.8-7.2-11.8-23.7v-51.7c0-14.3 4.3-22.4 12.9-24.2l142.2-36.6c1.1-.3 2.7-.5 4.8-.5 7.9 0 11.8 8.4 11.8 25.3v712c0 24.1-4.7 36.1-14 36.1l-82.3-.1zM930.5 1411.2c-14.4 0-26.8-1-37.4-3-10.6-2-21.6-6.5-33.1-13.5s-20.9-16.6-28.3-28.8-13.4-29.3-18-51.2-7-47.9-7-78.1V960.4c0-7.2-2-10.8-5.9-10.8h-33.4c-9 0-13.5-8.6-13.5-25.8v-29.1c0-17.6 4.5-26.4 13.5-26.4h33.4c3.9 0 5.9-4.8 5.9-14.5l9.7-209.5c1.1-19 5.7-28.5 14-28.5h53.9c9 0 13.5 9.5 13.5 28.5v209.5c0 9.7 2.1 14.5 6.5 14.5H973c9 0 13.5 8.8 13.5 26.4v29.1c0 17.2-4.5 25.8-13.5 25.8h-68.9c-2.5 0-4.2.6-5.1 1.9-.9 1.2-1.3 4.2-1.3 8.9v277.9c0 20.8 1.3 38.2 4 52s6.6 24 11.8 30.4 10.4 10.8 15.6 12.9c5.2 2.2 11.6 3.2 19.1 3.2h38.2c9.7 0 14.5 6.7 14.5 19.9v32.3c0 14.7-5.2 22.1-15.6 22.1l-54.8.1zM1137.2 1475.8c8.2 0 15.4-6.7 21.5-20.2s9.2-32.6 9.2-57.4c0-5.8-3.6-25.7-10.8-59.8l-105.6-438.9c-.7-5-1.1-9-1.1-11.9 0-12.9 2.7-19.4 8.1-19.4h65.2c5 0 9.1 1.7 12.4 5.1s5.8 10.3 7.5 20.7l70 370.5c1.4 4.3 2.3 6.5 2.7 6.5 1.4 0 2.2-2 2.2-5.9l54.9-369.5c1.4-10.8 3.7-18 6.7-21.8s6.9-5.7 11.6-5.7h45.2c6.1 0 9.2 7 9.2 21 0 3.2-.4 7.4-1.1 12.4l-95.9 499.3c-7.5 41.3-15.8 72.9-24.8 94.8s-19 36.8-30.2 44.7c-11.1 7.9-25.8 12-44.2 12.4h-5.4c-29.1 0-48.8-7.7-59.2-23.2-2.9-3.2-4.3-11.5-4.3-24.8 0-26.6 4.3-39.9 12.9-39.9.7 0 7.2 1.8 19.4 5.4 12.4 3.8 20.3 5.6 23.9 5.6z"/><g><path class="st0" d="M291.2 1411.1c-9 0-13.5-12-13.5-36.1V779.9c0-11.5-2.3-16.9-7-16.2-28.4 7.2-42.7 10.8-43.1 10.8-7.9.7-11.8-7.2-11.8-23.7v-51.7c0-14.3 4.3-22.4 12.9-24.2L371 638.2c1.1-.3 2.7-.5 4.8-.5 7.9 0 11.8 8.4 11.8 25.3v712c0 24.1-4.7 36.1-14 36.1h-82.4z"/></g></g></svg>`;
    obj.isBase64Encoded = false;
  }

  return obj;
}

async function handler(event, context) {
  // /:url/:size/:format/
  // e.g. /https%3A%2F%2Fwww.11ty.dev%2F/
  let pathSplit = event.path.split("/").filter(entry => !!entry);
  let [url, size, imageFormat, returnEmptyImage, cacheBuster] = pathSplit;

  url = decodeURIComponent(url);

  // Whether or to return empty image content
  let returnEmptyImageWhenNotFound = false;

  // Manage your own frequency by using a _ prefix and then a hash buster string after your URL
  // e.g. /https%3A%2F%2Fwww.11ty.dev%2F/_20210802/ and set this to today’s date when you deploy
  if(size) {
    if(size.startsWith("_")) {
      cacheBuster = size;
      size = undefined;
    } else if(size === ERROR_URL_SEGMENT) {
      returnEmptyImageWhenNotFound = true;
      size = undefined;
    }
  }

  if(imageFormat) {
    if(imageFormat.startsWith("_")) {
      cacheBuster = imageFormat;
      imageFormat = undefined;
    } else if(imageFormat === ERROR_URL_SEGMENT) {
      returnEmptyImageWhenNotFound = true;
      imageFormat = undefined;
    }
  }

  if(returnEmptyImage) {
    if(returnEmptyImage.startsWith("_")) {
      cacheBuster = returnEmptyImage;
    } else if(returnEmptyImage === ERROR_URL_SEGMENT) {
      returnEmptyImageWhenNotFound = true;
    }
  }

  try {
    // output to Function logs
    let maxWidth = IMAGE_WIDTH;
    if(size === "small") {
      maxWidth = 375;
    } else if(size === "medium") {
      maxWidth = 650;
    }

    console.log( {url, size, imageFormat, cacheBuster} );

    let og = new OgImageHtml(url);
    await og.fetch();

    let imageUrls = await og.getImages();
    if(!imageUrls.length) {
      return getErrorImage(`No Open Graph images found for ${url}`, 200, 60 * 60 * 24, cacheBuster, returnEmptyImageWhenNotFound);
    }

    // TODO: when requests to https://v1.screenshot.11ty.dev/ show an error (the default SVG image)
    // this service should error with _that_ image and the error message headers.
    let stats = await og.optimizeImage(imageUrls[0], imageFormat || FALLBACK_IMAGE_FORMAT, maxWidth);
    let format = Object.keys(stats).pop();
    let stat = stats[format][0];

    console.log( "Found match", url, format, stat );

    return {
      statusCode: 200,
      headers: {
        "content-type": stat.sourceType,
        "x-cache-buster": cacheBuster,
      },
      body: stat.buffer.toString("base64"),
      isBase64Encoded: true
    };
  } catch (error) {
    console.log("Error", error);
    return getErrorImage(error.message, 200, 60 * 5, cacheBuster);
  }
}

exports.handler = builder(handler);
