'use strict';

var moveBall = MoveBall;
var counter = -1;
var canvasContext = null;
var windowWidth = 0;
var windowHeight = 0;
var lastTimeStamp = 0;
var ball = {location: {x:0, y:0}, speed: {x:0, y:0}, radius:5};
var panel = {location: {x:0, y:570}, size: {width:70, height:10}};
var ball_panel_x_delta = 0;
var lives = 0;
var score = 0;
var blockArray_width = 14;
var blockArray_height = 14;
var block_width = 0;
var block_height = 0;
var blockArray = null;
var blockCount = 0;
var maximumAnimationTimeSpan = 100;
var currentScene;
var emptyScene;
var startMenuScene;
var playScene;
var gameOverScene;
var blocks_canvas;
var blocks_canvas_context;
var panel_canvas;
var panel_canvas_context;
var ball_canvas;
var ball_canvas_context;
var blocks_canvas_is_dirty;
var BLOCK_TYPE_NORMAL = 1;
var BLOCK_TYPE_STATIC = 2;
var static_hit_count = 50;
var current_level_index = 0;

function hash(number)
{
    return (Math.sin(number * number * number * number) + 1) / 2
}

function getLevelFunctionString(number)
{
    var index = number % 4;
    if (index == 0 || index == 2)
    {
        var a = hash(number + 1) * 10;
        var w = hash(number + 2) * 0.6 + 0.2;
        return `Math.sin(Math.sqrt(sqr((x - center_x) * ${w}) + sqr((y - center_y) * ${1 - w})) * ${a})`
    }
    if (index == 1)
    {
        var a = hash(number + 1) * 0.6 + 0.2
        var b = hash(number + 2) * 6 + 3
        return `-sqr(Math.sin(x * ${a}) * ${b} + center_y - y)`;
    }
    var a = Math.sign(hash(number + 1) * 2 - 1);
    var b = hash(number + 2) * 0.6 + 0.3;
    return `${a} * sqr(-sqr((x - center_x) * ${b}) - y + 18)`;
}

function getLevelDefintion(number)
{
    return {f:getLevelFunctionString(number), hueRange:hash(number + 1) * 50 + 25, hueOffset:hash(number + 1) * 360};
}

function MoveBall(deltaTime)
{
   ball.location.x = ball.location.x + ball.speed.x * deltaTime;
   ball.location.y = ball.location.y + ball.speed.y * deltaTime;
}

function moveBallWithPanel(deltaTime)
{
   ball.location.x = panel.location.x + ball_panel_x_delta;
   ball.location.y = panel.location.y - ball.radius;
}

function GameStep(deltaTime)
{
   currentScene.calculateStep(deltaTime);
   currentScene.drawCanvas();
}

function calculatePlayScene(deltaTime)
{
    moveBall(deltaTime);
    
    var ball_x_border = ball.location.x + Math.sign(ball.speed.x) * ball.radius;
    var ball_y_border = ball.location.y + Math.sign(ball.speed.y) * ball.radius;
    
    if ((ball_x_border <= 0 && ball.speed.x < 0) || (ball_x_border >= windowWidth && ball.speed.x > 0))
    {
	ball.speed.x = -ball.speed.x;
    increaseSpeed();
    }
    if (ball_y_border <= 0 && ball.speed.y < 0)
    {
	ball.speed.y = -ball.speed.y;
    increaseSpeed();
    }
    if (ball_y_border >= windowHeight && ball.speed.y > 0)
    {
	lives--;
	initRun();
    }
    var cell_x_border = Math.trunc(ball_x_border / block_width);
    var cell_y_border = Math.trunc(ball_y_border / block_height);
    var cell_x = Math.trunc(ball.location.x / block_width);
    var cell_y = Math.trunc(ball.location.y / block_height);

    if (GetSaveBlockArrayValue(cell_x_border, cell_y).isBlock)
    {
	ball.speed.x = -ball.speed.x;
	blockArray[cell_x_border][cell_y].doCollisionEffect();
	increaseSpeed();
    }
    if (GetSaveBlockArrayValue(cell_x, cell_y_border).isBlock)
    {
	ball.speed.y = -ball.speed.y;
	blockArray[cell_x][cell_y_border].doCollisionEffect();
	increaseSpeed();
    }
    if (blockCount <= 0)
    {
	playScene.activate();
    }
    
    if (ball.speed.y > 0 && ball_y_border >= panel.location.y && ball_y_border < panel.location.y + panel.size.height && ball.location.x >= panel.location.x - panel.size.width / 2 && ball.location.x <= panel.location.x + panel.size.width / 2)
    {
	var w = 2 * (ball.location.x - panel.location.x) / panel.size.width;
	var normal_x = w * (0.5);
	var normal_y = -Math.sqrt(1 - normal_x * normal_x);

	var speed_delta = -2 * (ball.speed.x * normal_x + ball.speed.y * normal_y);
	
	ball.speed.x = speed_delta * normal_x + ball.speed.x;
	ball.speed.y = speed_delta * normal_y + ball.speed.y;
    increaseSpeed();
    }
    
    if (lives <= 0)
    {
	gameOverScene.activate();
    }
}

