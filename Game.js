import { Player } from './Player.js';
import { Input } from './input.js';
import { overlaps } from './collision.js';
import { generateLevel } from './level.js';

const W = 960, H = 540;
export class Game {
  constructor(canvas) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.input=new Input(); this.player=new Player();
    this.best=this.loadBest(); this.state='ready'; this.lastTime=null; this.rafId=null;
    this.stars=Array.from({length:70},(_,i)=>({x:(i*137+31)%W,y:(i*83+17)%330,r:(i%3)*.45+.45,a:.25+(i%5)*.1}));
    this.bindUI(); this.newRun(false);
  }
  bindUI() {
    this.startButton=document.querySelector('#startBtn');
    this.pauseButton=document.querySelector('#pauseBtn');
    this.message=document.querySelector('#message'); this.hud=document.querySelector('#hudPill');
    this.startButton.addEventListener('click',()=>this.start());
    this.pauseButton.addEventListener('click',()=>this.togglePause());
    document.querySelector('#restartBtn').addEventListener('click',()=>{
      // A completed level is never credited twice.
      if(this.state==='cleared') this.level++;
      this.loadLevel(); this.state='ready'; this.start();
    });
    document.querySelector('#newRunBtn').addEventListener('click',()=>this.newRun(true));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
    window.addEventListener('blur',()=>this.pause());
  }
  newRun(play=true) {
    this.seed=Math.floor(Math.random()*4294967296);
    this.level=1; this.delivered=0; this.loadLevel(); this.state='ready';
    if(play)this.start();
    else {
      this.pauseButton.disabled=true;
      this.showMessage('БЕСКОНЕЧНЫЙ МАРШРУТ','Доставка без границ',
        'Собирай три письма и находи выход. Каждый следующий район — новый маршрут и более сложные прыжки.', 'Начать игру');
      this.render();
    }
  }
  loadLevel() {
    Object.assign(this,generateLevel(this.level,this.seed));
    this.score=0; this.player.reset();
    this.player.y=490-this.player.h; this.player.grounded=true;
    this.input.clear(); this.lastTime=null; this.updateStats();
  }
  start() {
    if(this.state==='playing')return;
    if(this.state==='cleared'){this.level++;this.loadLevel();}
    else if(this.state==='lost')this.loadLevel();
    this.state='playing'; this.input.active=true; this.input.clear(); this.lastTime=null;
    this.message.classList.add('hidden');this.hud.classList.add('visible');
    this.pauseButton.disabled=false;this.pauseButton.innerHTML='Ⅱ <span>Пауза</span>';
    if(this.rafId===null)this.rafId=requestAnimationFrame(t=>this.frame(t));
  }
  pause() {
    if(this.state!=='playing')return;
    this.state='paused';this.input.active=false;this.input.clear();this.lastTime=null;
    this.pauseButton.innerHTML='▶ <span>Продолжить</span>';
    this.showMessage(`УРОВЕНЬ ${this.level} · ПАУЗА`,'Передышка','Продолжай маршрут, когда будешь готов.','Продолжить','Ⅱ');
  }
  togglePause(){if(this.state==='playing')this.pause();else if(this.state==='paused')this.start();}
  showMessage(kicker,title,text,button,icon='✦') {
    document.querySelector('#messageKicker').textContent=kicker;
    document.querySelector('#messageTitle').textContent=title;
    document.querySelector('#messageText').textContent=text;
    document.querySelector('#messageIcon').textContent=icon;
    this.startButton.textContent=button+' →';this.message.classList.remove('hidden');
  }
  frame(time) {
    this.rafId=null;
    if(this.state==='playing') {
      const dt=this.lastTime===null?0:Math.min(Math.max((time-this.lastTime)/1000,0),0.05);
      this.lastTime=time;
      // Small physics steps keep collisions reliable at slow frame rates.
      const steps=Math.ceil(dt*120);
      for(let i=0;i<steps && this.state==='playing';i++)this.update(dt/steps);
    }
    this.render();
    if(this.state==='playing' && this.rafId===null)this.rafId=requestAnimationFrame(t=>this.frame(t));
  }
  update(dt) {
    this.player.update(dt,this.input,this.platforms);
    for(const item of this.items) {
      if(!item.collected && overlaps(this.player,{x:item.x-item.r,y:item.y-item.r,w:item.r*2,h:item.r*2})) {
        item.collected=true;this.score++;this.updateStats();
      }
    }
    if(this.hazards.some(h=>overlaps(this.player,h)) || this.player.y>H+30){this.finishLevel(false);return;}
    if(overlaps(this.player,this.finish)) {
      if(this.score===this.items.length)this.finishLevel(true);
      else this.hud.textContent=`ВЫХОД ЗАКРЫТ · СОБЕРИ ПИСЬМА: ${this.score} / 3`;
    } else this.hud.textContent=`УРОВЕНЬ ${this.level} · ${this.difficultyName()} · ОПАСНОСТИ: ${this.hazards.length-1}`;
  }
  difficultyName(){return this.level<4?'ЛЁГКИЙ':this.level<8?'СРЕДНИЙ':this.level<15?'СЛОЖНЫЙ':'ЭКСПЕРТ';}
  finishLevel(won) {
    this.state=won?'cleared':'lost';this.input.active=false;this.input.clear();this.lastTime=null;
    this.pauseButton.disabled=true;this.hud.classList.remove('visible');
    if(won) {
      this.delivered+=this.score;
      if(this.level>this.best){this.best=this.level;this.saveBest();}
      this.showMessage(`УРОВЕНЬ ${this.level} ПРОЙДЕН`,'Район доставлен!',
        `Всего доставлено: ${this.delivered}. Дальше — уровень ${this.level+1}: новый маршрут и новые прыжки.`,
        'Следующий уровень','✓');
    } else this.showMessage(`УРОВЕНЬ ${this.level} · ${this.score} / 3 ПИСЕМ`,'Ещё одна попытка?',
      'Повтори этот же маршрут. Пройденные уровни и доставленные письма сохранятся в текущей игре.',
      'Повторить уровень','↻');
    this.updateStats();
  }
  updateStats() {
    document.querySelector('#score').textContent=`${this.score} / 3`;
    document.querySelector('#best').textContent=String(this.best);
    document.querySelector('#level').textContent=String(this.level);
    document.querySelector('#progressText').textContent=`Доставлено за игру: ${this.delivered} · ${this.difficultyName()}`;
    this.hud.textContent=`УРОВЕНЬ ${this.level} · ${this.difficultyName()}`;
  }
  loadBest(){try{const n=Number(localStorage.getItem('night-delivery-best-level-v2'));return Number.isSafeInteger(n)&&n>=0?n:0;}catch{return 0;}}
  saveBest(){try{localStorage.setItem('night-delivery-best-level-v2',String(this.best));}catch{/* Storage can be disabled. */}}

  render() {
    const c = this.ctx; c.clearRect(0,0,W,H);
    const sky = c.createLinearGradient(0,0,0,H); sky.addColorStop(0,'#122039'); sky.addColorStop(.7,'#1a2c45'); sky.addColorStop(1,'#24334a'); c.fillStyle=sky; c.fillRect(0,0,W,H);
    this.drawSky(c); this.drawBuildings(c); this.drawPlatforms(c); this.drawHazard(c); this.drawFinish(c); this.drawItems(c); this.drawPlayer(c); this.drawForeground(c);
  }
  drawSky(c) {
    c.save();
    for (const s of this.stars) { c.globalAlpha=s.a; c.fillStyle='#d7e8ff'; c.beginPath(); c.arc(s.x,s.y,s.r,0,Math.PI*2); c.fill(); }
    c.globalAlpha=1; c.fillStyle='#d2e4f4'; c.beginPath(); c.arc(790,86,27,0,Math.PI*2); c.fill(); c.fillStyle='#122039'; c.beginPath(); c.arc(800,76,25,0,Math.PI*2); c.fill();
    c.fillStyle='#8fb3d8'; c.font='600 11px sans-serif'; c.fillText('РАЙОН '+this.level+' · НОЧНОЙ КАМПУС',32,74); c.restore();
  }
  drawBuildings(c) {
    c.save();
    const buildings=[[-20,190,170,300],[130,145,145,345],[300,205,135,285],[470,165,155,325],[665,205,145,285],[835,155,160,335]];
    for(let i=0;i<buildings.length;i++) { const [x,y,w,h]=buildings[i]; c.fillStyle=i%2?'#17273d':'#192a40'; c.fillRect(x,y,w,h); c.fillStyle='#263a53'; c.fillRect(x,y,w,5); for(let wx=x+17;wx<x+w-10;wx+=34) for(let wy=y+22;wy<y+h-20;wy+=31){ c.fillStyle=((Math.floor(wx+wy+i*9))%4===0)?'#f1c97d55':'#88b3d133'; c.fillRect(wx,wy,10,14); } }
    c.restore();
  }
  drawPlatforms(c) {
    for(const p of this.platforms) {
      if(p.ground){ c.fillStyle='#2c4159'; c.fillRect(p.x,p.y,p.w,p.h); c.fillStyle='#82a9c8'; c.fillRect(p.x,p.y,p.w,4); continue; }
      c.fillStyle='#243954'; c.fillRect(p.x,p.y,p.w,p.h); c.fillStyle='#82b7e7'; c.fillRect(p.x,p.y,p.w,4); c.fillStyle='#334c68'; c.fillRect(p.x+7,p.y+8,p.w-14,3);
      for(let x=p.x+12;x<p.x+p.w;x+=24){c.fillStyle='#aecce055';c.fillRect(x,p.y+14,8,2);}
    }
  }
  drawHazard(c) {
    for(const h of this.hazards) {
      c.save();c.fillStyle='#f58b72';
      const count=Math.max(1,Math.floor(h.w/16));
      for(let i=0;i<count;i++) {
        const x=h.x+i*h.w/count, width=h.w/count;
        c.beginPath();c.moveTo(x,h.y+h.h);c.lineTo(x+width/2,h.y);c.lineTo(x+width,h.y+h.h);c.fill();
      }
      c.restore();
    }
  }
  drawFinish(c) {
    const f=this.finish; c.save(); c.fillStyle='#233851'; c.fillRect(f.x,f.y,f.w,f.h); c.fillStyle='#8fc5fa'; c.fillRect(f.x+4,f.y+4,f.w-8,4); c.fillStyle='#d2e6fa'; c.font='700 8px sans-serif'; c.textAlign='center'; c.fillText('ФИНИШ',f.x+f.w/2,f.y-8);
    c.fillStyle='#111b2a'; c.fillRect(f.x+12,f.y+20,18,40); c.fillStyle='#f0ca7e'; c.beginPath();c.arc(f.x+25,f.y+40,2,0,7);c.fill();c.restore();
  }
  drawItems(c) {
    for(const item of this.items){if(item.collected)continue;c.save();c.translate(item.x,item.y);c.shadowColor='#b8ddff';c.shadowBlur=17;c.fillStyle='#d8ecff';c.beginPath();c.roundRect(-10,-12,20,24,4);c.fill();c.shadowBlur=0;c.fillStyle='#709ac2';c.fillRect(-6,-6,12,2);c.fillRect(-6,-1,9,2);c.fillRect(-6,4,7,2);c.fillStyle='#f2c77d';c.beginPath();c.arc(0,-14,4,0,Math.PI*2);c.fill();c.restore();}
  }
  drawPlayer(c) {
    const p=this.player;c.save();c.translate(p.x+p.w/2,p.y+p.h/2);c.scale(p.facing,1);
    c.fillStyle='#0b1422aa';c.beginPath();c.ellipse(0,23,16,4,0,0,Math.PI*2);c.fill();
    c.fillStyle='#f2c995';c.beginPath();c.arc(0,-12,10,0,Math.PI*2);c.fill();
    c.fillStyle='#243d5d';c.beginPath();c.roundRect(-11,-3,22,24,6);c.fill();
    c.fillStyle='#89bbeb';c.fillRect(-9,2,18,3);c.fillStyle='#d9eaff';c.fillRect(3,-14,3,3);
    c.fillStyle='#b77850';c.beginPath();c.arc(-2,-19,9,Math.PI,Math.PI*2);c.fill();c.fillRect(-11,-19,6,5);
    c.fillStyle='#dfb782';c.fillRect(-8,20,6,5);c.fillRect(3,20,6,5);
    c.fillStyle='#e6c171';c.fillRect(8,-1,7,9);c.fillStyle='#4a3826';c.fillRect(10,2,3,3);
    c.restore();
  }
  drawForeground(c) {
    c.save();c.globalAlpha=.35;c.fillStyle='#3d536b';for(let i=0;i<28;i++){const x=(i*47)%W,y=456+(i%4)*7;c.fillRect(x,y,18,2);}c.restore();
  }
}
