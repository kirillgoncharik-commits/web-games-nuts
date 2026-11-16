import {test} from '@playwright/test';
import {campaignJourney} from './campaign-journey';
test.use({video:'on'});
test('a fresh profile completes five sectors, saves the real campaign record and reloads it once',async({page},info)=>{await campaignJourney(page,info);});
