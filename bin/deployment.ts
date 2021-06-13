#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {InfrastructureStack} from '../lib/infrastructure-stack';
import {PipelineStack} from '../lib/pipeline-stack';

const REPO_TOKEN = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN : '';
const STACK_NAME = 'test';

if (!REPO_TOKEN) {
    console.log("No Github Token present");
}

const app = new cdk.App();

const ENV_NAME = process.env.ENV_NAME ? process.env.ENV_NAME : '';

const infrastructure = new InfrastructureStack(app, `InfrastructureStack`, {
    envName: ENV_NAME,
});

new PipelineStack(app, 'PipelineStack', {
    githubToken: REPO_TOKEN,
    envName: ENV_NAME,
    lambdaCode: infrastructure.lambdaCode
});

app.synth();