function increaseSpeed()
{
   if (Math.sqrt(ball.speed.x * ball.speed.x + ball.speed.y * ball.speed.y) < 0.5)
   {
       ball.speed.x = ball.speed.x * 1.01;
       ball.speed.y = ball.speed.y * 1.01;
   }
}

function GetSaveBlockArrayValue(x, y)
{
    if (x >= 0 && x < blockArray_width && y >= 0 && y < blockArray_height)
    {
        return blockArray[x][y];
    }
    return 0;
}

function drawStartMenu()
{
    canvasContext.clearRect(0, 0, windowWidth, windowHeight);
    canvasContext.fillStyle = "rgba(0, 0, 0, 0.5)";
    canvasContext.font = "bold 60pt Times New Roman";
    canvasContext.textBaseline = "middle";
    canvasContext.textAlign = "center";
    var text = "Panel With Blocks";
    canvasContext.fillText(text, windowWidth / 2, windowHeight / 2);
    canvasContext.strokeText(text, windowWidth / 2, windowHeight / 2);
}

function drawBall(canvasContext2, left, top, radius)
{
   var sty = canvasContext2.createRadialGradient(left + radius * 2 / 3, top + radius * 2 / 3, 0, 
						left + radius, top + radius, radius);
   sty.addColorStop(0.0, "#AAAAFF");
   sty.addColorStop(1.0, "#0000FF");
   canvasContext2.fillStyle = sty;
   canvasContext2.beginPath();
   canvasContext2.arc(left + radius, top + radius, radius, 0, 2 * Math.PI, false);
   canvasContext2.fill();
}

function drawFrame(x, y, width, height, deep, color_top, color_bottom)
{
  blocks_canvas_context.lineWidth = 1;
  for (var right_bottom_factor = 0; right_bottom_factor < 2; right_bottom_factor++)
  {
     blocks_canvas_context.strokeStyle = right_bottom_factor == 0 ? color_top : color_bottom;
     blocks_canvas_context.beginPath();
     for (var i = 0; i < deep; i++)
     {
       var q = ((1 - 2 * right_bottom_factor) * i);
       blocks_canvas_context.moveTo(x + right_bottom_factor + i, y + height - 1 - i);
       blocks_canvas_context.lineTo(x + (width - 1) * right_bottom_factor + q, y + (height - 1) * right_bottom_factor + q);
       blocks_canvas_context.lineTo(x + width - 1 - i, y + right_bottom_factor + i);
     }
     blocks_canvas_context.stroke();
  }
}

function drawBlock_2(block, x, y)
{
  var color = "hsl(" + block.hue + ", 100%, 50%)";
  var color_l = "hsl(" + block.hue + ", 100%, 80%)";
  var color_d = "hsl(" + block.hue + ", 100%, 10%)";

  blocks_canvas_context.fillStyle = color;
  blocks_canvas_context.fillRect(x * block_width + 2, y * block_height + 2, block_width - 4, block_height - 4);
  drawFrame(x * block_width, y * block_height, block_width, block_height, 2, color_l, color_d);
  drawFrame(x * block_width + 4, y * block_height + 4, block_width - 8, block_height - 8, 1, color_d, color_l);
}

function drawBlock(block, x, y)
{
  var bgfade = blocks_canvas_context.createLinearGradient(x * block_width, y * block_height, x * block_width, (y + 1) * block_height - 1);

  var color = "hsl(" + block.hue + ", 100%, 50%)";
  var color_l = "hsl(" + block.hue + ", 100%, 80%)";
  var color_d = "hsl(" + block.hue + ", 100%, 10%)";

  bgfade.addColorStop(0.4, color);
  bgfade.addColorStop(0.0, color_l);
  bgfade.addColorStop(1.0, color_d);
  blocks_canvas_context.fillStyle =  bgfade;
  blocks_canvas_context.fillRect(x * block_width, y * block_height, block_width, block_height);
  blocks_canvas_context.strokeStyle = "#111111";
  blocks_canvas_context.strokeRect(x * block_width, y * block_height, block_width, block_height);
}

function removeBlock(block)
{
   this.isBlock = false;
   score = score + 50;
   blocks_canvas_is_dirty = true;
   blockCount--;
}

