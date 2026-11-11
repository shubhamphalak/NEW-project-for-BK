import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendMotorCover,motorQuoteReadiness} from '../src/motor-calculator.js';

const complete={currentYear:2026,vehicleType:'SUV',vehicleMake:'Toyota',vehicleModel:'RAV4',vehicleYear:2024,vehicleValue:120000,city:'Riyadh',usage:'personal',driverAge:35,claims:0,deductible:'balanced',coverChoice:'comprehensive',priority:'balanced'};

test('motor cover fit distinguishes broad, middle and third-party directions',()=>{
 assert.equal(recommendMotorCover(complete),'comprehensive');
 assert.equal(recommendMotorCover({...complete,vehicleType:'Sedan',vehicleYear:2018,vehicleValue:55000}),'smart');
 assert.equal(recommendMotorCover({...complete,vehicleYear:2013,vehicleValue:25000,priority:'cost'}),'basic');
});

test('motor quote readiness does not validate driver age',()=>{
 assert.equal(motorQuoteReadiness(complete),100);
 assert.equal(motorQuoteReadiness({...complete,driverAge:''}),100);
 assert(motorQuoteReadiness({...complete,vehicleMake:''})<100);
});
