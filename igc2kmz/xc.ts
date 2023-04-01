
import { Solution, scoringRules as scoring } from 'igc-xc-score';
import { defaultconfig, I2KConfiguration } from './init';

export class XC {
  options: I2KConfiguration;
  solution: Solution;
  closingCircleRadius: number = 0;
  constructor(solution: Solution, options: I2KConfiguration) {
    this.options = options;
    this.solution = solution;
    try {
      let rules = (scoring[this.options.xc_score_rules] as any[]).find(sr => sr.name == solution.opt.scoring.name);
      if (rules && solution.scoreInfo && typeof rules.closingDistance === 'function') {
        this.closingCircleRadius = rules.closingDistance(solution.scoreInfo.distance, { 'scoring': rules }) * 1000;
      }
    } catch{}
  }
}
