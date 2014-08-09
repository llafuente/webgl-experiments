function image_to_pixels(image, depth) {
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);

    var canvas2 = document.createElement("canvas");
    var context2 = canvas2.getContext("2d");
    canvas2.width = image.width;
    canvas2.height = image.height;
    context2.drawImage(depth, 0, 0);

    var img_data = context.getImageData(0, 0, canvas.width, canvas.height);
    var pix = img_data.data,
        pix_depth = context2.getImageData(0, 0, canvas.width, canvas.height).data,
        npix = new Array(pix.length);

    // Loop over each pixel and invert the color.
    for (var i = 0, j = 0, n = pix.length; i < n; i += 4, j+=4) {
        if (pix[i+3]) {
            npix[j  ] = pix[i  ]; // red
            npix[j+1] = pix[i+1]; // green
            npix[j+2] = pix[i+2]; // blue
            npix[j+3] = pix_depth[i]; // blue
            // i+3 is alpha (the fourth element)
            //console.log(i % image.width, Math.floor(i / image.width), pix[i  ], pix[i+1], pix[i+2]);
        }
    }

    document.body.appendChild(canvas);

    return npix;
};