function drawBlocks()
{
   if (blocks_canvas_is_dirty)
   {
      blocks_canvas_context.clearRect(0, 0, windowWidth, windowHeight);
      for (var x = 0; x < blockArray_width; x++)
      {
	  for (var y = 0; y < blockArray_height; y++)
	  {
	      if (blockArray[x][y].isBlock)
	      {
		 blockArray[x][y].draw(blockArray[x][y], x, y);
	      }
	  }
      }
      blocks_canvas_is_dirty = false;
   }
   canvasContext.drawImage(blocks_canvas, 0, 0);
}

function drawPanel(canvasContext2, left, top, width, height)
{
   var radius = height / 2;
  
   var bgfade = canvasContext2.createLinearGradient(left, top, left, top + height);
   bgfade.addColorStop(0.4, "#6600AA");
   bgfade.addColorStop(0.0, "#CCCCCC");
   bgfade.addColorStop(1.0, "#111111");
   canvasContext2.fillStyle =  bgfade;
  
   canvasContext2.beginPath();
   canvasContext2.moveTo(left + height, top + height);
   canvasContext2.arc(left + height, top + radius, radius, Math.PI / 2, -Math.PI / 2, false);
   canvasContext2.lineTo(left + width - height, top);
   canvasContext2.arc(left + width - height, top + radius, radius, -Math.PI / 2, Math.PI / 2, false);
   canvasContext2.fill();
}

function drawTextLayer()
{
   canvasContext.fillStyle = "rgba(0, 0, 0, 0.45)";
   canvasContext.font = "bold 30pt sans-serif";
   canvasContext.textBaseline = "top";
   canvasContext.textAlign = "right";
   var text = "Lives: " + lives;
   canvasContext.fillText(text, windowWidth, 0);
   canvasContext.strokeText(text, windowWidth, 0);

   canvasContext.textAlign = "left";
   var text = "Score: " + score;
   canvasContext.fillText(text, 0, 0);
   canvasContext.strokeText(text, 0, 0);
}

function drawLevel()
{
        canvasContext.clearRect(0, 0, windowWidth, windowHeight);
        //canvasContext.clearRect(currentBallX - 10, currentBallY - 10, ball.radius * 2 + 20, ball.radius * 2 + 20);
        drawBlocks();
        canvasContext.drawImage(ball_canvas, Math.floor(ball.location.x - ball.radius), Math.floor(ball.location.y - ball.radius));
        canvasContext.drawImage(panel_canvas, Math.floor(panel.location.x - panel.size.width / 2), Math.floor(panel.location.y));
        drawTextLayer();
}

function DrawCanvasGameOver()
{   
   canvasContext.fillStyle = "rgba(0, 0, 0, 0.01)";
   canvasContext.font = "bold 90pt sans-serif";
   canvasContext.textBaseline = "middle";
   canvasContext.textAlign = "center";
   var text = "Game Over";
   canvasContext.fillText(text, windowWidth / 2, windowHeight / 2);
   canvasContext.strokeText(text, windowWidth / 2, windowHeight / 2);
}

function GameLoop()
{
    var timeStamp = Date.now();
    var timeSpan = timeStamp - lastTimeStamp;
    timeSpan = Math.min(timeSpan, maximumAnimationTimeSpan); //To avoid greate jumps.
  
    GameStep(timeSpan);
    lastTimeStamp = Date.now();
    window.requestAnimFrame(GameLoop);
}

function BuildNewLevel()
{ 
   ball_panel_x_delta = 0;
   moveBall = moveBallWithPanel;
 
   blockArray_width = 20;
   blockArray_height = 17;
   
   block_width = windowWidth / blockArray_width;
   block_height = windowHeight / (2 * blockArray_height);    
    
   //blockArray = createLevel(level[current_level_index]);
   blockArray = createLevel(getLevelDefintion(current_level_index));
   
   blocks_canvas_is_dirty = true;
   
   current_level_index++;
   
   initRun();
}

function Scene(initScene, calculateStep, drawCanvas, eventHandlers)
{
   this.init = initScene;
   this.calculateStep = calculateStep;
   this.drawCanvas = drawCanvas;
   this.eventHandlers = eventHandlers;
   this.activate = function()
   {
      if (currentScene != null)
      {
	 //Remove the event handlers of the current scene.
	 for (var eventName in currentScene.eventHandlers)
	 {
            window.removeEventListener(eventName, currentScene.eventHandlers[eventName], false);
	 }
      }
      currentScene = this;
      currentScene.init();
      //Add the event handlers of the current scene.
      for (var eventName in currentScene.eventHandlers)
      {
	window.addEventListener(eventName, currentScene.eventHandlers[eventName], false);
      }
   };
}

function initRun()
{
   ball.location.x = 0;
   ball.location.y = panel.location.y - ball.radius;
   ball.speed.x = 0.12;
   ball.speed.y = -0.24;
   panel.location.x = windowWidth / 2;
   ball_panel_x_delta = 0;
   moveBall = moveBallWithPanel;
}

