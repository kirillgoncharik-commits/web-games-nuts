import type {Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
export async function routeCapture(page:Page,file:string){
 const capture=await page.evaluate(()=>(window as any).__ENCOUNTER__.capture());
 await writeFile(file,Buffer.from(capture.png.split(',')[1],'base64'));await writeFile(file.replace('.png','.json'),JSON.stringify(capture.state,null,2));
}
