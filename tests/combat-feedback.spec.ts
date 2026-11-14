import {test,expect} from '@playwright/test';
import {CombatFeedback} from '../games/cinder-shift/src/combat-feedback';
import {defaults,validateSettings} from '../games/cinder-shift/src/session/save';
const options={intensity:.7,reduced:false};

test('accepted HP damage has one bounded pulse and a decaying camera impulse',()=>{
 const f=new CombatFeedback();expect(f.sample(0,options)).toEqual({damageAlpha:0,shieldAlpha:0,repairAlpha:0,offsetX:0,offsetY:0});
 f.trigger('damage',1000);const hit=f.sample(1000,options);expect(hit.damageAlpha).toBeGreaterThan(0);expect(Math.abs(hit.offsetX)).toBeLessThan(1);
 expect(f.sample(1080,options).damageAlpha).toBeLessThan(hit.damageAlpha);expect(f.sample(1200,options)).toEqual({damageAlpha:0,shieldAlpha:0,repairAlpha:0,offsetX:0,offsetY:0});
});
test('shield and repair never simulate HP loss; healing clears an existing damage impulse',()=>{
 const f=new CombatFeedback();f.trigger('shield',0);expect(f.sample(10,options)).toMatchObject({damageAlpha:0,repairAlpha:0,offsetX:0,offsetY:0});expect(f.sample(10,options).shieldAlpha).toBeGreaterThan(0);
 f.trigger('damage',300);f.trigger('repair',320);expect(f.sample(330,options)).toMatchObject({damageAlpha:0,shieldAlpha:0,offsetX:0,offsetY:0});expect(f.sample(330,options).repairAlpha).toBeGreaterThan(0);
});
test('reduced effects and zero intensity suppress motion and the fullscreen damage pulse',()=>{
 const f=new CombatFeedback();f.trigger('damage',0);f.trigger('heavy',0);
 expect(f.sample(10,{intensity:1,reduced:true})).toMatchObject({damageAlpha:0,offsetX:0,offsetY:0});
 expect(f.sample(10,{intensity:0,reduced:false})).toEqual({damageAlpha:0,shieldAlpha:0,repairAlpha:0,offsetX:0,offsetY:0});
 const strong=f.sample(10,{intensity:1,reduced:false});expect(Math.abs(strong.offsetX)).toBeLessThanOrEqual(2.25);expect(strong.damageAlpha).toBeLessThanOrEqual(.19);
});
test('pause, death and scene resets cannot replay an old impulse after resume',()=>{
 const f=new CombatFeedback();f.trigger('damage',100);f.trigger('shield',100);f.clear();
 for(const time of [100,200,10000])expect(f.sample(time,options)).toEqual({damageAlpha:0,shieldAlpha:0,repairAlpha:0,offsetX:0,offsetY:0});
});
test('old settings acquire the effect default and corrupt intensities cannot enter rendering',()=>{
 expect(validateSettings({locale:'en'},'ru').effectsIntensity).toBe(defaults('en').effectsIntensity);
 for(const v of [NaN,Infinity,-1,2,'0.5'])expect(validateSettings({effectsIntensity:v},'en').effectsIntensity).toBe(.7);
 expect(validateSettings({effectsIntensity:0},'en').effectsIntensity).toBe(0);expect(validateSettings({effectsIntensity:1},'en').effectsIntensity).toBe(1);
});
