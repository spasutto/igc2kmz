
//ZIP : https://stackoverflow.com/a/49836948
//typescript? https://code.visualstudio.com/docs/languages/typescript
//vs code task : https://code.visualstudio.com/docs/editor/tasks


import IGCParser = require("igc-parser")
import {IGCFile} from 'igc-parser'

export function sayHello(name: string, content: string): IGCFile {
    console.log(`Hello ${name}!`);
    let pouet = IGCParser.parse(content);
    return pouet;
}

