
import { parseXml } from '@rgrove/parse-xml';

export class XC {
  constructor(content: string) {
    let obj = parseXml(content); //'<kittens fuzzy="yes">I like fuzzy kittens.</kittens>');
    console.log(obj);
  }
}
