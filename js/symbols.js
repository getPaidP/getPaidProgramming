document.addEventListener("DOMContentLoaded", () => {
  const btn1 = document.querySelector('.big-chig-btn');
  const btn2 = document.querySelector('.glizzy-btn');
  const btn3 = document.querySelector('.anger-btn');

  const pornImg1 = document.querySelector('.porn-img-1');
  const pornImg2 = document.querySelector('.porn-img-2');
  const pornImg3 = document.querySelector('.porn-img-3');
  const pornImg4 = document.querySelector('.porn-img-4');
  const pornImg5 = document.querySelector('.porn-img-5');
  const pornImg6 = document.querySelector('.porn-img-6');
  const pornImg7 = document.querySelector('.porn-img-7');
  const pornImg8 = document.querySelector('.porn-img-8');

  const pornVid2 = document.querySelector('.porn-vid-2');

  const milkDiv1 = document.querySelector('.milk-div-1');
  const milkDiv2 = document.querySelector('.milk-div-2');

  const hotdogGuyPic = document.querySelector('.hotdog-guy-pic');

  const imgArr = [pornImg1, pornImg2, pornImg3, pornImg4, pornImg5, pornImg6, pornImg7, pornImg8];

  btn1.addEventListener("mouseover", () => {
    for (let i of imgArr) {
      if (i.style.display === "none") {
        i.style.display = "block";
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.style.opacity = 0;
        canvas.style.transition = "opacity 5s ease-in-out";
                    document.body.appendChild(canvas);
        setTimeout(() => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.src = i.src
          image.onload = function () {
            
            // Set canvas size to match the image
            canvas.width = image.width;
            canvas.height = image.height;

            // Draw the image on the canvas
            ctx.drawImage(image, 0, 0);

            // Now you can access image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Process image data (invert colors, etc.)
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];       // Red
                data[i + 1] = 255 - data[i + 1]; // Green
                data[i + 2] = 255 - data[i + 2]; // Blue
            }

            ctx.putImageData(imageData, 0, 0);

            // add style to new img
            copyInlineStyles(i, canvas)
            canvas.style.opacity = 1;
          };
        }, 2000)
        return;
      }
    }

  })
  btn2.addEventListener("click", () => {
    if (pornImg7.style.display === "block") {
          milkDiv1.innerText = milkDiv1.innerText + "0\n"
          milkDiv2.innerText = milkDiv2.innerText + "0\n"
      if (milkDiv1.innerText.length > 26) {
        hotdogGuyPic.style.display = "block";
      }
    }
  })

  btn3.addEventListener("mouseover", () => {
    pornVid2.style.display = "block";
    pornVid2.play();
  })

})

function copyInlineStyles(sourceElement, targetElement) {
    // Loop through all styles in the source element
    for (let i = 0; i < sourceElement.style.length; i++) {
        const styleName = sourceElement.style[i]; // Get the name of the CSS property
        const styleValue = sourceElement.style.getPropertyValue(styleName); // Get the value of the CSS property

        // Apply the same style to the target element
        targetElement.style.setProperty(styleName, styleValue);
    }
}


function invertImage(image) {
  debugger
    // Create a canvas to draw the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set the canvas size to match the image
    canvas.width = image.width;
    canvas.height = image.height;

    // Draw the image onto the canvas
    ctx.drawImage(image, 0, 0);

    // Get image data (pixels)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Loop through each pixel and invert the colors
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];     // Red
        data[i + 1] = 255 - data[i + 1]; // Green
        data[i + 2] = 255 - data[i + 2]; // Blue
        // Alpha (data[i + 3]) stays the same
    }

    // Put the modified image data back to the canvas
    ctx.putImageData(imageData, 0, 0);

    // Return the canvas as the new image
    return canvas.toDataURL();
}
