
import { sayHello } from "./igc2kmz";

export {sayHello}

declare global {
    interface Window { sayHello: any; }
}

window.sayHello = sayHello;
