<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>طبقه منفی سه</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            -webkit-user-select: none;
        }

        body {
            width: 100vw;
            height: 100vh;
            height: 100dvh;
            overflow: hidden;
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        #game-container {
            position: relative;
            width: 100%;
            height: 100%;
            max-width: 500px;
            overflow: hidden;
            background: #111;
        }

        .background-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            z-index: 0;
            transition: opacity 0.8s ease;
        }

        .dialogue-box {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            min-height: 130px;
            background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 70%, transparent 100%);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            padding: 25px 20px 35px;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            cursor: pointer;
            z-index: 10;
            transition: opacity 0.3s;
            border-top: 1px solid rgba(255,255,255,0.1);
        }

        .dialogue-text {
            color: #ffffff;
            font-size: 18px;
            line-height: 1.8;
            text-shadow: 0 0 10px rgba(0,0,0,0.8);
            width: 100%;
            text-align: right;
            padding-left: 10px;
            font-weight: 400;
            min-height: 60px;
        }

        .dialogue-text .danger {
            color: #ff3333;
            font-weight: bold;
        }

        .killer-image {
            position: absolute;
            bottom: 140px;
            right: 15px;
            width: 120px;
            height: 120px;
            border-radius: 16px;
            background-size: cover;
            background-position: center;
            border: 2px solid rgba(255,255,255,0.5);
            box-shadow: 0 0 25px rgba(0,0,0,0.8);
            z-index: 14;
            opacity: 0;
            transition: opacity 0.4s, transform 0.4s;
            transform: translateY(20px);
            pointer-events: none;
        }
        .killer-image.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .popup-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.75);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20;
            cursor: pointer;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.4s;
        }
        .popup-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }

        .popup-content {
            background: #f5f0e6;
            border: 2px solid #8b5a2b;
            box-shadow: 0 0 30px rgba(0,0,0,0.7);
            padding: 25px 20px;
            border-radius: 8px;
            width: 85%;
            max-width: 380px;
            text-align: center;
            font-family: 'Georgia', 'Times New Roman', serif;
            position: relative;
        }

        .popup-content input {
            width: 100%;
            padding: 10px;
            font-size: 18px;
            border: 1px solid #8b5a2b;
            border-radius: 6px;
            text-align: center;
            margin: 10px 0;
            font-family: 'Segoe UI', sans-serif;
        }

        .popup-content button {
            background: #8b5a2b;
            color: white;
            border: none;
            padding: 10px 30px;
            font-size: 16px;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Segoe UI', sans-serif;
        }

        .close-hint {
            margin-top: 15px;
            font-size: 12px;
            color: #777;
            font-family: 'Segoe UI', sans-serif;
        }

        .choices-container {
            position: absolute;
            bottom: 170px;
            left: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            z-index: 16;
            padding: 0 20px;
            pointer-events: none;
        }
        .choices-container.active {
            pointer-events: auto;
        }

        .choice-btn {
            width: 100%;
            max-width: 350px;
            padding: 14px;
            background: rgba(20,20,20,0.85);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 10px;
            color: #fff;
            font-size: 16px;
            cursor: pointer;
            text-align: center;
            opacity: 0.01;
            transform: translateY(15px);
            transition: opacity 0.3s, transform 0.3s, background 0.2s;
        }
        .choice-btn.show {
            opacity: 1;
            transform: translateY(0);
        }
        .choice-btn:active {
            background: rgba(200,200,200,0.5);
            border-color: #fff;
            transform: scale(0.96);
        }

        .blood-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(180,0,0,0.85) 0%, rgba(80,0,0,0.9) 100%);
            z-index: 25;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s;
        }
        .blood-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }
        .death-message {
            font-size: 32px;
            font-weight: bold;
            color: #fff;
            text-shadow: 0 0 30px #ff0000, 0 0 60px #aa0000;
            text-align: center;
            padding: 20px;
        }

        .click-indicator {
            position: absolute;
            bottom: 160px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255,255,255,0.6);
            font-size: 12px;
            z-index: 12;
            pointer-events: none;
            transition: opacity 0.2s;
        }

        .tutorial-box {
            position: absolute;
            top: 40%;
            left: 10%;
            width: 80%;
            background: rgba(0,0,0,0.9);
            border: 1px solid #ffd966;
            border-radius: 12px;
            padding: 20px;
            color: #fff;
            text-align: center;
            z-index: 30;
            cursor: pointer;
            backdrop-filter: blur(5px);
            box-shadow: 0 0 20px rgba(0,0,0,0.8);
        }
        .tutorial-text {
            font-size: 17px;
            line-height: 2;
        }
        .tutorial-text .yellow {
            color: #ffd966;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div id="game-container">
        <div class="background-layer" id="bg1" style="background-image: url('./Background.jpg'); opacity: 1;"></div>
        <div class="background-layer" id="bg2" style="background-image: url('./Background2.jpg'); opacity: 0;"></div>

        <div class="killer-image" id="killerImg"></div>

        <div class="popup-overlay" id="letterPopup">
            <div class="popup-content">
                <div class="letter-text">
                    "به طبقه منفی سه خوش اومدی<br>زنده بمون"
                </div>
                <div class="close-hint">برای ادامه ضربه بزنید</div>
            </div>
        </div>

        <div class="popup-overlay" id="caseFilePopup">
            <div class="popup-content">
                <div class="file-text">
                    ⚠️ قاتل زنجیره‌ای<br>
                    اهداف: مردان و زنان مجرد<br>
                    الگوی قتل: تیکه تیکه کردن
                </div>
                <div class="close-hint">برای بستن پرونده ضربه بزنید</div>
            </div>
        </div>

        <div class="popup-overlay" id="namePopup">
            <div class="popup-content">
                <p style="margin-bottom:10px; font-weight:bold;">اسمت رو وارد کن:</p>
                <input type="text" id="nameInput" placeholder="اسمت چیه؟" autocomplete="off">
                <br>
                <button id="nameSubmit">تأیید</button>
            </div>
        </div>

        <div class="blood-overlay" id="bloodOverlay">
            <div class="death-message" id="deathMsg"></div>
        </div>

        <div class="dialogue-box" id="dialogueBox">
            <div class="dialogue-text" id="dialogueText"></div>
        </div>

        <div class="choices-container" id="choicesContainer"></div>
        <div class="click-indicator" id="clickHint">▼ برای ادامه ضربه بزنید ▼</div>
    </div>

    <script>
        (function() {
            // مسیر فایل‌های تصویری
            const BG1_URL = './Background.jpg';
            const BG2_URL = './Background2.jpg';
            const KILLER_BLACK_URL = './killerblack.png';
            const KILLER_URL = './killer.png';
            const KILLER2_URL = './killer2.png';
            const KILLER3_URL = './killer3.png';

            let userName = "";
            let isPopupActive = false;
            let isTyping = false;
            let typingInterval = null;
            let currentFullText = "";
            let currentNode = null;
            let nextNodeId = null; // ذخیره next برای کلیک روی dialogueBox
            let tutorialSeen = sessionStorage.getItem('tutorialSeen') === 'true';

            const dialogueBox = document.getElementById('dialogueBox');
            const dialogueText = document.getElementById('dialogueText');
            const letterPopup = document.getElementById('letterPopup');
            const caseFilePopup = document.getElementById('caseFilePopup');
            const namePopup = document.getElementById('namePopup');
            const nameInput = document.getElementById('nameInput');
            const nameSubmit = document.getElementById('nameSubmit');
            const clickHint = document.getElementById('clickHint');
            const choicesContainer = document.getElementById('choicesContainer');
            const killerImg = document.getElementById('killerImg');
            const bloodOverlay = document.getElementById('bloodOverlay');
            const deathMsg = document.getElementById('deathMsg');
            const bg1 = document.getElementById('bg1');
            const bg2 = document.getElementById('bg2');
            const gameContainer = document.getElementById('game-container');

            function typeText(element, text, onComplete) {
                if (typingInterval) clearInterval(typingInterval);
                element.textContent = "";
                currentFullText = text;
                let index = 0;
                isTyping = true;
                typingInterval = setInterval(() => {
                    if (index < text.length) {
                        element.textContent += text.charAt(index);
                        index++;
                    } else {
                        clearInterval(typingInterval);
                        typingInterval = null;
                        isTyping = false;
                        if (onComplete) onComplete();
                    }
                }, 40);
            }

            function skipTyping() {
                if (isTyping && typingInterval) {
                    clearInterval(typingInterval);
                    typingInterval = null;
                    dialogueText.textContent = currentFullText;
                    isTyping = false;
                }
            }

            function setBackground(bgName, callback) {
                if (bgName === 'default') {
                    bg1.style.opacity = '1';
                    bg2.style.opacity = '0';
                    if (callback) setTimeout(callback, 800);
                } else if (bgName === 'inside') {
                    bg1.style.opacity = '0';
                    bg2.style.opacity = '1';
                    if (callback) setTimeout(callback, 800);
                } else if (bgName === 'black') {
                    bg1.style.opacity = '0';
                    bg2.style.opacity = '0';
                    gameContainer.style.backgroundColor = '#000';
                    if (callback) setTimeout(callback, 400);
                }
            }

            function showKiller(imageUrl) {
                if (!imageUrl) {
                    killerImg.classList.remove('visible');
                    killerImg.style.backgroundImage = '';
                    return;
                }
                killerImg.style.backgroundImage = `url('${imageUrl}')`;
                killerImg.classList.add('visible');
            }

            function hideKiller() {
                killerImg.classList.remove('visible');
            }

            function showChoices(choices) {
                choicesContainer.innerHTML = '';
                choices.forEach((choice, idx) => {
                    const btn = document.createElement('div');
                    btn.className = 'choice-btn';
                    btn.textContent = choice.text;
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        clearChoices();
                        if (choice.next) goToNode(choice.next);
                    });
                    choicesContainer.appendChild(btn);
                    setTimeout(() => btn.classList.add('show'), idx * 80);
                });
                choicesContainer.classList.add('active');
                clickHint.style.display = 'none';
            }

            function clearChoices() {
                choicesContainer.innerHTML = '';
                choicesContainer.classList.remove('active');
            }

            function showBloodAndDeath(message) {
                deathMsg.textContent = message;
                bloodOverlay.classList.add('active');
                bloodOverlay.addEventListener('click', function restart() {
                    bloodOverlay.removeEventListener('click', restart);
                    bloodOverlay.classList.remove('active');
                    resetGame();
                });
            }

            function showWinScreen(message) {
                const winDiv = document.createElement('div');
                winDiv.style.position = 'absolute';
                winDiv.style.top = '50%';
                winDiv.style.left = '50%';
                winDiv.style.transform = 'translate(-50%, -50%)';
                winDiv.style.background = 'rgba(0,0,0,0.8)';
                winDiv.style.color = '#ffd700';
                winDiv.style.fontSize = '24px';
                winDiv.style.padding = '20px 30px';
                winDiv.style.borderRadius = '12px';
                winDiv.style.zIndex = '30';
                winDiv.style.textAlign = 'center';
                winDiv.textContent = message;
                gameContainer.appendChild(winDiv);
                winDiv.addEventListener('click', () => {
                    winDiv.remove();
                    resetGame();
                });
            }

            function showTutorial() {
                const tutorialDiv = document.createElement('div');
                tutorialDiv.className = 'tutorial-box';
                tutorialDiv.innerHTML = `
                    <div class="tutorial-text">
                        <span class="yellow">● متن زرد:</span> حرف شخص دیگر<br>
                        <span style="color:#fff;">● متن سفید:</span> حرف‌های تو
                    </div>
                    <div class="close-hint" style="margin-top:15px;">برای ادامه ضربه بزنید</div>
                `;
                gameContainer.appendChild(tutorialDiv);
                tutorialDiv.addEventListener('click', () => {
                    tutorialDiv.remove();
                    sessionStorage.setItem('tutorialSeen', 'true');
                    tutorialSeen = true;
                    goToNode('start');
                });
            }

            function resetGame() {
                clearChoices();
                hideKiller();
                bloodOverlay.classList.remove('active');
                gameContainer.style.backgroundColor = '#111';
                setBackground('default');
                userName = "";
                isPopupActive = false;
                if (typingInterval) clearInterval(typingInterval);
                typingInterval = null;
                isTyping = false;
                dialogueText.textContent = "";
                clickHint.style.display = 'block';
                dialogueBox.style.opacity = '1';
                nextNodeId = null;
                const extra = document.querySelector('#game-container > div:not([class])');
                if (extra) extra.remove();
                if (!tutorialSeen) {
                    showTutorial();
                } else {
                    goToNode('start');
                }
            }

            const storyNodes = {
                start: {
                    type: 'dialogue',
                    text: "من کجام؟",
                    next: 'dialogue2'
                },
                dialogue2: {
                    type: 'dialogue',
                    text: "اینجا کجاست؟",
                    next: 'dialogue3'
                },
                dialogue3: {
                    type: 'dialogue',
                    text: "اون نامه و پرونده چیه روی زمین؟",
                    next: 'showLetter'
                },
                showLetter: {
                    type: 'popup',
                    popup: 'letter',
                    next: 'afterLetter'
                },
                afterLetter: {
                    type: 'dialogue',
                    text: "این چه کوفتیه؟... این پرونده چیه؟",
                    next: 'showCaseFile'
                },
                showCaseFile: {
                    type: 'popup',
                    popup: 'casefile',
                    next: 'soundEffect'
                },
                soundEffect: {
                    type: 'dialogue',
                    text: "ترق... ترق",
                    next: 'whatSound'
                },
                whatSound: {
                    type: 'dialogue',
                    text: "این صدای چیه؟",
                    next: 'firstChoice'
                },
                firstChoice: {
                    type: 'choices',
                    choices: [
                        { text: "قایم شدن توی کمد", next: 'hideCloset' },
                        { text: "همینجا ایستادن", next: 'standStill' },
                        { text: "موش مردگی روی تخت", next: 'playDead' }
                    ]
                },
                hideCloset: {
                    type: 'function',
                    func: () => {
                        setBackground('inside', () => {
                            showKiller(KILLER_BLACK_URL);
                            goToNode('killerSays1');
                        });
                    }
                },
                killerSays1: {
                    type: 'dialogue',
                    text: "به من گفته بودن اینجا یک دختر خانم هست",
                    speaker: 'killer',
                    next: 'killerSays2'
                },
                killerSays2: {
                    type: 'dialogue',
                    text: "کجایی؟",
                    speaker: 'killer',
                    next: 'closetChoices'
                },
                closetChoices: {
                    type: 'choices',
                    choices: [
                        { text: "حمله از پشت", next: 'deathAttack' },
                        { text: "بیرون اومدن", next: 'comeOut' },
                        { text: "موندن توی کمد", next: 'stayCloset' }
                    ]
                },
                deathAttack: { type: 'death', message: "قاتل فهمید و تورو کشت" },
                comeOut: {
                    type: 'function',
                    func: () => {
                        setBackground('default', () => {
                            showKiller(KILLER_URL);
                            goToNode('killerFoundYou');
                        });
                    }
                },
                killerFoundYou: {
                    type: 'dialogue',
                    text: "پس اینجایی",
                    speaker: 'killer',
                    next: 'askName'
                },
                stayCloset: {
                    type: 'function',
                    func: () => {
                        dialogueText.innerHTML = '<span class="danger">قاتل تورو پیدا کرد</span>';
                        setTimeout(() => {
                            setBackground('default', () => {
                                showKiller(KILLER_URL);
                                dialogueText.textContent = '';
                                goToNode('killerFoundYou2');
                            });
                        }, 1500);
                    }
                },
                killerFoundYou2: {
                    type: 'dialogue',
                    text: "پس اینجا بودی",
                    speaker: 'killer',
                    next: 'askName'
                },
                standStill: {
                    type: 'function',
                    func: () => {
                        showKiller(KILLER_URL);
                        goToNode('killerBeautiful');
                    }
                },
                killerBeautiful: {
                    type: 'dialogue',
                    text: "چه خانم زیبایی... اسمت چیه",
                    speaker: 'killer',
                    next: 'getNameStand'
                },
                getNameStand: {
                    type: 'getName',
                    next: 'killerCollection'
                },
                killerCollection: {
                    type: 'dialogue',
                    text: () => `چه اسم قشنگی ، بدم نمیاد تورو به کلکسیونم اضافه کنم`,
                    speaker: 'killer',
                    next: 'standChoices'
                },
                standChoices: {
                    type: 'choices',
                    choices: [
                        { text: "فرار", next: 'deathRun' },
                        { text: "ترسیدن", next: 'deathScared' },
                        { text: "لبخند", next: 'smile' }
                    ]
                },
                deathRun: { type: 'death', message: "کوشته شدی" },
                deathScared: { type: 'death', message: "کوشته شدی" },
                smile: {
                    type: 'function',
                    func: () => {
                        showKiller(KILLER3_URL);
                        goToNode('killerInteresting');
                    }
                },
                killerInteresting: {
                    type: 'dialogue',
                    text: "چه واکنش جالبی",
                    speaker: 'killer',
                    next: 'smileChoices'
                },
                smileChoices: {
                    type: 'choices',
                    choices: [
                        { text: "برو به درک", next: 'deathGoToHell' },
                        { text: "از مرگ نمیترسم", next: 'notAfraidSmile' }
                    ]
                },
                deathGoToHell: { type: 'death', message: "کوشته شدی" },
                notAfraidSmile: {
                    type: 'function',
                    func: () => {
                        showKiller(KILLER_URL);
                        goToNode('killerLikeSmile');
                    }
                },
                killerLikeSmile: {
                    type: 'dialogue',
                    text: "خوشم اومد ، تورو نمیکشم",
                    speaker: 'killer',
                    next: 'winStand'
                },
                winStand: {
                    type: 'win',
                    message: "تبریک ، زنده رفتی طبقه منفی دو"
                },
                playDead: {
                    type: 'function',
                    func: () => {
                        setBackground('black', () => {
                            goToNode('killerPathetic');
                        });
                    }
                },
                killerPathetic: {
                    type: 'dialogue',
                    text: "چه رقت انگیز",
                    speaker: 'killer',
                    next: 'deathPathetic'
                },
                deathPathetic: { type: 'death', message: "کوشته شدی" },
                askName: {
                    type: 'dialogue',
                    text: "چه دختر زیبایی ، اسمت چیه دختر زیبا؟",
                    speaker: 'killer',
                    next: 'getNameHide'
                },
                getNameHide: {
                    type: 'getName',
                    next: 'killerNiceName'
                },
                killerNiceName: {
                    type: 'dialogue',
                    text: () => `${userName}... چه اسم قشنگی`,
                    speaker: 'killer',
                    next: 'killerHowDie'
                },
                killerHowDie: {
                    type: 'function',
                    func: () => {
                        showKiller(KILLER2_URL);
                        goToNode('killerHowDieText');
                    }
                },
                killerHowDieText: {
                    type: 'dialogue',
                    text: "چطور میخوای بمیری؟",
                    speaker: 'killer',
                    next: 'dieChoices'
                },
                dieChoices: {
                    type: 'choices',
                    choices: [
                        { text: "فرار", next: 'deathRun2' },
                        { text: "بی واکنش", next: 'noReaction' }
                    ]
                },
                deathRun2: { type: 'death', message: "کوشته شدی" },
                noReaction: {
                    type: 'function',
                    func: () => {
                        showKiller(KILLER3_URL);
                        goToNode('killerNotScared');
                    }
                },
                killerNotScared: {
                    type: 'dialogue',
                    text: "نترسیدی؟",
                    speaker: 'killer',
                    next: 'playerNotScared'
                },
                playerNotScared: {
                    type: 'dialogue',
                    text: "نه",
                    speaker: 'player',
                    next: 'killerWhy'
                },
                killerWhy: {
                    type: 'function',
                    func: () => {
                        showKiller(KILLER_URL);
                        goToNode('killerWhyText');
                    }
                },
                killerWhyText: {
                    type: 'dialogue',
                    text: "چرا؟",
                    speaker: 'killer',
                    next: 'whyChoices'
                },
                whyChoices: {
                    type: 'choices',
                    choices: [
                        { text: "برو به درک", next: 'deathGoToHell2' },
                        { text: "از مرگ نمیترسم", next: 'notAfraidFinal' }
                    ]
                },
                deathGoToHell2: { type: 'death', message: "کوشته شدی" },
                notAfraidFinal: {
                    type: 'function',
                    func: () => {
                        showKiller(KILLER3_URL);
                        goToNode('killerHmm');
                    }
                },
                killerHmm: {
                    type: 'dialogue',
                    text: "هوم...",
                    speaker: 'killer',
                    next: 'killerDecision'
                },
                killerDecision: {
                    type: 'dialogue',
                    text: "تصمیم گرفتم تورو نکشم",
                    speaker: 'killer',
                    next: 'winHide'
                },
                winHide: {
                    type: 'win',
                    message: "از این طبقه فرار کردی"
                }
            };

            function goToNode(nodeId) {
                const node = storyNodes[nodeId];
                if (!node) return;
                currentNode = node;
                nextNodeId = node.next || null;
                clearChoices();
                clickHint.style.display = 'none';
                dialogueBox.style.opacity = '1';

                switch (node.type) {
                    case 'dialogue':
                        const txt = typeof node.text === 'function' ? node.text() : node.text;
                        typeText(dialogueText, txt, () => {
                            if (nextNodeId && choicesContainer.children.length === 0) {
                                clickHint.style.display = 'block';
                            }
                        });
                        dialogueText.style.color = node.speaker === 'killer' ? '#ffd966' : '#fff';
                        break;

                    case 'choices':
                        nextNodeId = null;
                        showChoices(node.choices);
                        break;

                    case 'popup':
                        isPopupActive = true;
                        nextNodeId = null;
                        dialogueBox.style.opacity = '0';
                        clickHint.style.display = 'none';
                        if (node.popup === 'letter') {
                            letterPopup.classList.add('active');
                            letterPopup.onclick = () => {
                                letterPopup.classList.remove('active');
                                letterPopup.onclick = null;
                                isPopupActive = false;
                                if (node.next) goToNode(node.next);
                            };
                        } else if (node.popup === 'casefile') {
                            caseFilePopup.classList.add('active');
                            caseFilePopup.onclick = () => {
                                caseFilePopup.classList.remove('active');
                                caseFilePopup.onclick = null;
                                isPopupActive = false;
                                if (node.next) goToNode(node.next);
                            };
                        }
                        break;

                    case 'getName':
                        isPopupActive = true;
                        nextNodeId = null;
                        namePopup.classList.add('active');
                        nameInput.value = '';
                        nameInput.focus();
                        const submitHandler = () => {
                            const name = nameInput.value.trim();
                            if (name) {
                                userName = name;
                                namePopup.classList.remove('active');
                                isPopupActive = false;
                                nameSubmit.removeEventListener('click', submitHandler);
                                if (node.next) goToNode(node.next);
                            }
                        };
                        nameSubmit.onclick = submitHandler;
                        nameInput.onkeypress = (e) => { if (e.key === 'Enter') submitHandler(); };
                        break;

                    case 'death':
                        nextNodeId = null;
                        showBloodAndDeath(node.message);
                        break;

                    case 'win':
                        nextNodeId = null;
                        showWinScreen(node.message);
                        break;

                    case 'function':
                        nextNodeId = null;
                        node.func();
                        break;
                }
            }

            // کلیک اصلی روی کادر دیالوگ
            dialogueBox.addEventListener('click', () => {
                if (isPopupActive) return;
                
                if (isTyping) {
                    skipTyping();
                    return;
                }
                
                if (nextNodeId && choicesContainer.children.length === 0) {
                    const next = nextNodeId;
                    nextNodeId = null;
                    clickHint.style.display = 'none';
                    goToNode(next);
                }
            });

            // شروع بازی
            if (!tutorialSeen) {
                setBackground('default');
                showTutorial();
            } else {
                setBackground('default');
                goToNode('start');
            }
        })();
    </script>
</body>
</html>
