#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {InfrastructureStack} from '../lib/infrastructure-stack';
import {PipelineStack} from '../lib/pipeline-stack';


const ENV_NAME = process.env.ENV_NAME ? process.env.ENV_NAME.toLowerCase() : '';

const app = new cdk.App();

if (!ENV_NAME) {
    console.error("No ENV_NAME present");
    throw new Error("No ENV_NAME present");
}

const infrastructure = new InfrastructureStack(app, `Infrastructure`, {
    envName: ENV_NAME,
});

new PipelineStack(app, `Pipeline`, {
    envName: ENV_NAME,
    lambdaCode: infrastructure.lambdaCode
});

app.synth();
