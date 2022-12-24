import React from 'react';
import { useState } from 'react';

const Takeoffcalculator = () => {
  const canvasElement = document.createElement("canvas"); // Creates Canvas on Screen
  const ctx = canvasElement.getContext('2d'); // get context
  const [processing, setProcessing] = useState(false); // Processes if the image is obtained from user files

  
  const GetImage = (e) => {
    console.log("Checking image"); //check if image is obtained
    setProcessing(true); //process image
    const reader = new FileReader(); // open file reader on desktop
    reader.onload = function (event) { //load file on desktop await event
    const img = new Image();
    img.onload = function () { // when image loads .......
      canvasElement.width = img.width; // set canvas width to img
      canvasElement.height = img.height; //set canvas height to img
      ctx.drawImage(img, 0, 0); // draw image on canvas
      document.getElementById("output").appendChild(canvasElement);
    }
    img.src = event.target.result; // get results
    }
  reader.readAsDataURL(e.target.files[0]); // read files with target reader as data url
  setProcessing(false);
  console.log(reader.result); // TEST
  };

  // flag to keep track of whether the user is currently drawing a line
let startX;
let startY;
let endX;
let endY;

// Flag to keep track of whether the line is being drawn or not
let isDrawing = false;

// Set the line width and color



// Add event listeners for mouse events
canvasElement.addEventListener('mousedown', startDrawing);
canvasElement.addEventListener('mousemove', draw);
canvasElement.addEventListener('mouseup', stopDrawing);

// Event handler for when the mouse button is pressed down
function startDrawing(event) {
  isDrawing = true;
  startX = event.offsetX;
  startY = event.offsetY;
}

// Event handler for when the mouse is moved
function draw(event) {
  if (isDrawing) {
    endX = event.offsetX;
    endY = event.offsetY;
  }
}

// Event handler for when the mouse button is released
function stopDrawing(event) {
  isDrawing = false;
  endX = event.offsetX;
  endY = event.offsetY;

  // Reset the line dash pattern and line cap to their default values
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 2;

  drawLine();

  // Calculate the length of the line using the formula in pixels
  const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

  // Convert the length from pixels to the scale specified (1:50 in this case) in mm
  const lengthInScalemm = length / 0.02514285714;

  //const mm = lengthInScale * 1000

  console.log(lengthInScalemm, length);

  // Display the length of the line on the page
  //document.getElementById('length').innerHTML = `Length: ${lengthInScale} units`;
}
// Function to draw the line on the canvas
function drawLine() {
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);

  // Set the line dash pattern to a dotted line
  ctx.setLineDash([5, 5]);

  // Set the line cap to round to give the dots rounded end caps
  ctx.lineCap = 'round';

  ctx.stroke();
}

  return (
      <>
        <form className="Form">
        <label className="upload-image">Upload image</label>
        <input
          id="image-selector"
          type="file"
          name="upload-image"
          accept="image/*"
          className="File-selector"
          onChange={GetImage}
          disabled={processing}
        />
        </form>
        <div 
        id='output'>
        </div>
    </>
    );
  
}

export default Takeoffcalculator;







    // Calculate the length of the line in pixels
      //const length = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
  
    // Calculate the length of the line in the desired scale (1:100)
     //const scaledLength = length * 100;