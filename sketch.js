let grid = [];
let cols, rows;
let size = 10;

let handPose;
let video;
let hands = [];
let options = { flipped: true };

let trapBlocks = [];
let trapTimer = 0;
let usedCells = [];
let coinMeta = {};
let score = 0;
let survivedCount = 0;
let gameStartTime;
let gameStarted = false;
let gameTriggered = false;
let gameEnded = false;
let countdownStart = null;
let totalGameTime = 50;

let endScreenImg;

function preload() {
  handPose = ml5.handPose(options);
  endScreenImg = loadImage("endScreen.png");
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO, { flipped: true });
  video.size(640, 480);
  video.hide();
  handPose.detectStart(video, gotHands);

  cols = floor(width / size);
  rows = floor(height / size);
  for (let i = 0; i < cols; i++) {
    grid[i] = [];
    for (let j = 0; j < rows; j++) {
      grid[i][j] = 0;
    }
  }
}

function draw() {
  background(0);
  image(video, 0, 0, width, height);

  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    let indexFinger = hand.keypoints[8];
    if (!gameTriggered) {
      gameTriggered = true;
      countdownStart = millis();
    }
    if (gameStarted) {
      addCoins(indexFinger.x, indexFinger.y);
    }
  }

  if (!gameStarted && gameTriggered) {
    let countdown = 3 - floor((millis() - countdownStart) / 1000);
    if (countdown > 0) {
      displayCountdown(countdown);
      return;
    } else {
      gameStarted = true;
      gameStartTime = millis();
    }
  }

  if (!gameStarted && !gameTriggered) {
    displayStartScreen();
    return;
  }

  let elapsedTime = (millis() - gameStartTime) / 1000;
  let remainingTime = totalGameTime - elapsedTime;
  if (remainingTime <= 0) {
    endGame();
    return;
  }

  handleTrap();
  drawRect();

  let nextGrid = [];
  for (let i = 0; i < cols; i++) {
    nextGrid[i] = [];
    for (let j = 0; j < rows; j++) {
      nextGrid[i][j] = 0;
    }
  }

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let state = grid[i][j];
      if (state > 0) {
        if (j + 1 < rows) {
          let below = grid[i][j + 1];
          let dir = random() < 0.5 ? 1 : -1;
          let belowDiag;
          if (i + dir >= 0 && i + dir <= cols - 1) {
            belowDiag = grid[i + dir][j + 1];
          }

          if (below == 0) {
            nextGrid[i][j + 1] = state;
          } else if (belowDiag == 0) {
            nextGrid[i + dir][j + 1] = state;
          } else {
            nextGrid[i][j] = state;
          }
        } else {
          nextGrid[i][j] = state;
        }
      }
    }
  }

  grid = nextGrid;
  updateScore();
  drawExplosion();
  displayScoreAndTime(remainingTime);
}

function addCoins(fingerX, fingerY) {
  let x = floor(fingerX / size);
  let y = floor(fingerY / size);
  x = constrain(x, 0, cols - 1);
  y = constrain(y, 0, rows - 1);
  grid[x][y] = (frameCount % 205) + 50;
  usedCells.push({ x, y });
  coinMeta[`${x},${y}`] = frameCount;
}

function updateScore() {
  for (let key in coinMeta) {
    let [x, y] = key.split(',').map(Number);
    if (frameCount - coinMeta[key] > 600) {
      survivedCount++;
      delete coinMeta[key];
      grid[x][y] = 0;
    }
  }

  if (survivedCount >= 10) {
    score++;
    survivedCount = 0;
  }
}

function displayScoreAndTime(remainingTime) {
  fill(255);
  textSize(24);
  textAlign(LEFT, TOP);
  text(`Score: ${score}`, 10, 10);
  text(`Time: ${remainingTime.toFixed(1)}s`, 10, 40);
}

function displayStartScreen() {
  textAlign(CENTER, CENTER);
  textSize(48);
  fill(255);
  noStroke();
  text("遊戲開始！", width / 2, height / 2);

  textSize(24);
  text("請伸出食指以開始遊戲", width / 2, height / 2 + 80);

  stroke(255);
  noFill();
  rectMode(CENTER);
  rect(width / 2, height / 2, 300, 100);
}

function displayCountdown(count) {
  textAlign(CENTER, CENTER);
  textSize(96);
  fill(255, 255, 0);
  noStroke();
  text(count, width / 2, height / 2);
}