function onMouseMove(event)
{
    panel.location.x = Math.min(event.clientX, windowWidth - panel.size.width / 2);
    panel.location.x = Math.max(panel.location.x, panel.size.width / 2);
}

function onClick(event)
{
    ball_panel_x_delta = -1;
    moveBall = MoveBall;
}

function onMenuClick(event)
{
    playScene.activate();
    counter = 0;
}

function onGameOverClick(event)
{
    startMenuScene.activate();
}

function hit_static_block()
{
   static_hit_count--;
   if (static_hit_count <= 0)
   {
      for (var x = 0; x < blockArray_width; x++)
      {
	  for (var y = 0; y < blockArray_height; y++)
	  {
	      if (blockArray[x][y].isBlock && blockArray[x][y].blockType == BLOCK_TYPE_STATIC)
	      {
		 blockArray[x][y].isBlock = false;
		 score = score + 1;
	      }
	  }
      }
      blocks_canvas_is_dirty = true;
   }
}

function createLevel(levelDescription)
{
   var center_x = (blockArray_width - 1) / 2;
   var center_y = (blockArray_height - 1) / 2;
   var values = [];

   blockArray = [];
   for (var x = 0; x < blockArray_width; x++)
   {
       blockArray[x] = [];
       for (var y = 0; y < blockArray_height; y++)
       {
          var value = eval(levelDescription.f);	   
          blockArray[x][y] = value;
          values.push(value);
       }
   }
    
   values.sort(function(a,b) {return b - a;});

   var blockThresholdValue = values[Math.floor((values.length - 1) * 0.4)];
   var staticThresholdValue = values[Math.floor((values.length - 1 ) * 0.1)];
   var max = values[0];   
   
   blockCount = 0;
   for (var x = 0; x < blockArray_width; x++)
   {
       for (var y = 0; y < blockArray_height; y++)
       {
            value = blockArray[x][y];
            blockArray[x][y] = {
				isBlock: value > blockThresholdValue,
				hue: (((value - blockThresholdValue) / (max - blockThresholdValue)) * levelDescription.hueRange + levelDescription.hueOffset),
				blockType: value > staticThresholdValue ? BLOCK_TYPE_STATIC : BLOCK_TYPE_NORMAL,
				draw:  value > staticThresholdValue ? drawBlock : drawBlock_2,
				doCollisionEffect: value > staticThresholdValue ? hit_static_block : removeBlock,
			      };
            if (blockArray[x][y].isBlock && blockArray[x][y].blockType != BLOCK_TYPE_STATIC)
            {
                blockCount++;
            }
       }
   }

   return blockArray;
}

function sqr(a) { return a * a; }

function Start()
{  
   var canvas = document.getElementById("myCanvas");
   
   //canvas.style.width = "100%";
   
   //canvas.width = window.innerWidth * 0.9;
   //canvas.height = window.innerHeight * 0.9;
   canvasContext = canvas.getContext("2d");

   windowWidth = canvas.width;
   windowHeight = canvas.height;
   
   lastTimeStamp = 0;
   window.requestAnimFrame = GetRequestAnimFrameFunction();   
   initRun();

   emptyScene = new Scene(doNothing, doNothing, doNothing, {});
   startMenuScene = new Scene(function() {lives = 3; score = 0;}, doNothing, drawStartMenu, {click: onMenuClick});
   playScene = new Scene(BuildNewLevel, calculatePlayScene, drawLevel, {mousemove: onMouseMove, click: onClick});
   gameOverScene = new Scene(doNothing, doNothing, DrawCanvasGameOver, {click: onGameOverClick});
   currentScene = emptyScene;
   
   blocks_canvas = document.createElement("canvas");
   blocks_canvas.width = windowWidth;
   blocks_canvas.height = windowHeight;
   blocks_canvas_context = blocks_canvas.getContext("2d");

   panel_canvas = document.createElement("canvas");
   panel_canvas.width = panel.size.width;
   panel_canvas.height = panel.size.height;
   panel_canvas_context = panel_canvas.getContext("2d");   
   drawPanel(panel_canvas_context, 0, 0, panel.size.width, panel.size.height);

   ball_canvas = document.createElement("canvas");
   ball_canvas.width = ball.radius * 2;
   ball_canvas.height = ball.radius * 2;
   ball_canvas_context = ball_canvas.getContext("2d");   
   drawBall(ball_canvas_context, 0, 0, ball.radius);
   
   window.requestAnimFrame(GameLoop);
   startMenuScene.activate();
}

function doNothing() {}

function GetRequestAnimFrameFunction() {
    //These part copied from http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/:
    // shim layer with setTimeout fallback
   return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
}

Start();