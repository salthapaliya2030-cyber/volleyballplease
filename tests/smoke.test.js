import test from 'node:test';
import assert from 'node:assert/strict';
import {EventBus} from '../shared/events.js';
import {MatchEngine} from '../gameplay/match.js';
import {V} from '../gameplay/physics.js';
import {rollStyle,STYLES} from '../gameplay/profile.js';

const makeProfile=()=>({yen:1250,gems:25,style:'rookie',ownedStyles:['rookie'],settings:{botLevel:'normal'}});
test('starts a match and serves through the animation contact marker',()=>{
  const bus=new EventBus(),engine=new MatchEngine(bus,makeProfile());
  engine.start('A','Spiker');
  assert.equal(engine.state,'serving');
  assert.equal(engine.players.length,6);
  assert.equal(engine.requestAction('serve',V(0,0,-1)),true);
  for(let i=0;i<30;i++)engine.update(1/60,{move:V()});
  assert.equal(engine.state,'rally');
  assert.equal(engine.ball.active,true);
  assert.equal(engine.ball.lastTouchTeam,'A');
});
test('grounded contact is checked at the animation marker and increments the touch count',()=>{
  const bus=new EventBus(),engine=new MatchEngine(bus,makeProfile());
  engine.start('A','Spiker');
  engine.state='rally';
  engine.ball.reset(V(0,3.1,36));
  engine.ball.launch(V(0,0,0),'B',0);
  assert.equal(engine.requestAction('bump',V(0,0,-1)),true);
  for(let i=0;i<25;i++)engine.update(1/60,{move:V()});
  assert.equal(engine.ball.touches,1);
  assert.equal(engine.ball.lastTouchTeam,'A');
});
test('the style roller only returns configured styles',()=>{
  const valid=new Set(Object.keys(STYLES));
  for(let i=0;i<300;i++)assert.ok(valid.has(rollStyle()));
});
test('score calls enter the point state and update the board',()=>{
  const engine=new MatchEngine(new EventBus(),makeProfile());engine.start('A','Libero');
  engine.awardPoint('A','test');
  assert.equal(engine.score.A,1);assert.equal(engine.state,'point');
});
