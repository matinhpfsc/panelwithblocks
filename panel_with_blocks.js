'use strict';

var moveBall = MoveBall;
var ball = null;
var panel = null;
var ball_panel_x_delta = 0;
var lives = 0;
var score = 0;
var blockArray_width;
var blockArray_height;
var block_width = 0;
var block_height = 0;
var blockArray = null;
var blockCount = 0;
var maximumSpeed = 0;

var startMenuScene;
var playScene;
var gameOverScene;

var canvasContext = null;
var windowCanvas = null;
var blocks_canvas;
var panel_canvas;
var ball_canvas;

var staticBlockCount = 0;
var static_hit_count = 50;
var current_level_index = 0;

var noneBlock = new NoneBlock();
var borderBlock = {isBlock: function() { return true; }, doCollisionEffect: function() { return true; } };

function Size(width, height)
{
   this.width = width;
   this.height = height;
}

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

function GetSaveBlockOnCoords(x, y)
{
   var cell_x = Math.floor(x / block_width);
   var cell_y = Math.floor(y / block_height);
   return GetSaveBlockArrayValue(cell_x, cell_y);
}

function CalculateBlockCollision(i)
{
   var j = 1 - i;
   
   var x_coord_f = ball.location.x + Math.sign(ball.speed.x) * ball.radius * i;
   var x_coord_b = ball.location.x - Math.sign(ball.speed.x) * ball.radius * i;
   var y_coord_f = ball.location.y + Math.sign(ball.speed.y) * ball.radius * j;
   var y_coord_b = ball.location.y - Math.sign(ball.speed.y) * ball.radius * j;

   var fc = GetSaveBlockOnCoords(x_coord_f, y_coord_f);
   if (fc.isBlock() && !GetSaveBlockOnCoords(x_coord_b, y_coord_b).isBlock())
   {
      fc.doCollisionEffect();
      ball.speed.x = ball.speed.x * (1 - 2 * i);
      ball.speed.y = ball.speed.y * (1 - 2 * j);
      increaseSpeed();
   }
}

function ball_hits_panel()
{
   var y_coord_f = ball.location.y + Math.sign(ball.speed.y) * ball.radius;
   
   return ball.speed.y > 0 && y_coord_f >= panel.location.y
       && y_coord_f < panel.location.y + panel.size.height
       && ball.location.x >= panel.location.x - panel.size.width / 2
       && ball.location.x <= panel.location.x + panel.size.width / 2;
}

function calculateCollisions()
{
   var ball_y_border = ball.location.y + Math.sign(ball.speed.y) * ball.radius;

   // Is ball falling down?
   if (ball_y_border >= windowCanvas.height && ball.speed.y > 0)
   {
      lives--;
      initRun();
   }

   // Hits the ball a block?
   CalculateBlockCollision(1);
   CalculateBlockCollision(0);

   if (ball_hits_panel())
   {
      var normal_x = (ball.location.x - panel.location.x) / panel.size.width;
      var normal_y = -Math.sqrt(1 - normal_x * normal_x);

      var speed_delta = -2 * (ball.speed.x * normal_x + ball.speed.y * normal_y);

      ball.speed.x = speed_delta * normal_x + ball.speed.x;
      ball.speed.y = speed_delta * normal_y + ball.speed.y;
      increaseSpeed();
   }

   if (blockCount <= 0)
   {
      playScene.activate();
   }
}

function calculatePlayScene(deltaTime)
{
   moveBall(deltaTime);
   calculateCollisions();
   if (lives <= 0)
   {
      gameOverScene.activate();
   }
}

function increaseSpeed()
{
   if (Math.sqrt(ball.speed.x * ball.speed.x + ball.speed.y * ball.speed.y) < maximumSpeed)
   {
       ball.speed.x = ball.speed.x * 1.01;
       ball.speed.y = ball.speed.y * 1.01;
   }
}

function GetSaveBlockArrayValue(x, y)
{
   if (x < 0 || y < 0 || x >= blockArray_width)
   {
      return borderBlock;
   }
   if (x >= 0 && x < blockArray_width && y >= 0 && y < blockArray_height)
   {
      return blockArray[x][y];
   }
   return noneBlock;
}