function endGame() {
  gameEnded = true;
  noLoop(); // 停止遊戲循環

  imageMode(CORNER);
  image(endScreenImg, 0, 0, width, height); // 顯示結束畫面的圖片

  textAlign(CENTER, CENTER);
  textSize(36);
  fill(255);
  noStroke();

  let rating;
  let unlockedPhrase;
  if (score >= 10 && score <= 20) {
    rating = "新手玩家";
    unlockedPhrase = "教育";
  } else if (score >= 21 && score <= 35) {
    rating = "中級玩家";
    unlockedPhrase = "教育科技";
  } else if (score >= 36) {
    rating = "高手玩家";
    unlockedPhrase = "教育科技學系";
  } else {
    rating = "未達標";
    unlockedPhrase = "未解鎖";
  }

  // 顯示評級與解鎖詞彙
  text(`評級：${rating}`, width / 2, height / 2 + 20);
  text(`解鎖詞彙：${unlockedPhrase}`, width / 2, height / 2 + 80);

  // 新增「重新開始」按鈕並美化
  let restartButton = createButton("重新開始");
  restartButton.position(width / 2 - 75, height / 2 + 120); // 調整位置
  restartButton.size(150, 50); // 放大按鈕尺寸
  restartButton.style("background-color", "#FFD700"); // 設定黃色背景
  restartButton.style("color", "#000000"); // 設定黑色文字
  restartButton.style("border", "none"); // 移除邊框
  restartButton.style("border-radius", "10px"); // 圓角邊框
  restartButton.style("box-shadow", "0px 4px 6px rgba(0, 0, 0, 0.3)"); // 陰影效果
  restartButton.style("cursor", "pointer"); // 滑鼠指到時變手形
  restartButton.style("font-size", "18px"); // 調整文字大小
  restartButton.style("font-weight", "bold"); // 加粗文字
  restartButton.mousePressed(resetGame); // 綁定重設遊戲事件
}

function resetGame() {
  // 重設遊戲狀態
  gameStarted = false;
  gameTriggered = false;
  gameEnded = false;
  countdownStart = null;
  score = 0;
  survivedCount = 0;
  usedCells = [];
  trapBlocks = [];
  coinMeta = {};

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      grid[i][j] = 0;
    }
  }

  // 移除 restartButton
  let restartButton = select("button");
  if (restartButton) {
    restartButton.remove();
  }

  loop(); // 重新開始 draw()
}

function handleTrap() {
  let elapsedTime = (millis() - gameStartTime) / 1000;
  let trapInterval = max(15, 60 - floor(elapsedTime));

  trapTimer++;
  if (trapTimer % trapInterval === 0) {
    let filteredCells = usedCells.filter((cell) => cell.y >= floor(rows * 0.5));
    if (filteredCells.length === 0) filteredCells = usedCells;

    if (filteredCells.length > 0) {
      let randomIndex = floor(random(filteredCells.length));
      let trapX = filteredCells[randomIndex].x;
      let trapY = filteredCells[randomIndex].y;

      let trapSize = floor(random(3, 11));

      trapX = constrain(trapX, 0, cols - trapSize);
      trapY = constrain(trapY, 0, rows - trapSize);

      trapBlocks.push({
        x: trapX,
        y: trapY,
        size: trapSize,
        startFrame: frameCount,
        explosionFrame: null,
      });
    }
  }

  trapBlocks = trapBlocks.filter((block) => {
    if (block.explosionFrame && frameCount - block.explosionFrame > 15) {
      for (let i = block.x; i < block.x + block.size; i++) {
        for (let j = block.y; j < block.y + block.size; j++) {
          grid[i][j] = 0;
        }
      }
      return false;
    }

    if (!block.explosionFrame && frameCount - block.startFrame > 20) {
      block.explosionFrame = frameCount;
    }

    return true;
  });
}

function drawExplosion() {
  for (let block of trapBlocks) {
    if (block.explosionFrame) {
      let elapsedFrames = frameCount - block.explosionFrame;
      let radius = map(elapsedFrames, 0, 15, 20, 60);
      let alpha = map(elapsedFrames, 0, 15, 255, 0);
      noFill();
      stroke(255, 0, 0, alpha);
      strokeWeight(4);
      ellipse(
        (block.x + block.size / 2) * size,
        (block.y + block.size / 2) * size,
        radius * 2
      );
    }
  }
}

function drawRect() {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (grid[i][j] > 0) {
        noStroke();
        let brightness = map(sin(frameCount * 0.1), -1, 1, 200, 255);
        let isInTrap = trapBlocks.some((block) => {
          return (
            i >= block.x &&
            i < block.x + block.size &&
            j >= block.y &&
            j < block.y + block.size &&
            (frameCount - block.startFrame) % 20 < 10
          );
        });

        fill(isInTrap ? color(255, 0, 0, brightness) : color(255, 223, 0, brightness));
        ellipse(i * size + size / 2, j * size + size / 2, size, size);
        push();
        translate(i * size + size / 2, j * size + size / 2);
        let angle = sin(frameCount * 0.2) * PI / 4;
        rotate(angle);
        fill(0);
        rectMode(CENTER);
        rect(0, 0, size / 3, size / 3);
        pop();
      }
    }
  }
}

function gotHands(results) {
  hands = results;
}