function setFontStyle(canvasContext, alpha, align, baseline, size, font)
{
   canvasContext.fillStyle    = `rgba(0, 0, 0, ${alpha})`;
   canvasContext.font         = `bold ${size}pt ${font}`;
   canvasContext.textBaseline = baseline;
   canvasContext.textAlign    = align;
}

function writeText(canvasContext, x, y, text)
{
   canvasContext.fillText  (text, x, y);
   canvasContext.strokeText(text, x, y);
}

function drawStartMenu()
{
   canvasContext.clearRect(0, 0, windowCanvas.width, windowCanvas.height);
   setFontStyle(canvasContext, 0.5, "center", "middle", 0.1 * windowCanvas.height, "Times New Roman");
   writeText(canvasContext, windowCanvas.width / 2, windowCanvas.height / 2, "Panel With Blocks");
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

function drawFrame(context, x, y, width, height, deep, color_top, color_bottom)
{
  context.lineWidth = 1;
  for (var right_bottom_factor = 0; right_bottom_factor < 2; right_bottom_factor++)
  {
     context.strokeStyle = right_bottom_factor == 0 ? color_top : color_bottom;
     context.beginPath();
     for (var i = 0; i < deep; i++)
     {
       var q = ((1 - 2 * right_bottom_factor) * i);
       context.moveTo(x + right_bottom_factor + i, y + height - 1 - i);
       context.lineTo(x + (width - 1) * right_bottom_factor + q, y + (height - 1) * right_bottom_factor + q);
       context.lineTo(x + width - 1 - i, y + right_bottom_factor + i);
     }
     context.stroke();
  }
}

function drawBlocks()
{
   if (blocks_canvas.is_dirty)
   {
      var blocks_canvas_context = blocks_canvas.getContext("2d");
      blocks_canvas_context.clearRect(0, 0, windowCanvas.width, windowCanvas.height);
      for (var x = 0; x < blockArray_width; x++)
      {
         for (var y = 0; y < blockArray_height; y++)
         {
            blockArray[x][y].draw(blocks_canvas_context, x, y);
         }
      }
      blocks_canvas.is_dirty = false;
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
   setFontStyle(canvasContext, 0.45, "right", "top", 0.05 * windowCanvas.height, "sans-serif");
   writeText(canvasContext, windowCanvas.width, 0, "Lives: " + lives);
   setFontStyle(canvasContext, 0.45, "left", "top", 0.05 * windowCanvas.height, "sans-serif");
   writeText(canvasContext, 0, 0, "Score: " + score);
}

function drawLevel()
{
   canvasContext.clearRect(0, 0, windowCanvas.width, windowCanvas.height);
   drawBlocks();
   canvasContext.drawImage(ball_canvas, Math.floor(ball.location.x - ball.radius), Math.floor(ball.location.y - ball.radius));
   canvasContext.drawImage(panel_canvas, Math.floor(panel.location.x - panel.size.width / 2), Math.floor(panel.location.y));
   drawTextLayer();
}

function DrawCanvasGameOver()
{
   setFontStyle(canvasContext, 0.01, "center", "middle", 0.15 * windowCanvas.height, "sans-serif");
   writeText(canvasContext, windowCanvas.width / 2, windowCanvas.height / 2, "Game Over");
}

function BuildNewLevel()
{ 
   ball_panel_x_delta = 0;
   moveBall = moveBallWithPanel;
 
   blockArray_width = 20;
   blockArray_height = 17;
   static_hit_count = 50;
   
   block_width = windowCanvas.width / blockArray_width;
   block_height = windowCanvas.height / (2 * blockArray_height);    
    
   blockArray = createLevel(getLevelDefintion(current_level_index));
   
   blocks_canvas.is_dirty = true;
   
   current_level_index++;
   
   initRun();
}

function Game()
{
   function doNothing() {};
   
   this.currentScene = new Scene(this, doNothing, doNothing, doNothing, {});
   this.lastTimeStamp = 0;
   this.maximumAnimationTimeSpan = 20;
   
   this.getRequestAnimFrameFunction = function()
      {
         //These part copied from http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/:
         //shim layer with setTimeout fallback
         return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                function(callback) {
                      window.setTimeout(callback, 1000 / 60);
                  };
      };   
   
   window.requestAnimFrame = this.getRequestAnimFrameFunction();   
   this.getTimeSpan = function()
      {
         var timeStamp = Date.now();
         var timeSpan = timeStamp - this.lastTimeStamp;
         return Math.min(timeSpan, this.maximumAnimationTimeSpan); //To avoid greate jumps.
      };
   
   var owner = this;
   function loop()
      {
         owner.nextStep(owner.getTimeSpan());
         owner.lastTimeStamp = Date.now();
         window.requestAnimFrame(loop);
      };

   this.nextStep = function(deltaTime)
      {
         this.currentScene.calculateStep(deltaTime);
         this.currentScene.drawCanvas();
      };
      
   this.activate = function(scene)
      {
         //Remove the event handlers of the current scene.
         for (var eventName in this.currentScene.eventHandlers)
         {
            window.removeEventListener(eventName, this.currentScene.eventHandlers[eventName], false);
         }
         this.currentScene = scene;
         this.currentScene.init();
         //Add the event handlers of the current scene.
         for (var eventName in this.currentScene.eventHandlers)
         {
            window.addEventListener(eventName, this.currentScene.eventHandlers[eventName], false);
         }
      };
      
   loop();
}

function Scene(game, initScene, calculateStep, drawCanvas, eventHandlers)
{
   this.init = initScene;
   this.calculateStep = calculateStep;
   this.drawCanvas = drawCanvas;
   this.eventHandlers = eventHandlers;
   this.activate = function()
      {
         game.activate(this);
      };
}

function initRun()
{
   ball.location.x = 0;
   ball.location.y = panel.location.y - ball.radius;
   ball.speed.x = 0.00018 * windowCanvas.width;
   ball.speed.y = - 2 * ball.speed.x;
   panel.location.x = windowCanvas.width / 2;
   ball_panel_x_delta = 0;
   moveBall = moveBallWithPanel;
}

function onMouseMove(event)
{
   panel.location.x = Math.min(event.clientX, windowCanvas.width - panel.size.width / 2);
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
}

function onGameOverClick(event)
{
   startMenuScene.activate();
}

function NormalBlock(hue)
{
   this.isBlock = function() { return true; };
   this.draw = function(context, x, y)
      {
         var color   = "hsl(" + hue + ", 100%, 50%)";
         var color_l = "hsl(" + hue + ", 100%, 80%)";
         var color_d = "hsl(" + hue + ", 100%, 10%)";

         context.fillStyle = color;
         context.fillRect(  x * block_width + 2, y * block_height + 2, block_width - 4, block_height - 4);
         drawFrame(context, x * block_width,     y * block_height,     block_width,     block_height,     2, color_l, color_d);
         drawFrame(context, x * block_width + 4, y * block_height + 4, block_width - 8, block_height - 8, 1, color_d, color_l);
      };

   this.doCollisionEffect = function ()
      {
         this.isBlock = function() { return false; };
         this.draw = function(context, x, y) {};
         this.doCollisionEffect = function() { return false; };
         score = score + 50;
         blocks_canvas.is_dirty = true;
         blockCount--;
         return true;
      };
}

function CentralStaticFunctions()
{
   this.isBlock = function() { return true; };
   this.draw = function(context, hue, x, y)
      {
         var bgfade = context.createLinearGradient(x * block_width, y * block_height, x * block_width, (y + 1) * block_height - 1);

         var color =   "hsl(" + hue + ", 100%, 50%)";
         var color_l = "hsl(" + hue + ", 100%, 80%)";
         var color_d = "hsl(" + hue + ", 100%, 10%)";

         bgfade.addColorStop(0.4, color);
         bgfade.addColorStop(0.0, color_l);
         bgfade.addColorStop(1.0, color_d);
         context.fillStyle =  bgfade;
         context.fillRect(  x * block_width, y * block_height, block_width, block_height);
         context.strokeStyle = "#111111";
         context.strokeRect(x * block_width, y * block_height, block_width, block_height);
      };
   this.doCollisionEffect = function()
      {
         static_hit_count--;
         if (static_hit_count <= 0)
         {
            this.isBlock = function() { return false; };
            this.draw = function(context, x, y) {};
            this.doCollisionEffect = function() { return false; };
            score = score + staticBlockCount;
            blocks_canvas.is_dirty = true;
         }
         return true;
      };
}

function StaticBlock(hue, centralStaticFunctions)
{
   this.isBlock = function()
      {
         return centralStaticFunctions.isBlock();
      }
   this.draw = function(context, x, y)
      {
         centralStaticFunctions.draw(context, hue, x, y);
      };
   this.doCollisionEffect = function()
      {
         return centralStaticFunctions.doCollisionEffect();
      };
}

function NoneBlock()
{
   this.isBlock = function() { return false; };
   this.draw = function(context, x, y) {};
   this.doCollisionEffect = function() { return false; };
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

   var blockThresholdValue  = values[Math.floor((values.length - 1) * 0.4)];
   var staticThresholdValue = values[Math.floor((values.length - 1) * 0.1)];
   var max = values[0];
   
   var centralStaticFunctions = new CentralStaticFunctions();
   blockCount = 0;
   staticBlockCount = 0;
   for (var x = 0; x < blockArray_width; x++)
   {
      for (var y = 0; y < blockArray_height; y++)
      {
         value = blockArray[x][y];
         if (value <= blockThresholdValue)
         {
            blockArray[x][y] = new NoneBlock();
            continue;
         }
         var hue = (((value - blockThresholdValue) / (max - blockThresholdValue)) * levelDescription.hueRange + levelDescription.hueOffset);
         if (value > staticThresholdValue)
         {
            blockArray[x][y] = new StaticBlock(hue, centralStaticFunctions);
            staticBlockCount++;
            continue;
         }
         blockArray[x][y] = new NormalBlock(hue);
         blockCount++;
         continue;
      }
   }

   return blockArray;
}

function sqr(a) { return a * a; }

function createCanvas(size)
{
   var canvas = document.createElement("canvas");
   canvas.width = size.width;
   canvas.height = size.height;
   return canvas;
}

function createScenes(game)
{
   startMenuScene = new Scene(game, function() {current_level_index = 0; lives = 3; score = 0;}, doNothing, drawStartMenu, {click: onMenuClick});
   playScene      = new Scene(game, BuildNewLevel, calculatePlayScene, drawLevel, {mousemove: onMouseMove, click: onClick});
   gameOverScene  = new Scene(game, doNothing, doNothing, DrawCanvasGameOver, {click: onGameOverClick});
}

function createSprites()
{
   blocks_canvas = createCanvas(windowCanvas);
   panel_canvas = createCanvas(panel.size);
   drawPanel(panel_canvas.getContext("2d"), 0, 0, panel.size.width, panel.size.height);
   ball_canvas = createCanvas(new Size(ball.radius * 2, ball.radius * 2));
   drawBall(ball_canvas.getContext("2d"), 0, 0, ball.radius);
}

function Start()
{  
   windowCanvas = document.getElementById("myCanvas");
   canvasContext = windowCanvas.getContext("2d");

   panel = {location: {x:0, y:0.95 * windowCanvas.height}, size: new Size(0.1 * windowCanvas.width, 0.02 * windowCanvas.height)};
   ball  = {location: {x:0, y:0},   speed: {x:0, y:0}, radius:0.01 * windowCanvas.height};
   maximumSpeed = 0.0008 * windowCanvas.width;
   
   var game = new Game();
   createScenes(game);
   createSprites();
   
   startMenuScene.activate();
}

function doNothing() {}

function GetRequestAnimFrameFunction() {
    //These part copied from http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/:
    //shim layer with setTimeout fallback
   return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
}

Start();